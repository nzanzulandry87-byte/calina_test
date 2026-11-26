import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  DollarSign,
  Calculator,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Layers,
  Lock,
  Shield,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney, convertCurrency } from '../logic/businessRules.ts';
import type { PaymentMethod, Currency, Expense } from '../types/index.ts';

export const CashView: React.FC = () => {
  const {
    cashMovements,
    expenses,
    settings,
    displayCurrency,
    currentUser,
    addExpense,
    addManualCashMovement,
  } = useApp();

  // If user is not admin, hide the entire cash & expenses module
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4 my-12 text-white shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">Module Caisse & Dépenses Masqué</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Conformément aux règles de sécurité, les informations de caisse, le journal des mouvements et les dépenses d'exploitation sont strictement confidentiels et masqués pour les autres utilisateurs.
        </p>
        <div className="text-[11px] text-amber-400/90 bg-amber-950/40 border border-amber-800/40 p-3 rounded-xl">
          Seul le Propriétaire / Administrateur peut consulter et gérer ce module.
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'MOVEMENTS' | 'EXPENSES' | 'RECONCILIATION'>('MOVEMENTS');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Modal: New Expense
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<Expense['category']>('TRANSPORT');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('20');
  const [expCurrency, setExpCurrency] = useState<Currency>('USD');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('ESPECES');
  const [expError, setExpError] = useState('');

  // Modal: Cash In / Out
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDirection, setManualDirection] = useState<'IN' | 'OUT'>('IN');
  const [manualAmount, setManualAmount] = useState('50');
  const [manualReason, setManualReason] = useState('Apport de monnaie / fond de caisse');
  const [manualMethod, setManualMethod] = useState<PaymentMethod>('ESPECES');

  // Multi-Currency Breakdown (Exigence Section 5)
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | 'USD' | 'CDF'>('ALL');

  // Reconciliation state (Separate physical count for USD & CDF)
  const [countedCashUSD, setCountedCashUSD] = useState('');
  const [countedCashCDF, setCountedCashCDF] = useState('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  // Detailed Cash metrics per currency
  const cashMetrics = useMemo(() => {
    let encaissementsUSD = 0;
    let encaissementsCDF = 0;
    let totalInflowsUSD = 0;
    let totalOutflowsUSD = 0;
    let totalInflowsCDF = 0;
    let totalOutflowsCDF = 0;
    let especesUSDIn = 0;
    let especesUSDOut = 0;
    let especesCDFIn = 0;
    let especesCDFOut = 0;

    for (const m of cashMovements) {
      if (m.currency === 'USD') {
        if (m.direction === 'IN') {
          totalInflowsUSD += m.amount;
          encaissementsUSD += m.amount;
          if (m.paymentMethod === 'ESPECES') especesUSDIn += m.amount;
        } else {
          totalOutflowsUSD += m.amount;
          if (m.paymentMethod === 'ESPECES') especesUSDOut += m.amount;
        }
      } else if (m.currency === 'CDF') {
        if (m.direction === 'IN') {
          totalInflowsCDF += m.amount;
          encaissementsCDF += m.amount;
          if (m.paymentMethod === 'ESPECES') especesCDFIn += m.amount;
        } else {
          totalOutflowsCDF += m.amount;
          if (m.paymentMethod === 'ESPECES') especesCDFOut += m.amount;
        }
      }
    }

    const netEspecesUSD = Number((especesUSDIn - especesUSDOut).toFixed(2));
    const netEspecesCDF = Math.round(especesCDFIn - especesCDFOut);
    const netTotalUSD = Number((totalInflowsUSD - totalOutflowsUSD).toFixed(2));
    const netTotalCDF = Math.round(totalInflowsCDF - totalOutflowsCDF);

    // Consolidated in display currency
    const consolidatedUSD = netTotalUSD + (netTotalCDF / (settings.exchangeRateUsdToCdf || 2850));
    const consolidatedCDF = (netTotalUSD * (settings.exchangeRateUsdToCdf || 2850)) + netTotalCDF;

    return {
      encaissementsUSD: Number(encaissementsUSD.toFixed(2)),
      encaissementsCDF: Math.round(encaissementsCDF),
      totalEspecesUSD: netEspecesUSD,
      totalEspecesCDF: netEspecesCDF,
      netTotalUSD,
      netTotalCDF,
      consolidatedUSD: Number(consolidatedUSD.toFixed(2)),
      consolidatedCDF: Math.round(consolidatedCDF),
    };
  }, [cashMovements, settings.exchangeRateUsdToCdf]);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');

    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      setExpError('Veuillez saisir un montant de dépense valide.');
      return;
    }

    if (!expDescription.trim()) {
      setExpError('La description du motif de la dépense est obligatoire.');
      return;
    }

    addExpense({
      category: expCategory,
      description: expDescription.trim(),
      amount: amt,
      currency: expCurrency,
      paymentMethod: expMethod,
    });

    setShowExpenseModal(false);
    setExpDescription('');
    setExpAmount('20');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) return;

    addManualCashMovement({
      direction: manualDirection,
      amount: amt,
      currency: 'USD',
      paymentMethod: manualMethod,
      description: manualReason.trim() || (manualDirection === 'IN' ? 'Apport caisse' : 'Retrait caisse'),
    });

    setShowManualModal(false);
  };

  const filteredMovements = useMemo(() => {
    return cashMovements.filter((m) => {
      const matchDir =
        filterDirection === 'ALL' ||
        (filterDirection === 'IN' && m.direction === 'IN') ||
        (filterDirection === 'OUT' && m.direction === 'OUT');
      const matchCurr = filterCurrency === 'ALL' || m.currency === filterCurrency;
      return matchDir && matchCurr;
    });
  }, [cashMovements, filterDirection, filterCurrency]);

  // Physical Count variance sans mélanger les devises (Exigence Section 5)
  const countedNumUSD = parseFloat(countedCashUSD) || 0;
  const countedNumCDF = parseFloat(countedCashCDF) || 0;

  const varianceUSD = Number((countedNumUSD - cashMetrics.totalEspecesUSD).toFixed(2));
  const varianceCDF = Math.round(countedNumCDF - cashMetrics.totalEspecesCDF);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner: Multi-Currency Cash Balance Cards (Exigence Section 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Encaissements USD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Encaissements USD</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatMoney(cashMetrics.encaissementsUSD, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Ventes comptant, acomptes et créances reçus en $
          </p>
        </div>

        {/* Encaissements CDF */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Encaissements CDF</span>
            <span className="text-xs font-black text-blue-400 font-mono">FC</span>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {formatMoney(cashMetrics.encaissementsCDF, 'CDF')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Paiements et recouvrements reçus en Francs
          </p>
        </div>

        {/* Total Espèces USD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Espèces USD ($)</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatMoney(cashMetrics.totalEspecesUSD, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Billets physiques USD dans le compartiment $
          </p>
        </div>

        {/* Total Espèces CDF */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Espèces CDF (FC)</span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatMoney(cashMetrics.totalEspecesCDF, 'CDF')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Billets physiques CDF dans le tiroir Francs
          </p>
        </div>
      </div>

      {/* Control Bar: Tabs & Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Journal de Caisse ({cashMovements.length})
            </button>
            <button
              onClick={() => setActiveTab('EXPENSES')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'EXPENSES'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Dépenses Magasin ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('RECONCILIATION')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'RECONCILIATION'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Clôture & Rapprochement
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Dépense</span>
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>Apport / Retrait</span>
            </button>
          </div>
        </div>

        {activeTab === 'MOVEMENTS' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800 justify-between items-start sm:items-center">
            {/* Direction Filter */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterDirection('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterDirection === 'ALL'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Tous flux
              </button>
              <button
                onClick={() => setFilterDirection('IN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterDirection === 'IN'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Entrées (Encaissements)
              </button>
              <button
                onClick={() => setFilterDirection('OUT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterDirection === 'OUT'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Sorties (Dépenses)
              </button>
            </div>

            {/* Currency Filter (Exigence Section 5) */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Devise :</span>
              <button
                onClick={() => setFilterCurrency('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  filterCurrency === 'ALL'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                USD & CDF
              </button>
              <button
                onClick={() => setFilterCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  filterCurrency === 'USD'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setFilterCurrency('CDF')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  filterCurrency === 'CDF'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-blue-300'
                }`}
              >
                CDF (FC)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'MOVEMENTS' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Traçabilité Intégrale des Mouvements de Caisse</span>
            </h3>
            <span className="text-xs text-slate-400">
              Chaque entrée/sortie est obligatoirement reliée à son origine
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-[65vh] overflow-y-auto pr-1">
            {filteredMovements.map((m) => {
              const isIn = m.direction === 'IN';
              return (
                <div
                  key={m.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className={isIn ? 'text-emerald-400' : 'text-rose-400'}>
                        {isIn ? '▲ ENTRÉE' : '▼ SORTIE'}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">{m.description}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Réf Source : <strong className="font-mono text-slate-300">{m.sourceReference}</strong></span>
                      <span>•</span>
                      <span>Mode : {m.paymentMethod}</span>
                      <span>•</span>
                      <span>Par {m.userName}</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-base font-black font-mono ${
                        isIn ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIn ? '+' : '-'}{formatMoney(m.amount, m.currency)}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMovements.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun mouvement de caisse enregistré.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'EXPENSES' ? (
        /* Expenses View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white">Registre des Dépenses d'Exploitation</h3>
            <span className="text-xs text-slate-400">
              Déduites pour le calcul du bénéfice net
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      {exp.category}
                    </span>
                    <span>{exp.description}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mode : {exp.paymentMethod} • Enregistré par {exp.userName} • {new Date(exp.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>

                <div className="font-black text-rose-400 text-sm font-mono">
                  -{formatMoney(exp.amount, exp.currency)}
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucune dépense enregistrée.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Daily Cash Reconciliation */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Calculator className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-white">Rapprochement de Caisse & Comptage Réel</h3>
              <p className="text-xs text-slate-400">
                Comparez le solde physique dans le tiroir-caisse avec le solde théorique du système
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compartiment USD ($) */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Compartiment USD ($ - Billets)</span>
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Devise $
                </span>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Solde Théorique Espèces USD (Logiciel) :</div>
                <div className="text-2xl font-black text-white font-mono">
                  ${cashMetrics.totalEspecesUSD.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  Billets USD Physiques Comptés dans le Tiroir :
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 450"
                    value={countedCashUSD}
                    onChange={(e) => setCountedCashUSD(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Écart USD */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  Math.abs(varianceUSD) < 0.01
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : varianceUSD < 0
                    ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                    : 'bg-amber-950/50 border-amber-800 text-amber-300'
                }`}
              >
                <div>
                  <div className="font-bold">
                    {Math.abs(varianceUSD) < 0.01
                      ? 'Caisse USD Équilibrée'
                      : varianceUSD < 0
                      ? 'Déficit Billets USD'
                      : 'Excédent Billets USD'}
                  </div>
                  <div className="text-[10px] text-slate-400">Compté - Théorique USD</div>
                </div>
                <div className="font-mono font-black text-base">
                  {varianceUSD > 0 ? '+' : ''}${varianceUSD.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Compartiment CDF (FC) */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <span className="font-mono font-black text-xs">FC</span>
                  <span>Compartiment Francs Congolais (CDF)</span>
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  Devise FC
                </span>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">Solde Théorique Espèces CDF (Logiciel) :</div>
                <div className="text-2xl font-black text-white font-mono">
                  {cashMetrics.totalEspecesCDF.toLocaleString('fr-FR')} FC
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  Billets CDF Physiques Comptés dans le Tiroir :
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="Ex: 142500"
                    value={countedCashCDF}
                    onChange={(e) => setCountedCashCDF(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-bold text-xs">FC</span>
                </div>
              </div>

              {/* Écart CDF */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  Math.abs(varianceCDF) === 0
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : varianceCDF < 0
                    ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                    : 'bg-amber-950/50 border-amber-800 text-amber-300'
                }`}
              >
                <div>
                  <div className="font-bold">
                    {Math.abs(varianceCDF) === 0
                      ? 'Caisse CDF Équilibrée'
                      : varianceCDF < 0
                      ? 'Déficit Billets CDF'
                      : 'Excédent Billets CDF'}
                  </div>
                  <div className="text-[10px] text-slate-400">Compté - Théorique CDF</div>
                </div>
                <div className="font-mono font-black text-base">
                  {varianceCDF > 0 ? '+' : ''}{varianceCDF.toLocaleString('fr-FR')} FC
                </div>
              </div>
            </div>
          </div>

          {/* Synthèse Clôture sans mélange des devises */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Règle de Clôture Congolaise : Étanchéité stricte des devises</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Convention : 1 USD = {(settings.exchangeRateUsdToCdf || 2850).toLocaleString('fr-FR')} CDF
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Les billets en Dollars et en Francs Congolais sont contrôlés de manière indépendante. Aucun excédent en monnaie locale ne peut masquer un déficit en devises étrangères.
            </p>
          </div>
        </div>
      )}

      {/* Modal: New Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Enregistrer une Dépense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {expError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {expError}
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catégorie de Dépense *
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as Expense['category'])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="LOYER">Loyer Magasin & Dépôt</option>
                  <option value="TRANSPORT">Transport & Déchargement Camions</option>
                  <option value="SALAIRES">Salaires & Primes Équipe</option>
                  <option value="ELECTRICITE">Électricité & Énergie (SNEL / Carburant Groupe)</option>
                  <option value="TAXES">Taxes & Impôts Municipaux</option>
                  <option value="ENTRETIEN">Entretien & Réparations</option>
                  <option value="AUTRES">Autres Dépenses Diverses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description du Motif *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Facture SNEL électricité octobre 2026"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Montant *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Devise *
                  </label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Moyen de Paiement *
                </label>
                <select
                  value={expMethod}
                  onChange={(e) => setExpMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                >
                  <option value="ESPECES">Espèces (Caisse)</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="M_PESA">M-Pesa</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="BANQUE">Virement Bancaire</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition"
                >
                  Enregistrer la Sortie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Cash In/Out */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Apport ou Retrait Manuel de Caisse</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManualDirection('IN')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    manualDirection === 'IN'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  + Apport de Caisse
                </button>
                <button
                  type="button"
                  onClick={() => setManualDirection('OUT')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    manualDirection === 'OUT'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  - Retrait de Caisse
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Montant ($ USD) :</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motif :</label>
                <input
                  type="text"
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow"
                >
                  Valider l'Opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
