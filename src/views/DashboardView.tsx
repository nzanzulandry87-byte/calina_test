import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Package,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Users,
  DollarSign,
  HelpCircle,
  Clock,
  CheckCircle,
  Truck,
  PlusCircle,
  Lock,
  Shield,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  calculateFinancialMetrics,
  calculateProfitMetrics,
  formatMoney,
  convertCurrency,
} from '../logic/businessRules.ts';
import type { ActiveTab } from '../components/Navigation.tsx';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const {
    products,
    sales,
    debts,
    debtPayments,
    expenses,
    settings,
    displayCurrency,
    currentUser,
  } = useApp();

  const [period, setPeriod] = useState<'TODAY' | 'MONTH' | 'ALL'>('TODAY');
  const [showMethodModal, setShowMethodModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  // Filter items by period
  const filteredSales = sales.filter((s) => {
    if (period === 'TODAY') return s.createdAt.startsWith(todayStr);
    if (period === 'MONTH') return s.createdAt.startsWith(thisMonthStr);
    return true;
  });

  const filteredPayments = debtPayments.filter((p) => {
    if (period === 'TODAY') return p.createdAt.startsWith(todayStr);
    if (period === 'MONTH') return p.createdAt.startsWith(thisMonthStr);
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (period === 'TODAY') return e.createdAt.startsWith(todayStr);
    if (period === 'MONTH') return e.createdAt.startsWith(thisMonthStr);
    return true;
  });

  // Calculate metrics
  const financialMetrics = calculateFinancialMetrics({
    sales: filteredSales,
    debtPayments: filteredPayments,
    expenses: filteredExpenses,
    targetCurrency: displayCurrency,
    exchangeRateUsdToCdf: settings.exchangeRateUsdToCdf,
  });

  const profitMetrics = calculateProfitMetrics({
    sales: filteredSales,
    expenses: filteredExpenses,
    targetCurrency: displayCurrency,
    exchangeRateUsdToCdf: settings.exchangeRateUsdToCdf,
  });

  // Overall Receivables (Créances totales non réglées)
  const totalOpenDebts = debts.reduce((sum, d) => {
    if (d.status === 'REGLEE') return sum;
    const { amount } = convertCurrency(d.remainingAmount, d.currency, displayCurrency, settings.exchangeRateUsdToCdf);
    return sum + amount;
  }, 0);

  const overdueDebts = debts.filter((d) => d.status === 'EN_RETARD');
  const totalOverdueDebtsAmount = overdueDebts.reduce((sum, d) => {
    const { amount } = convertCurrency(d.remainingAmount, d.currency, displayCurrency, settings.exchangeRateUsdToCdf);
    return sum + amount;
  }, 0);

  // Stock inventory valuation at cost
  const stockValuationCost = products.reduce((sum, p) => {
    if (p.archived) return sum;
    const { amount } = convertCurrency(p.purchasePrice * p.stockQuantity, p.currency, displayCurrency, settings.exchangeRateUsdToCdf);
    return sum + amount;
  }, 0);

  const stockValuationSale = products.reduce((sum, p) => {
    if (p.archived) return sum;
    const { amount } = convertCurrency(p.sellingPrice * p.stockQuantity, p.currency, displayCurrency, settings.exchangeRateUsdToCdf);
    return sum + amount;
  }, 0);

  const lowStockProducts = products.filter((p) => !p.archived && p.stockQuantity <= p.minThreshold && p.stockQuantity > 0);
  const outOfStockProducts = products.filter((p) => !p.archived && p.stockQuantity <= 0);

  const isAdmin = currentUser?.role === 'ADMIN';
  const myFilteredSales = filteredSales.filter((s) => s.userId === currentUser?.id);
  const totalStockUnits = products.reduce((sum, p) => (!p.archived ? sum + p.stockQuantity : sum), 0);
  const activeProductsCount = products.filter((p) => !p.archived).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner & Period Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30">
              {settings.companyName}
            </span>
            <span className="text-xs text-slate-400">
              Session : <strong className="text-white">{currentUser?.name}</strong>{' '}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isAdmin ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'}`}>
                {isAdmin ? 'Propriétaire / Admin' : 'Vendeur / Opérationnel'}
              </span>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
            Tableau de Bord Commercial
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi en temps réel des ventes, de la caisse, des créances et des stocks.
          </p>
        </div>

        {/* Period Selector & Profit explanation */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex text-xs font-semibold">
            <button
              onClick={() => setPeriod('TODAY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'TODAY' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setPeriod('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'MONTH' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => setPeriod('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'ALL' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Global
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowMethodModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Consulter la méthode de calcul du bénéfice et des encaissements"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Non-Admin Security & Confidentiality Banner */}
      {!isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 text-xs text-slate-300 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-white flex items-center gap-2">
              <span>Session Vendeur / Opérationnelle</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Indicateurs financiers masqués
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Conformément à la politique de gestion, le Chiffre d'affaires global, les Encaissements réels, le Bénéfice net réalisé ainsi que le module Caisse & Dépenses sont masqués pour votre profil.
            </div>
          </div>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            {/* 1. Chiffre d'Affaires (Turnover) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Chiffre d'Affaires (CA)</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">
                {formatMoney(financialMetrics.turnover, displayCurrency)}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <span>{filteredSales.length} ventes validées</span>
                {financialMetrics.creditGranted > 0 && (
                  <span className="text-amber-400 font-medium">
                    (dont {formatMoney(financialMetrics.creditGranted, displayCurrency)} à crédit)
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
            </div>

            {/* 2. Encaissements Réels (Cash Inflow) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Encaissements Réels</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {formatMoney(financialMetrics.totalActualCashIn, displayCurrency)}
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                <div className="flex justify-between font-mono text-[11px] text-emerald-300">
                  <span>💵 Recettes USD ($) :</span>
                  <span className="font-bold">{financialMetrics.totalCashInUsd.toLocaleString('fr-FR')} $</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] text-blue-300">
                  <span>💴 Recettes CDF (FC) :</span>
                  <span className="font-bold">{financialMetrics.totalCashInCdf.toLocaleString('fr-FR')} FC</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>

            {/* 3. Créances Clients en cours */}
            <div
              onClick={() => setActiveTab('debts')}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Créances en cours</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-400">
                {formatMoney(totalOpenDebts, displayCurrency)}
              </div>
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="text-slate-400">En retard :</span>
                <span className="font-bold text-rose-400">
                  {overdueDebts.length > 0
                    ? `${overdueDebts.length} client(s) (${formatMoney(totalOverdueDebtsAmount, displayCurrency)})`
                    : 'Aucun retard'}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            </div>

            {/* 4. Bénéfice Net Estimé (Profit) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Bénéfice Net Réalisé</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl font-black ${
                  profitMetrics.netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {formatMoney(profitMetrics.netProfit, displayCurrency)}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex justify-between">
                <span>Marge brute : {profitMetrics.grossMarginPercentage}%</span>
                <span>Dépenses : -{formatMoney(profitMetrics.totalExpenses, displayCurrency)}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </div>
          </>
        ) : (
          <>
            {/* 1. Mes Ventes Réalisées (Vendeur) */}
            <div
              onClick={() => setActiveTab('pos')}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Mes Ventes Conclues</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">
                {myFilteredSales.length} <span className="text-sm font-normal text-slate-400">vente(s)</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Total magasin : {filteredSales.length}</span>
                <span className="text-blue-400 font-semibold">Ouvrir POS ➔</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
            </div>

            {/* 2. Articles en Rayon & Stock */}
            <div
              onClick={() => setActiveTab('products')}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Articles en Rayon</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {totalStockUnits.toLocaleString()} <span className="text-sm font-normal text-slate-400">unités</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Catalogue actif</span>
                <span className="text-slate-300 font-medium">{activeProductsCount} références</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>

            {/* 3. Créances Clients en cours */}
            <div
              onClick={() => setActiveTab('debts')}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Créances en cours</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-400">
                {formatMoney(totalOpenDebts, displayCurrency)}
              </div>
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="text-slate-400">En retard :</span>
                <span className="font-bold text-rose-400">
                  {overdueDebts.length > 0
                    ? `${overdueDebts.length} client(s) (${formatMoney(totalOverdueDebtsAmount, displayCurrency)})`
                    : 'Aucun retard'}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            </div>

            {/* 4. Alertes Ruptures de Stock */}
            <div
              onClick={() => setActiveTab('products')}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Alertes & Ruptures</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-400">
                {lowStockProducts.length + outOfStockProducts.length}{' '}
                <span className="text-sm font-normal text-slate-400">article(s)</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                <span>Ruptures nettes :</span>
                <span className="font-bold text-rose-400">{outOfStockProducts.length} article(s)</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </div>
          </>
        )}
      </div>

      {/* Quick Action Shortcuts for Store Operation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('pos')}
          className="flex items-center gap-3 p-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium text-xs transition-colors"
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <div>Nouvelle Vente</div>
            <div className="text-[10px] text-blue-100 font-normal">Caisse & POS rapide</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className="flex items-center gap-3 p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold text-xs transition"
        >
          <CreditCard className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-left">
            <div>Recouvrement</div>
            <div className="text-[10px] text-slate-400 font-normal">Encaisser créance</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className="flex items-center gap-3 p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold text-xs transition"
        >
          <Package className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-left">
            <div>Ajuster Stock</div>
            <div className="text-[10px] text-slate-400 font-normal">Entrée / Sortie auditée</div>
          </div>
        </button>

        {isAdmin ? (
          <button
            onClick={() => setActiveTab('cash')}
            className="flex items-center gap-3 p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold text-xs transition"
          >
            <Wallet className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="text-left">
              <div>Dépense Caisse</div>
              <div className="text-[10px] text-slate-400 font-normal">Loyer, transport, élec.</div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('customers')}
            className="flex items-center gap-3 p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold text-xs transition"
          >
            <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="text-left">
              <div>Répertoire Clients</div>
              <div className="text-[10px] text-slate-400 font-normal">Fiche & contact</div>
            </div>
          </button>
        )}
      </div>

      {/* Two-Column Operational Section: Alerts & Recents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inventory Health & Stock Valuation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-white">État & Disponibilité du Stock</h3>
            </div>
            <button
              onClick={() => setActiveTab('products')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Voir tout ({products.length})
            </button>
          </div>

          {/* Valuation / Operational Stock Row */}
          <div className="grid grid-cols-2 gap-3">
            {isAdmin ? (
              <>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Valeur au Coût d'Achat</div>
                  <div className="text-lg font-black text-slate-100 mt-1">
                    {formatMoney(stockValuationCost, displayCurrency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Capital immobilisé</div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Valeur à la Vente</div>
                  <div className="text-lg font-black text-blue-400 mt-1">
                    {formatMoney(stockValuationSale, displayCurrency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Potentiel brut réalisable</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Articles Référencés</div>
                  <div className="text-lg font-black text-slate-100 mt-1">
                    {activeProductsCount} articles
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Catalogue quincaillerie</div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Quantité en Rayon</div>
                  <div className="text-lg font-black text-blue-400 mt-1">
                    {totalStockUnits.toLocaleString()} pièces
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Disponibilité physique</div>
                </div>
              </>
            )}
          </div>

          {/* Stock Alerts List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Articles en Alerte ou Rupture</span>
              <span className="text-xs font-bold text-amber-400">
                {lowStockProducts.length + outOfStockProducts.length} article(s)
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {outOfStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-rose-300 truncate">{p.name}</div>
                    <div className="text-[10px] text-rose-400/80 font-mono">Réf: {p.sku}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-bold bg-rose-900 text-rose-200 text-[10px] flex-shrink-0">
                    RUPTURE (0 {p.unit})
                  </span>
                </div>
              ))}

              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-amber-300 truncate">{p.name}</div>
                    <div className="text-[10px] text-amber-400/80 font-mono">
                      Stock: {p.stockQuantity} {p.unit} (Seuil: {p.minThreshold})
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-bold bg-amber-900 text-amber-200 text-[10px] flex-shrink-0">
                    SOUS SEUIL
                  </span>
                </div>
              ))}

              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                  Tous les stocks sont au-dessus de leur seuil minimal de sécurité.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Overdue Debts & Priority Recovery */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-sm text-white">Créances Prioritaires & Retards</h3>
            </div>
            <button
              onClick={() => setActiveTab('debts')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Gérer les créances
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {debts
              .filter((d) => d.status !== 'REGLEE')
              .slice(0, 5)
              .map((debt) => {
                const isOverdue = debt.status === 'EN_RETARD';
                return (
                  <div
                    key={debt.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      isOverdue
                        ? 'bg-rose-950/40 border-rose-800/60'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        <span>{debt.customerName}</span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-900 text-rose-200">
                            EN RETARD
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Vente : <span className="font-mono">{debt.saleNumber}</span> • Échéance :{' '}
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {debt.dueDate}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-3">
                      <div className="font-black text-rose-400 text-sm">
                        {formatMoney(debt.remainingAmount, debt.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Payé : {formatMoney(debt.paidAmount, debt.currency)}
                      </div>
                    </div>
                  </div>
                );
              })}

            {debts.filter((d) => d.status !== 'REGLEE').length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                Toutes les créances clients sont entièrement réglées.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Calculation Methodology Explanation Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Méthode de Calcul Financier & Règles Métier</h3>
              </div>
              <button
                onClick={() => setShowMethodModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <h4 className="font-bold text-white mb-1">1. Chiffre d'Affaires vs Encaissements Réels</h4>
                <p>
                  <strong>Chiffre d'Affaires (CA)</strong> : Somme brute de toutes les ventes validées durant la période, qu'elles soient payées au comptant ou accordées à crédit.
                </p>
                <p className="mt-1">
                  <strong>Encaissements Réels</strong> : Argent liquide ou mobile véritablement entré en caisse = <em>(Ventes comptant + Acomptes reçus + Recouvrements de créances antérieures)</em>. Une vente à crédit ne gonfle jamais l'encaissement de caisse.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <h4 className="font-bold text-white mb-1">2. Non-Double Comptabilisation du Recouvrement</h4>
                <p>
                  Le recouvrement d'une dette rembourse une vente passée. Il entre dans les <strong>Encaissements</strong> de caisse, mais <strong>ne crée pas de nouvelle vente</strong> et ne s'ajoute <strong>jamais</strong> une seconde fois dans le Chiffre d'Affaires.
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <h4 className="font-bold text-white mb-1">3. Marge Brute et Bénéfice Net (COGS)</h4>
                <p>
                  <strong>Coût des Marchandises Vendues (COGS)</strong> : Pour chaque article vendu, son coût d'achat unitaire d'origine est déduit :
                  <br />
                  <code className="text-amber-300 font-mono block mt-1">
                    Marge Brute = Chiffre d'Affaires - Coût d'Achat des Produits Vendus
                  </code>
                  <code className="text-emerald-300 font-mono block mt-1">
                    Bénéfice Net = Marge Brute - Dépenses Opérationnelles (Loyer, Transport, Électricité, etc.)
                  </code>
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                <h4 className="font-bold text-white mb-1">4. Ségrégation Créances Clients / Dettes Fournisseurs</h4>
                <p>
                  Les créances clients (ce que les clients doivent à Calina) sont strictement séparées des dettes fournisseurs (ce que Calina doit à ses partenaires cimentiers et quincailliers).
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMethodModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
