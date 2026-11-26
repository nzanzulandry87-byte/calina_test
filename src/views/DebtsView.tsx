import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  Coins,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  MessageCircle,
  Receipt,
  ArrowDownRight,
  TrendingUp,
  X,
  History,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney, convertCurrency } from '../logic/businessRules.ts';
import type { Debt, PaymentMethod, Currency } from '../types/index.ts';

export const DebtsView: React.FC = () => {
  const {
    debts,
    debtPayments,
    settings,
    displayCurrency,
    recordDebtPayment,
    setSelectedReceiptPayment,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'PARTIAL' | 'SETTLED' | 'HISTORY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Repayment Modal state (Multi-Devise Section 3)
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const [repayPaymentCurrency, setRepayPaymentCurrency] = useState<Currency>('USD');
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [customRepayRateInput, setCustomRepayRateInput] = useState<string>(
    (settings.exchangeRateRecoveries || settings.exchangeRateUsdToCdf || 2850).toString()
  );
  const [repayMethod, setRepayMethod] = useState<PaymentMethod>('ESPECES');
  const [repayRef, setRepayRef] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState<boolean>(false);

  // Active exchange rate for debt recovery
  const defaultRecoveryRate = settings.exchangeRateRecoveries || settings.exchangeRateUsdToCdf || 2850;
  const activeRecoveryRate = useMemo(() => {
    if (settings.allowCashierRateOverride) {
      const parsed = parseFloat(customRepayRateInput);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return defaultRecoveryRate;
  }, [settings.allowCashierRateOverride, customRepayRateInput, defaultRecoveryRate]);

  // WhatsApp Reminder Modal state
  const [selectedDebtForReminder, setSelectedDebtForReminder] = useState<Debt | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string>('');

  // Compute summary stats
  const totalOpenDebts = useMemo(() => {
    return debts
      .filter((d) => d.status !== 'REGLEE')
      .reduce((sum, d) => {
        const { amount } = convertCurrency(d.remainingAmount, d.currency, displayCurrency, settings.exchangeRateUsdToCdf);
        return sum + amount;
      }, 0);
  }, [debts, displayCurrency, settings]);

  const totalOverdueAmount = useMemo(() => {
    return debts
      .filter((d) => d.status === 'EN_RETARD')
      .reduce((sum, d) => {
        const { amount } = convertCurrency(d.remainingAmount, d.currency, displayCurrency, settings.exchangeRateUsdToCdf);
        return sum + amount;
      }, 0);
  }, [debts, displayCurrency, settings]);

  const totalRecoveredThisMonth = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return debtPayments
      .filter((p) => p.createdAt.startsWith(month))
      .reduce((sum, p) => {
        const { amount } = convertCurrency(p.amount, p.currency, displayCurrency, settings.exchangeRateUsdToCdf);
        return sum + amount;
      }, 0);
  }, [debtPayments, displayCurrency, settings]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const matchesSearch =
        d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customerPhone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeTab === 'OVERDUE') return d.status === 'EN_RETARD';
      if (activeTab === 'PARTIAL') return d.status === 'PARTIELLEMENT_REGLEE';
      if (activeTab === 'SETTLED') return d.status === 'REGLEE';
      if (activeTab === 'ALL') return d.status !== 'REGLEE';
      return true;
    });
  }, [debts, activeTab, searchQuery]);

  // Open Repayment Modal
  const openRepayModal = (debt: Debt) => {
    setSelectedDebtForPayment(debt);
    setRepayPaymentCurrency(debt.currency);
    setRepayAmount(debt.remainingAmount.toString());
    setCustomRepayRateInput(defaultRecoveryRate.toString());
    setRepayMethod('ESPECES');
    setRepayRef('');
    setRepayNotes('');
    setPaymentError('');
    setIsSubmittingRepayment(false);
  };

  // Change payment currency in recovery modal
  const handleRepayCurrencyChange = (newCurr: Currency) => {
    if (!selectedDebtForPayment) return;
    setRepayPaymentCurrency(newCurr);

    // Calculate full balance in the newly selected payment currency
    if (newCurr === selectedDebtForPayment.currency) {
      setRepayAmount(selectedDebtForPayment.remainingAmount.toString());
    } else if (selectedDebtForPayment.currency === 'USD' && newCurr === 'CDF') {
      const fullInCDF = Math.round(selectedDebtForPayment.remainingAmount * activeRecoveryRate);
      setRepayAmount(fullInCDF.toString());
    } else if (selectedDebtForPayment.currency === 'CDF' && newCurr === 'USD') {
      const fullInUSD = Number((selectedDebtForPayment.remainingAmount / activeRecoveryRate).toFixed(2));
      setRepayAmount(fullInUSD.toString());
    }
  };

  // Compute live equivalents for recovery modal
  const recoveryCalculations = useMemo(() => {
    if (!selectedDebtForPayment) {
      return {
        amountReceived: 0,
        amountDeducted: 0,
        remainingBalanceAfter: 0,
        isOverpaying: false,
      };
    }

    const amtReceived = parseFloat(repayAmount) || 0;
    let amtDeducted = 0;

    if (repayPaymentCurrency === selectedDebtForPayment.currency) {
      amtDeducted = amtReceived;
    } else if (selectedDebtForPayment.currency === 'USD' && repayPaymentCurrency === 'CDF') {
      amtDeducted = Number((amtReceived / activeRecoveryRate).toFixed(2));
    } else if (selectedDebtForPayment.currency === 'CDF' && repayPaymentCurrency === 'USD') {
      amtDeducted = Math.round(amtReceived * activeRecoveryRate);
    }

    const remainingBal = Math.max(0, Number((selectedDebtForPayment.remainingAmount - amtDeducted).toFixed(2)));
    const isOverpaying = amtDeducted > selectedDebtForPayment.remainingAmount + 0.001;

    return {
      amountReceived: amtReceived,
      amountDeducted: amtDeducted,
      remainingBalanceAfter: remainingBal,
      isOverpaying,
    };
  }, [selectedDebtForPayment, repayAmount, repayPaymentCurrency, activeRecoveryRate]);

  // Submit Repayment
  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment || isSubmittingRepayment) return;
    setPaymentError('');

    const amtReceived = parseFloat(repayAmount);
    if (isNaN(amtReceived) || amtReceived <= 0) {
      setPaymentError('Veuillez saisir un montant encaissé valide strictement supérieur à zéro.');
      return;
    }

    if (recoveryCalculations.isOverpaying) {
      setPaymentError(
        `Le remboursement équivalent (${formatMoney(recoveryCalculations.amountDeducted, selectedDebtForPayment.currency)}) dépasse le solde restant (${formatMoney(selectedDebtForPayment.remainingAmount, selectedDebtForPayment.currency)}).`
      );
      return;
    }

    setIsSubmittingRepayment(true);

    const res = recordDebtPayment({
      debtId: selectedDebtForPayment.id,
      amountToPay: recoveryCalculations.amountDeducted,
      paymentMethod: repayMethod,
      paymentCurrency: repayPaymentCurrency,
      amountReceived: amtReceived,
      appliedExchangeRate: activeRecoveryRate,
      reference: repayRef.trim() || undefined,
      notes: repayNotes.trim() || undefined,
    });

    if (!res.success) {
      setPaymentError(res.error || 'Erreur lors du recouvrement.');
      setIsSubmittingRepayment(false);
      return;
    }

    setIsSubmittingRepayment(false);
    setSelectedDebtForPayment(null);
  };

  // Open WhatsApp Reminder Modal
  const openReminderModal = (debt: Debt) => {
    setSelectedDebtForReminder(debt);
    const msg =
      `Bonjour ${debt.customerName},\n\n` +
      `Sauf erreur de notre part, votre compte auprès de la *${settings.companyName}* présente un solde de créance de *${formatMoney(debt.remainingAmount, debt.currency)}* relatif à la facture *${debt.saleNumber}* arrivée à échéance le *${debt.dueDate}*.\n\n` +
      `Nous vous prions de bien vouloir régulariser ce montant à notre caisse ou par paiement mobile (Airtel Money / M-Pesa / Orange Money).\n\n` +
      `Contact Caisse : ${settings.phone}\n` +
      `Merci pour votre bonne collaboration.`;
    setReminderMessage(msg);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Receivables */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Créances en cours</span>
            <CreditCard className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {formatMoney(totalOpenDebts, displayCurrency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {debts.filter((d) => d.status !== 'REGLEE').length} facture(s) non soldée(s)
          </p>
        </div>

        {/* Overdue Debts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Créances en retard</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {formatMoney(totalOverdueAmount, displayCurrency)}
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1">
            {debts.filter((d) => d.status === 'EN_RETARD').length} client(s) à relancer en priorité
          </p>
        </div>

        {/* Collections this month */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Recouvré ce mois</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatMoney(totalRecoveredThisMonth, displayCurrency)}
          </div>
          <p className="text-[11px] text-emerald-300/80 mt-1">
            {debtPayments.length} paiements de recouvrement enregistrés
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher client, vente ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              En cours ({debts.filter((d) => d.status !== 'REGLEE').length})
            </button>
            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'OVERDUE'
                  ? 'bg-rose-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              En retard ({debts.filter((d) => d.status === 'EN_RETARD').length})
            </button>
            <button
              onClick={() => setActiveTab('PARTIAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'PARTIAL'
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Partielles ({debts.filter((d) => d.status === 'PARTIELLEMENT_REGLEE').length})
            </button>
            <button
              onClick={() => setActiveTab('SETTLED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'SETTLED'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Réglées ({debts.filter((d) => d.status === 'REGLEE').length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'HISTORY'
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Historique des reçus ({debtPayments.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'HISTORY' ? (
        /* History of Debt Payments Receipts */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <span>Journal des Règlements de Créances</span>
          </h3>

          <div className="divide-y divide-slate-800">
            {debtPayments.map((p) => (
              <div
                key={p.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{p.customerName}</span>
                    <span className="font-mono text-[10px] text-blue-400 bg-blue-950 px-1.5 py-0.2 rounded">
                      {p.receiptNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Facture vente : {p.saleNumber} • Mode : {p.paymentMethod} • Encaissé par {p.userName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(p.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-emerald-400 text-sm">
                    +{formatMoney(p.amount, p.currency)}
                  </span>
                  <button
                    onClick={() => setSelectedReceiptPayment(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Voir reçu</span>
                  </button>
                </div>
              </div>
            ))}

            {debtPayments.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Aucun remboursement de créance n'a encore été enregistré.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Debts List Cards */
        <div className="space-y-3">
          {filteredDebts.map((debt) => {
            const isOverdue = debt.status === 'EN_RETARD';
            const isSettled = debt.status === 'REGLEE';

            return (
              <div
                key={debt.id}
                className={`p-4 rounded-2xl border transition shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSettled
                    ? 'bg-slate-900/60 border-slate-800 opacity-75'
                    : isOverdue
                    ? 'bg-rose-950/25 border-rose-800/80'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left: Customer & Debt Details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-sm">{debt.customerName}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSettled
                          ? 'bg-emerald-900 text-emerald-300'
                          : isOverdue
                          ? 'bg-rose-900 text-rose-200 animate-pulse'
                          : 'bg-amber-900 text-amber-200'
                      }`}
                    >
                      {isSettled
                        ? 'SOLDE RÉGLÉ'
                        : isOverdue
                        ? 'EN RETARD'
                        : debt.status === 'PARTIELLEMENT_REGLEE'
                        ? 'PARTIELLEMENT RÉGLÉE'
                        : 'EN COURS'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Vente {debt.saleNumber}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                    <span>Tél: {debt.customerPhone || 'Non renseigné'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Échéance : </span>
                      <strong className={isOverdue ? 'text-rose-400' : 'text-slate-200'}>
                        {debt.dueDate}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Middle: Financial balances */}
                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-800/50 p-2.5 rounded-xl border border-slate-800 flex-shrink-0">
                  <div>
                    <div className="text-slate-400 text-[10px]">Initial</div>
                    <div className="font-bold text-slate-300">
                      {formatMoney(debt.initialAmount, debt.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Remboursé</div>
                    <div className="font-bold text-emerald-400">
                      {formatMoney(debt.paidAmount, debt.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Reste dû</div>
                    <div className={`font-black ${isSettled ? 'text-slate-400' : 'text-rose-400'}`}>
                      {formatMoney(debt.remainingAmount, debt.currency)}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isSettled && (
                    <button
                      onClick={() => openRepayModal(debt)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Encaisser</span>
                    </button>
                  )}

                  {!isSettled && debt.customerPhone && (
                    <button
                      onClick={() => openReminderModal(debt)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
                      title="Relancer le client sur WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}

                  {debt.customerPhone && (
                    <a
                      href={`tel:${debt.customerPhone}`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition"
                      title="Appeler le client"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {filteredDebts.length === 0 && (
            <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              Aucune créance ne correspond au filtre sélectionné.
            </div>
          )}
        </div>
      )}

      {/* Recouvrement (Repayment) Modal Multidevise */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Encaisser un Remboursement de Créance</h3>
              </div>
              <button
                onClick={() => setSelectedDebtForPayment(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Fiche d'identification de la créance (Exigence Section 3 : Points 1 à 6) */}
            <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700 text-xs space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-700">
                <span className="text-slate-400 font-medium">1. Nom du client débiteur :</span>
                <span className="font-bold text-white text-sm">{selectedDebtForPayment.customerName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">2. Réf. vente d'origine :</span>
                <span className="font-mono text-slate-200 font-semibold">{selectedDebtForPayment.saleNumber}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">3. Montant initial de la créance :</span>
                <span className="font-mono text-slate-300">
                  {formatMoney(selectedDebtForPayment.initialAmount, selectedDebtForPayment.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">4. Montant déjà remboursé :</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {formatMoney(selectedDebtForPayment.paidAmount, selectedDebtForPayment.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-700 font-semibold">
                <span className="text-slate-400">5. Solde restant dû :</span>
                <span className="font-mono text-rose-400 font-black text-sm">
                  {formatMoney(selectedDebtForPayment.remainingAmount, selectedDebtForPayment.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                <span>6. Devise de référence de la créance :</span>
                <span className="font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono">
                  {selectedDebtForPayment.currency} ({selectedDebtForPayment.currency === 'USD' ? 'Dollar' : 'Franc Congolais'})
                </span>
              </div>
            </div>

            <form onSubmit={handleRepaymentSubmit} className="space-y-3.5">
              {/* Choix de la Devise de Paiement Reçue (Point 7) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>7. Devise reçue en caisse (USD ou CDF) <span className="text-rose-400 font-black">*</span> :</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRepayCurrencyChange('USD')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      repayPaymentCurrency === 'USD'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Paiement en USD ($)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRepayCurrencyChange('CDF')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      repayPaymentCurrency === 'CDF'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <span className="font-mono font-black text-xs">FC</span>
                    <span>Paiement en CDF (FC)</span>
                  </button>
                </div>
              </div>

              {/* Taux de Change Applicable si conversion (Point 8) */}
              {repayPaymentCurrency !== selectedDebtForPayment.currency && (
                <div className="p-3 bg-blue-950/40 border border-blue-800/80 rounded-xl text-xs space-y-1.5 text-blue-200">
                  <div className="flex items-center justify-between font-bold">
                    <span>8. Taux de change applicable au recouvrement :</span>
                    <span className="font-mono text-white text-sm">
                      1 USD = {activeRecoveryRate.toLocaleString('fr-FR')} CDF
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-300/80">
                    {selectedDebtForPayment.currency === 'USD' && repayPaymentCurrency === 'CDF'
                      ? `Le client règle en Francs Congolais sa créance libellée en USD. Chaque tranche de ${activeRecoveryRate} FC reçus déduit $1.00 du solde.`
                      : `Le client règle en Dollars sa créance libellée en CDF.`}
                  </p>

                  {settings.allowCashierRateOverride && (
                    <div className="pt-2 border-t border-blue-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-300">Taux spécifique appliqué (1 USD = X CDF) :</span>
                      <input
                        type="number"
                        value={customRepayRateInput}
                        onChange={(e) => setCustomRepayRateInput(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Saisie du Montant Reçu */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Montant effectivement reçu en caisse ({repayPaymentCurrency}) :
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={repayPaymentCurrency === 'CDF' ? '500' : '0.1'}
                    min="0.1"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (repayPaymentCurrency === selectedDebtForPayment.currency) {
                        setRepayAmount(selectedDebtForPayment.remainingAmount.toString());
                      } else if (selectedDebtForPayment.currency === 'USD' && repayPaymentCurrency === 'CDF') {
                        setRepayAmount(Math.round(selectedDebtForPayment.remainingAmount * activeRecoveryRate).toString());
                      } else if (selectedDebtForPayment.currency === 'CDF' && repayPaymentCurrency === 'USD') {
                        setRepayAmount((selectedDebtForPayment.remainingAmount / activeRecoveryRate).toFixed(2));
                      }
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px] text-emerald-300 font-bold"
                  >
                    Régler tout le solde
                  </button>
                </div>
              </div>

              {/* Récapitulatif dynamique des soldes (Point 9) */}
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Montant reçu en caisse :</span>
                  <span className="font-mono font-bold text-white">
                    {formatMoney(recoveryCalculations.amountReceived, repayPaymentCurrency)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-400 font-semibold">
                  <span>Équivalent déduit de la créance :</span>
                  <span className="font-mono">
                    -{formatMoney(recoveryCalculations.amountDeducted, selectedDebtForPayment.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1.5 border-t border-slate-700 font-bold">
                  <span className="text-slate-300">9. Solde restant après encaissement :</span>
                  <span className="font-mono text-sm text-blue-400">
                    {formatMoney(recoveryCalculations.remainingBalanceAfter, selectedDebtForPayment.currency)}
                    {selectedDebtForPayment.currency !== repayPaymentCurrency && (
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        (~{formatMoney(
                          repayPaymentCurrency === 'CDF'
                            ? recoveryCalculations.remainingBalanceAfter * activeRecoveryRate
                            : recoveryCalculations.remainingBalanceAfter / activeRecoveryRate,
                          repayPaymentCurrency
                        )})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mode de règlement :
                </label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ESPECES">Espèces (Billets {repayPaymentCurrency})</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="M_PESA">M-Pesa</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="BANQUE">Virement Bancaire (Rawbank / EquityBCDC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Référence transaction / bordereau (facultatif) :
                </label>
                <input
                  type="text"
                  placeholder="Ex: MPESA-TXN-9842 ou BORD-00124"
                  value={repayRef}
                  onChange={(e) => setRepayRef(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDebtForPayment(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRepayment || recoveryCalculations.isOverpaying || recoveryCalculations.amountReceived <= 0}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 ${
                    isSubmittingRepayment || recoveryCalculations.isOverpaying || recoveryCalculations.amountReceived <= 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingRepayment ? 'Enregistrement...' : 'Valider l\'Encaissement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Modal */}
      {selectedDebtForReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Relance Créance WhatsApp</h3>
              </div>
              <button
                onClick={() => setSelectedDebtForReminder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Message pré-rédigé pour <strong>{selectedDebtForReminder.customerName}</strong> (Tél : {selectedDebtForReminder.customerPhone}). Vous pouvez modifier le texte avant l'envoi :
            </p>

            <textarea
              rows={8}
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs font-sans focus:outline-none focus:border-emerald-500 leading-relaxed"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDebtForReminder(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Fermer
              </button>

              <a
                href={`https://wa.me/${selectedDebtForReminder.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reminderMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition text-center flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Ouvrir WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
