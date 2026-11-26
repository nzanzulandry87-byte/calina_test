import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  CreditCard,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Archive,
  History,
  CheckCircle,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney } from '../logic/businessRules.ts';
import type { Customer, CustomerCategory } from '../types/index.ts';

export const CustomersView: React.FC = () => {
  const {
    customers,
    customerCategoryHistories,
    sales,
    debts,
    settings,
    displayCurrency,
    currentUser,
    addCustomer,
    updateCustomerCategory,
    archiveCustomer,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'LIST' | 'AUDIT_HISTORY'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'A' | 'B' | 'DEBTORS'>('ALL');

  // Modal: New Customer
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<CustomerCategory>('B');
  const [newCreditLimit, setNewCreditLimit] = useState('500');
  const [newNotes, setNewNotes] = useState('');
  const [newError, setNewError] = useState('');

  // Modal: Change Category (Audited)
  const [customerToChangeCategory, setCustomerToChangeCategory] = useState<Customer | null>(null);
  const [targetCategory, setTargetCategory] = useState<CustomerCategory>('A');
  const [targetLimit, setTargetLimit] = useState('1000');
  const [categoryChangeReason, setCategoryChangeReason] = useState('');
  const [categoryChangeError, setCategoryChangeError] = useState('');

  // Modal: Customer Detail
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [archiveFeedback, setArchiveFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (c.archived) return false;
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterCategory === 'A') return c.category === 'A';
      if (filterCategory === 'B') return c.category === 'B';
      if (filterCategory === 'DEBTORS') return c.currentDebt > 0.01;
      return true;
    });
  }, [customers, searchQuery, filterCategory]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');

    if (!newName.trim() || !newPhone.trim()) {
      setNewError('Le nom du client et son numéro de téléphone sont obligatoires.');
      return;
    }

    const limitNum = parseFloat(newCreditLimit);
    if (newCategory === 'A' && (isNaN(limitNum) || limitNum <= 0)) {
      setNewError('Pour un client de catégorie A, un plafond de crédit positif est obligatoire.');
      return;
    }

    addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim() || undefined,
      category: newCategory,
      creditLimit: newCategory === 'A' ? limitNum : 0,
      notes: newNotes.trim() || undefined,
    });

    setShowNewModal(false);
  };

  const handleChangeCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToChangeCategory) return;
    setCategoryChangeError('');

    if (!categoryChangeReason.trim()) {
      setCategoryChangeError('Règle de sécurité : Vous devez obligatoirement motiver le changement de catégorie.');
      return;
    }

    const limitNum = parseFloat(targetLimit);
    if (targetCategory === 'A' && (isNaN(limitNum) || limitNum <= 0)) {
      setCategoryChangeError('Veuillez définir un plafond de crédit valide.');
      return;
    }

    updateCustomerCategory(
      customerToChangeCategory.id,
      targetCategory,
      targetCategory === 'A' ? limitNum : 0,
      categoryChangeReason.trim()
    );

    setCustomerToChangeCategory(null);
  };

  const handleArchiveClick = (c: Customer) => {
    if (confirm(`Confirmez-vous l'archivage du client ${c.name} ? L'historique sera préservé.`)) {
      const res = archiveCustomer(c.id);
      setArchiveFeedback(res);
      setTimeout(() => setArchiveFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Bar with Add Client Button & Filter Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'LIST'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Répertoire Clients ({customers.filter((c) => !c.archived).length})
            </button>
            <button
              onClick={() => setActiveTab('AUDIT_HISTORY')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'AUDIT_HISTORY'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Historique des Changements de Catégorie ({customerCategoryHistories.length})
            </button>
          </div>

          <button
            onClick={() => {
              setNewName('');
              setNewPhone('+243 ');
              setNewAddress('');
              setNewCategory('B');
              setNewCreditLimit('500');
              setNewNotes('');
              setNewError('');
              setShowNewModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Client</span>
          </button>
        </div>

        {archiveFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              archiveFeedback.success
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {archiveFeedback.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{archiveFeedback.message}</span>
          </div>
        )}

        {activeTab === 'LIST' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, code ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterCategory === 'ALL'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterCategory('A')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterCategory === 'A'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Catégorie A (Crédit)
              </button>
              <button
                onClick={() => setFilterCategory('B')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterCategory === 'B'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Catégorie B (Comptant)
              </button>
              <button
                onClick={() => setFilterCategory('DEBTORS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterCategory === 'DEBTORS'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Endettés seuls
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main List Area */}
      {activeTab === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const hasDebt = c.currentDebt > 0.01;
            const availableCredit = Math.max(0, c.creditLimit - c.currentDebt);

            return (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-md flex flex-col justify-between transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.category === 'A'
                          ? 'bg-blue-900 text-blue-200 border border-blue-700/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.category === 'A' ? 'CATÉGORIE A (CRÉDIT)' : 'CATÉGORIE B (COMPTANT)'}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-white">{c.name}</h4>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.phone}</span>
                  </div>
                  {c.address && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  {/* Credit status */}
                  {c.category === 'A' ? (
                    <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Plafond autorisé :</span>
                        <span className="font-semibold text-slate-200">${c.creditLimit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dette actuelle :</span>
                        <span className={`font-bold ${hasDebt ? 'text-rose-400' : 'text-slate-300'}`}>
                          ${c.currentDebt.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-400 border-t border-slate-700 pt-1">
                        <span>Crédit dispo :</span>
                        <span>${availableCredit.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/40 p-2.5 rounded-xl text-xs text-slate-400">
                      Paiement au comptant strict. Aucun crédit autorisé.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setSelectedCustomerDetail(c)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Fiche & Historique</span>
                    </button>

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setCustomerToChangeCategory(c);
                          setTargetCategory(c.category === 'A' ? 'B' : 'A');
                          setTargetLimit(c.creditLimit > 0 ? c.creditLimit.toString() : '1000');
                          setCategoryChangeReason('');
                          setCategoryChangeError('');
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
                        title="Modifier catégorie client (Action auditée)"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleArchiveClick(c)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                        title="Archiver le client (Refusé si dette active)"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="col-span-full p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              Aucun client ne correspond au critère de recherche.
            </div>
          )}
        </div>
      ) : (
        /* Category Audit History */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span>Traçabilité des Changements de Catégorie Client</span>
            </h3>
            <span className="text-xs text-slate-400">
              Règle : Tout changement est audité et n'efface jamais les dettes
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-[65vh] overflow-y-auto pr-1">
            {customerCategoryHistories.map((h) => {
              const cust = customers.find((c) => c.id === h.customerId);
              return (
                <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{cust?.name || 'Client'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                        Passage {h.previousCategory} ➔ {h.newCategory}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      <strong>Motif obligatoire :</strong> {h.reason}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Modifié par {h.userName} • {new Date(h.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              );
            })}

            {customerCategoryHistories.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun changement de catégorie client n'a été effectué pour le moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Customer */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">Enregistrer un Client</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {newError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {newError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom complet ou Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entreprise BTP Mwamba"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Téléphone (WhatsApp / Appels) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+243 ..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Adresse physique / Chantier (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Quartier, Avenue, N°..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catégorie Client *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CustomerCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="B">Catégorie B (Comptant 100%)</option>
                    <option value="A">Catégorie A (Crédit Autorisé)</option>
                  </select>
                </div>

                {newCategory === 'A' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plafond Crédit ($ USD) *
                    </label>
                    <input
                      type="number"
                      step="50"
                      min="10"
                      value={newCreditLimit}
                      onChange={(e) => setNewCreditLimit(e.target.value)}
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observations / Remarques
                </label>
                <textarea
                  rows={2}
                  placeholder="Client fidèle, artisan maçon, etc."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Category (Audited) */}
      {customerToChangeCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Modification Statut Client</h3>
              </div>
              <button onClick={() => setCustomerToChangeCategory(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {categoryChangeError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {categoryChangeError}
              </div>
            )}

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
              <div className="font-bold text-white">{customerToChangeCategory.name}</div>
              <div className="text-slate-400">
                Catégorie actuelle : <strong>Catégorie {customerToChangeCategory.category}</strong>
              </div>
              <div className="text-rose-400 font-semibold">
                Dette en cours conservée : ${customerToChangeCategory.currentDebt.toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleChangeCategorySubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nouvelle Catégorie :
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value as CustomerCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="A">Catégorie A (Crédit)</option>
                    <option value="B">Catégorie B (Comptant)</option>
                  </select>
                </div>

                {targetCategory === 'A' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nouveau Plafond ($) :
                    </label>
                    <input
                      type="number"
                      step="50"
                      min="10"
                      value={targetLimit}
                      onChange={(e) => setTargetLimit(e.target.value)}
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif obligatoire de la modification (Audit) :
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Augmentation plafond suite à contrat de chantier validé..."
                  value={categoryChangeReason}
                  onChange={(e) => setCategoryChangeReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomerToChangeCategory(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition"
                >
                  Valider le Changement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Details & Purchases History */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base">{selectedCustomerDetail.name}</h3>
                <p className="text-xs text-slate-400 font-mono">Code: {selectedCustomerDetail.code}</p>
              </div>
              <button onClick={() => setSelectedCustomerDetail(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700">
              <div>
                <span className="text-slate-400">Catégorie : </span>
                <strong className="text-white">Catégorie {selectedCustomerDetail.category}</strong>
              </div>
              <div>
                <span className="text-slate-400">Téléphone : </span>
                <strong className="text-white">{selectedCustomerDetail.phone}</strong>
              </div>
              <div>
                <span className="text-slate-400">Plafond : </span>
                <strong className="text-slate-200">${selectedCustomerDetail.creditLimit}</strong>
              </div>
              <div>
                <span className="text-slate-400">Dette active : </span>
                <strong className="text-rose-400">${selectedCustomerDetail.currentDebt.toFixed(2)}</strong>
              </div>
            </div>

            {/* Invoices list */}
            <div>
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider mb-2">
                Historique des Ventes du Client
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sales
                  .filter((s) => s.customerId === selectedCustomerDetail.id)
                  .map((sale) => (
                    <div
                      key={sale.id}
                      className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-mono font-bold text-white">{sale.saleNumber}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(sale.createdAt).toLocaleDateString('fr-FR')} • {sale.type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{formatMoney(sale.totalAmount, sale.currency)}</div>
                        {sale.remainingAmount > 0 && (
                          <div className="text-[10px] text-rose-400 font-semibold">
                            Reste: {formatMoney(sale.remainingAmount, sale.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {sales.filter((s) => s.customerId === selectedCustomerDetail.id).length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-400">
                    Aucune vente enregistrée pour ce client.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomerDetail(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
