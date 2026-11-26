import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  CreditCard,
  Package,
  Wallet,
  DollarSign,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Shield,
  ShoppingCart,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  calculateFinancialMetrics,
  calculateProfitMetrics,
  formatMoney,
  convertCurrency,
} from '../logic/businessRules.ts';

export const ReportsView: React.FC = () => {
  const {
    sales,
    debts,
    debtPayments,
    expenses,
    purchases,
    products,
    users,
    settings,
    displayCurrency,
    currentUser,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('MONTH');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = now.toISOString().slice(0, 7);

  // Filter items by selected period
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.cancelled) return false;
      if (period === 'TODAY') return s.createdAt.startsWith(todayStr);
      if (period === 'MONTH') return s.createdAt.startsWith(thisMonthStr);
      if (period === 'WEEK') {
        const d = new Date(s.createdAt);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      return true;
    });
  }, [sales, period, todayStr, thisMonthStr, now]);

  const filteredDebtPayments = useMemo(() => {
    return debtPayments.filter((p) => {
      if (period === 'TODAY') return p.createdAt.startsWith(todayStr);
      if (period === 'MONTH') return p.createdAt.startsWith(thisMonthStr);
      if (period === 'WEEK') {
        const d = new Date(p.createdAt);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      return true;
    });
  }, [debtPayments, period, todayStr, thisMonthStr, now]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (period === 'TODAY') return e.createdAt.startsWith(todayStr);
      if (period === 'MONTH') return e.createdAt.startsWith(thisMonthStr);
      if (period === 'WEEK') {
        const d = new Date(e.createdAt);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      return true;
    });
  }, [expenses, period, todayStr, thisMonthStr, now]);

  // Financial Metrics
  const financials = useMemo(() => {
    return calculateFinancialMetrics({
      sales: filteredSales,
      debtPayments: filteredDebtPayments,
      expenses: filteredExpenses,
      targetCurrency: displayCurrency,
      exchangeRateUsdToCdf: settings.exchangeRateUsdToCdf,
    });
  }, [filteredSales, filteredDebtPayments, filteredExpenses, displayCurrency, settings]);

  const profit = useMemo(() => {
    return calculateProfitMetrics({
      sales: filteredSales,
      expenses: filteredExpenses,
      targetCurrency: displayCurrency,
      exchangeRateUsdToCdf: settings.exchangeRateUsdToCdf,
    });
  }, [filteredSales, filteredExpenses, displayCurrency, settings]);

  // Product sales breakdown (Top items)
  const productStats = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sku: string; qty: number; revenue: number; cost: number; margin: number }
    >();

    for (const s of filteredSales) {
      for (const it of s.items) {
        const existing = map.get(it.productId) || {
          name: it.productName,
          sku: it.productSku,
          qty: 0,
          revenue: 0,
          cost: 0,
          margin: 0,
        };

        const itemRev = convertCurrency(it.subtotal, it.currency || s.currency, displayCurrency, settings.exchangeRateUsdToCdf).amount;
        const itemCost = convertCurrency(it.unitCost * it.quantity, it.currency || s.currency, displayCurrency, settings.exchangeRateUsdToCdf).amount;

        existing.qty += it.quantity;
        existing.revenue += itemRev;
        existing.cost += itemCost;
        existing.margin = existing.revenue - existing.cost;
        map.set(it.productId, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, displayCurrency, settings]);

  // Cashier Performance breakdown
  const cashierStats = useMemo(() => {
    const map = new Map<string, { userName: string; salesCount: number; totalSold: number }>();

    for (const s of filteredSales) {
      const existing = map.get(s.userId) || {
        userName: s.userName,
        salesCount: 0,
        totalSold: 0,
      };

      const soldInTarget = convertCurrency(s.totalAmount, s.currency, displayCurrency, settings.exchangeRateUsdToCdf).amount;
      existing.salesCount += 1;
      existing.totalSold += soldInTarget;
      map.set(s.userId, existing);
    }

    return Array.from(map.values());
  }, [filteredSales, displayCurrency, settings]);

  // CSV Export
  const exportToCSV = () => {
    let csv = `Rapport Commercial Calina Gestion - ${settings.companyName}\n`;
    csv += `Période: ${period} | Devise: ${displayCurrency} | Date export: ${new Date().toLocaleString('fr-FR')}\n\n`;

    csv += `SYNTHESE FINANCIERE\n`;
    csv += `Chiffre d'Affaires;${financials.turnover}\n`;
    csv += `Encaissements Réels;${financials.totalActualCashIn}\n`;
    csv += `Créances Octroyées;${financials.creditGranted}\n`;
    csv += `Recouvrements Reçus;${financials.debtRecovered}\n`;
    csv += `Dépenses Magasin;${financials.totalExpenses}\n`;
    csv += `Coût Marchandises Vendues;${profit.totalCOGS}\n`;
    csv += `Marge Brute;${profit.grossMargin} (${profit.grossMarginPercentage}%)\n`;
    csv += `Bénéfice Net Réalisé;${profit.netProfit} (${profit.netProfitPercentage}%)\n\n`;

    csv += `VENTES PAR PRODUIT\n`;
    csv += `Référence;Article;Quantité Vendue;Chiffre d'Affaires;Coût d'Achat;Marge Réalisée\n`;
    for (const p of productStats) {
      csv += `"${p.sku}";"${p.name}";${p.qty};${p.revenue.toFixed(2)};${p.cost.toFixed(2)};${p.margin.toFixed(2)}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rapport_Calina_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24 print:p-0 print:space-y-4">
      {/* Top Bar with Period Filter & Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row gap-3 items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-bold text-base text-white">Rapports Financiers & Statistiques</h3>
            <p className="text-xs text-slate-400">Analyse rigoureuse de rentabilité et marges</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Period selector */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex text-xs font-semibold">
            <button
              onClick={() => setPeriod('TODAY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'TODAY' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setPeriod('WEEK')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'WEEK' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setPeriod('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'MONTH' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriod('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                period === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Tout
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Télécharger les données en tableur CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition"
            title="Imprimer ou enregistrer en PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer PDF</span>
          </button>
        </div>
      </div>

      {/* Header for Print only */}
      <div className="hidden print:block text-center border-b pb-4 mb-4 text-slate-900">
        <h1 className="text-xl font-bold uppercase">{settings.companyName}</h1>
        <p className="text-xs">Rapport Financier Périodique ({period})</p>
        <p className="text-[10px] text-slate-500">Date d'édition : {new Date().toLocaleString('fr-FR')}</p>
      </div>

      {/* Financial Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-slate-400 text-xs font-medium uppercase">Chiffre d'Affaires</div>
          <div className="text-xl font-black text-white mt-1">
            {formatMoney(financials.turnover, displayCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{filteredSales.length} ventes conclues</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-slate-400 text-xs font-medium uppercase">Encaissements Réels</div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {formatMoney(financials.totalActualCashIn, displayCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Liquidités réelles reçues</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-slate-400 text-xs font-medium uppercase">Marge Brute Réalisée</div>
          <div className="text-xl font-black text-blue-400 mt-1">
            {formatMoney(profit.grossMargin, displayCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{profit.grossMarginPercentage}% du chiffre d'affaires</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-slate-400 text-xs font-medium uppercase">Bénéfice Net Réalisé</div>
          <div
            className={`text-xl font-black mt-1 ${
              profit.netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(profit.netProfit, displayCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Après déduction des dépenses</div>
        </div>
      </div>

      {/* Dual Currency Cash Receipts Breakdown (Exigence Rapport Multi-devises) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 pb-2">
          <span>Ventilation des Recettes Réelles en Caisse (Multi-Devises)</span>
          <span className="text-[10px] font-mono text-blue-400">1 USD = {settings.exchangeRateUsdToCdf.toLocaleString('fr-FR')} FC</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-800/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Encaissé en USD ($)</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {financials.totalCashInUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              $
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-800/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Encaissé en CDF (FC)</div>
              <div className="text-xl font-black text-blue-400 font-mono mt-0.5">
                {financials.totalCashInCdf.toLocaleString('fr-FR')} FC
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              FC
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown: Cost of Goods Sold & Expenses */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h4 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
          Décomposition du Résultat Financier & Rentabilité
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 rounded-lg bg-slate-800/40">
            <span className="text-slate-300">1. Chiffre d'Affaires brut (Total Ventes) :</span>
            <span className="font-mono font-bold text-white">
              {formatMoney(profit.totalSalesRevenue, displayCurrency)}
            </span>
          </div>

          <div className="flex justify-between p-2 rounded-lg bg-slate-800/40 text-rose-300">
            <span>2. Coût d'achat des marchandises vendues (COGS) :</span>
            <span className="font-mono font-bold">
              -{formatMoney(profit.totalCOGS, displayCurrency)}
            </span>
          </div>

          <div className="flex justify-between p-2 rounded-lg bg-blue-950/40 border border-blue-900/60 font-semibold text-blue-200">
            <span>➔ Marge Brute Commerciale :</span>
            <span className="font-mono font-black text-sm">
              {formatMoney(profit.grossMargin, displayCurrency)} ({profit.grossMarginPercentage}%)
            </span>
          </div>

          <div className="flex justify-between p-2 rounded-lg bg-slate-800/40 text-rose-300">
            <span>3. Dépenses d'exploitation (Loyer, Transport, Élec., Salaires) :</span>
            <span className="font-mono font-bold">
              -{formatMoney(profit.totalExpenses, displayCurrency)}
            </span>
          </div>

          <div className="flex justify-between p-3 rounded-xl bg-slate-800 border border-slate-700 font-bold text-sm text-white">
            <span className="text-amber-400">➔ BÉNÉFICE NET RÉALISÉ :</span>
            <span className="font-mono font-black text-base text-amber-400">
              {formatMoney(profit.netProfit, displayCurrency)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Selling Products Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h4 className="font-bold text-sm text-white flex items-center justify-between border-b border-slate-800 pb-2">
          <span>Classement des Ventes par Produit & Marges</span>
          <span className="text-xs text-slate-400">{productStats.length} article(s) vendus</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 pb-2">
                <th className="py-2">Article</th>
                <th className="py-2 text-right">Qté Vendue</th>
                <th className="py-2 text-right">Chiffre d'Affaires</th>
                <th className="py-2 text-right">Coût Achat</th>
                <th className="py-2 text-right">Marge Réalisée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {productStats.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50">
                  <td className="py-2.5 pr-2">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-200">{p.qty}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-white">
                    {formatMoney(p.revenue, displayCurrency)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-400">
                    {formatMoney(p.cost, displayCurrency)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                    {formatMoney(p.margin, displayCurrency)}
                  </td>
                </tr>
              ))}

              {productStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Aucune vente enregistrée pour cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashier Sales Performance */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h4 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
          Performances par Caissier / Vendeur
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cashierStats.map((c, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  {c.userName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-white">{c.userName}</div>
                  <div className="text-[10px] text-slate-400">{c.salesCount} vente(s) traitée(s)</div>
                </div>
              </div>

              <div className="font-mono font-black text-sm text-blue-400">
                {formatMoney(c.totalSold, displayCurrency)}
              </div>
            </div>
          ))}

          {cashierStats.length === 0 && (
            <div className="col-span-full py-4 text-center text-slate-400 text-xs">
              Aucune activité enregistrée.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
