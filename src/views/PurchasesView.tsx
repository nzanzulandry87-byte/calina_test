import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  Package,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  X,
  Phone,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney, convertCurrency } from '../logic/businessRules.ts';
import type { Supplier, Purchase, PaymentMethod, Currency } from '../types/index.ts';

export const PurchasesView: React.FC = () => {
  const {
    suppliers,
    purchases,
    products,
    settings,
    displayCurrency,
    currentUser,
    addSupplier,
    recordPurchase,
    recordSupplierPayment,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'SUPPLIERS'>('PURCHASES');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: New Supplier
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('+243 ');
  const [supAddress, setSupAddress] = useState('');

  // Modal: New Purchase / Restocking
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${Date.now().toString().slice(-5)}`);
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; quantity: number; unitCost: number }>
  >([]);
  const [paidAmountInput, setPaidAmountInput] = useState('0');
  const [purchaseError, setPurchaseError] = useState('');

  // Modal: Pay Supplier Debt
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [paySupplierAmount, setPaySupplierAmount] = useState('');
  const [paySupplierMethod, setPaySupplierMethod] = useState<PaymentMethod>('ESPECES');

  // Supplier Debts Total (Ce que Calina doit aux fournisseurs)
  const totalSupplierDebts = useMemo(() => {
    return suppliers.reduce((sum, s) => {
      const { amount } = convertCurrency(s.currentDebt, s.currency, displayCurrency, settings.exchangeRateUsdToCdf);
      return sum + amount;
    }, 0);
  }, [suppliers, displayCurrency, settings]);

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    addSupplier({
      name: supName.trim(),
      contactPerson: supContact.trim() || undefined,
      phone: supPhone.trim(),
      address: supAddress.trim() || undefined,
      currency: 'USD',
    });

    setShowSupplierModal(false);
    setSupName('');
    setSupContact('');
    setSupPhone('+243 ');
    setSupAddress('');
  };

  const addItemToPurchase = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (purchaseItems.some((it) => it.productId === productId)) return;

    setPurchaseItems((prev) => [
      ...prev,
      { productId, quantity: 10, unitCost: prod.purchasePrice },
    ]);
  };

  const removePurchaseItem = (productId: string) => {
    setPurchaseItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const updatePurchaseItem = (productId: string, field: 'quantity' | 'unitCost', val: number) => {
    setPurchaseItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, [field]: val } : it))
    );
  };

  const purchaseTotal = useMemo(() => {
    return purchaseItems.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
  }, [purchaseItems]);

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError('');

    if (!selectedSupplierId) {
      setPurchaseError('Veuillez sélectionner un fournisseur.');
      return;
    }

    if (purchaseItems.length === 0) {
      setPurchaseError('Veuillez ajouter au moins un produit à réapprovisionner.');
      return;
    }

    const paidAmt = parseFloat(paidAmountInput) || 0;
    if (paidAmt < 0 || paidAmt > purchaseTotal) {
      setPurchaseError(`Le montant payé doit être compris entre 0 et le montant total (${purchaseTotal}$).`);
      return;
    }

    const paymentStatus =
      paidAmt >= purchaseTotal ? 'PAYE' : paidAmt > 0 ? 'PARTIEL' : 'NON_PAYE';

    recordPurchase({
      supplierId: selectedSupplierId,
      invoiceNumber: invoiceNumber.trim() || `FAC-${Date.now().toString().slice(-4)}`,
      items: purchaseItems,
      totalAmount: purchaseTotal,
      paidAmount: paidAmt,
      paymentStatus,
      currency: 'USD',
    });

    setShowPurchaseModal(false);
    setPurchaseItems([]);
    setPaidAmountInput('0');
  };

  const handlePaySupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment) return;
    const amt = parseFloat(paySupplierAmount);
    if (isNaN(amt) || amt <= 0 || amt > selectedSupplierForPayment.currentDebt) {
      return;
    }

    recordSupplierPayment(selectedSupplierForPayment.id, amt, paySupplierMethod);
    setSelectedSupplierForPayment(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner: Supplier Debts vs Store Purchases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Supplier Debts (Ce que Calina doit) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Dettes Fournisseurs (Dettes Calina)
            </span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {formatMoney(totalSupplierDebts, displayCurrency)}
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1">
            Strictement séparé des créances clients pour éviter toute confusion
          </p>
        </div>

        {/* Total Purchases Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Approvisionnements
            </span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {purchases.length} commande(s)
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Chaque achat augmente le stock réel et crée des mouvements audités
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
              activeTab === 'PURCHASES'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Factures d'Achats ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
              activeTab === 'SUPPLIERS'
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Répertoire Fournisseurs ({suppliers.length})
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setSelectedSupplierId(suppliers[0]?.id || '');
                setInvoiceNumber(`FAC-${Date.now().toString().slice(-5)}`);
                setPurchaseItems([]);
                setPaidAmountInput('0');
                setPurchaseError('');
                setShowPurchaseModal(true);
              }}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Réapprovisionner Stock</span>
            </button>
          )}

          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Fournisseur</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'PURCHASES' ? (
        <div className="space-y-3">
          {purchases.map((pur) => (
            <div
              key={pur.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{pur.supplierName}</span>
                  <span className="font-mono text-[10px] text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
                    Facture #{pur.invoiceNumber}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      pur.paymentStatus === 'PAYE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : pur.paymentStatus === 'PARTIEL'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {pur.paymentStatus === 'PAYE'
                      ? 'RÉGLÉE'
                      : pur.paymentStatus === 'PARTIEL'
                      ? 'ACOMPTE PAYÉ'
                      : 'NON PAYÉE'}
                  </span>
                </div>

                <div className="text-slate-400 mt-1">
                  Articles reçus :{' '}
                  {pur.items.map((it) => `${it.productName} (${it.quantity} ${it.unit})`).join(', ')}
                </div>

                <div className="text-[10px] text-slate-500 mt-0.5">
                  Par {pur.userName} • {new Date(pur.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>

              <div className="text-right flex-shrink-0 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                <div className="font-black text-white text-sm">
                  Total : {formatMoney(pur.totalAmount, pur.currency)}
                </div>
                <div className="text-[11px] text-emerald-400">
                  Payé : {formatMoney(pur.paidAmount, pur.currency)}
                </div>
                {pur.remainingAmount > 0 && (
                  <div className="text-[11px] font-bold text-amber-400">
                    Dette Calina : {formatMoney(pur.remainingAmount, pur.currency)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {purchases.length === 0 && (
            <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              Aucun bon de commande d'achat fournisseur n'a encore été enregistré.
            </div>
          )}
        </div>
      ) : (
        /* Suppliers List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => {
            const hasDebt = s.currentDebt > 0;
            return (
              <div
                key={s.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between space-y-3"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{s.name}</h4>
                  {s.contactPerson && (
                    <div className="text-xs text-slate-300 mt-0.5">Contact : {s.contactPerson}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{s.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60 text-xs flex justify-between items-center">
                    <span className="text-slate-400">Ce que Calina lui doit :</span>
                    <span className={`font-black ${hasDebt ? 'text-amber-400 text-sm' : 'text-slate-400'}`}>
                      {formatMoney(s.currentDebt, s.currency)}
                    </span>
                  </div>

                  {hasDebt && currentUser?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setSelectedSupplierForPayment(s);
                        setPaySupplierAmount(s.currentDebt.toString());
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Régler la dette fournisseur
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Supplier */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Ajouter un Fournisseur</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom commercial du Fournisseur *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cimenterie Nationale du Kongo"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Personne de contact</label>
                <input
                  type="text"
                  placeholder="Ex: M. Dieudonné"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Téléphone *</label>
                <input
                  type="text"
                  required
                  placeholder="+243 ..."
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Adresse dépôt</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Purchase / Restocking */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Bon d'Approvisionnement Stock</h3>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {purchaseError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {purchaseError}
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fournisseur *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Numéro Facture / BL *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Add item to restock */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ajouter un produit à commander :
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) addItemToPurchase(e.target.value);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>-- Choisir un produit du catalogue --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actuel: {p.stockQuantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items in purchase */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {purchaseItems.map((it) => {
                  const prod = products.find((p) => p.id === it.productId);
                  return (
                    <div
                      key={it.productId}
                      className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{prod?.name}</div>
                        <div className="text-[10px] text-slate-400">Unité : {prod?.unit}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Qté reçue :</span>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => updatePurchaseItem(it.productId, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">P.U Achat ($) :</span>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={it.unitCost}
                            onChange={(e) => updatePurchaseItem(it.productId, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>

                        <div className="text-right min-w-16">
                          <span className="text-[10px] text-slate-400 block">Sous-total :</span>
                          <span className="font-bold text-emerald-400">
                            ${(it.quantity * it.unitCost).toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removePurchaseItem(it.productId)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-850 p-3 rounded-xl border border-slate-700 flex justify-between items-center text-sm font-black">
                <span>TOTAL COMMANDE FOURNISSEUR :</span>
                <span className="text-emerald-400 font-mono">${purchaseTotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Montant réglé immédiatement au fournisseur ($) :
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={purchaseTotal}
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Le reste non payé (${Math.max(0, purchaseTotal - (parseFloat(paidAmountInput) || 0)).toFixed(2)}) sera inscrit en dette fournisseur.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={purchaseItems.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow"
                >
                  Valider l'Approvisionnement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pay Supplier Debt */}
      {selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Règlement Dette Fournisseur</h3>
              <button onClick={() => setSelectedSupplierForPayment(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-800 rounded-xl text-xs space-y-1">
              <div>Fournisseur : <strong>{selectedSupplierForPayment.name}</strong></div>
              <div>Dette actuelle : <strong className="text-amber-400">${selectedSupplierForPayment.currentDebt}</strong></div>
            </div>

            <form onSubmit={handlePaySupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Montant à régler ($) :</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={selectedSupplierForPayment.currentDebt}
                  required
                  value={paySupplierAmount}
                  onChange={(e) => setPaySupplierAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Moyen de paiement :</label>
                <select
                  value={paySupplierMethod}
                  onChange={(e) => setPaySupplierMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                >
                  <option value="ESPECES">Espèces (Caisse)</option>
                  <option value="BANQUE">Virement Bancaire</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="M_PESA">M-Pesa</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForPayment(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow"
                >
                  Valider le Règlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
