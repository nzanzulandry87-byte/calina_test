import React, { useState, useMemo } from 'react';
import {
  Settings,
  Building,
  Coins,
  Shield,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  History,
  Save,
  Lock,
  ArrowRightLeft,
  Calendar,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  Search,
  RotateCcw,
  Users,
  Plus,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney } from '../logic/businessRules.ts';
import type { AppSettings, Currency, ExchangeRateHistoryEntry, UserRole, User } from '../types/index.ts';

type SettingsTab = 'EXCHANGE_RATE' | 'COMPANY_INFO' | 'USERS' | 'BACKUP' | 'AUDIT_LOGS';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    updateExchangeRate,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetDatabaseToDefault,
    auditLogs,
    currentUser,
    users,
    addUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('EXCHANGE_RATE');
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [rateSuccessMessage, setRateSuccessMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // User Creation State
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('CASHIER');
  const [userPassword, setUserPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    if (!userName.trim()) {
      setUserError('Veuillez saisir le nom complet.');
      return;
    }
    if (!userUsername.trim()) {
      setUserError("Veuillez saisir le nom d'utilisateur.");
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === userUsername.trim().toLowerCase())) {
      setUserError("Ce nom d'utilisateur existe déjà.");
      return;
    }
    if (!userPassword.trim() || userPassword.length < 3) {
      setUserError('Le mot de passe doit comporter au moins 3 caractères.');
      return;
    }

    addUser({
      name: userName.trim(),
      username: userUsername.trim().toLowerCase(),
      role: userRole,
      passwordHash: userPassword,
      active: true,
    });

    setUserSuccessMessage(`Le compte utilisateur pour ${userName.trim()} a été créé avec succès !`);
    setUserName('');
    setUserUsername('');
    setUserPassword('');
    setShowUserModal(false);
    setTimeout(() => setUserSuccessMessage(''), 4000);
  };

  // Exchange rate modification form state (Owner / Admin)
  const [newRateUsdToCdf, setNewRateUsdToCdf] = useState<string>(
    settings.exchangeRateUsdToCdf ? settings.exchangeRateUsdToCdf.toString() : '2850'
  );
  const [enableDistinctRates, setEnableDistinctRates] = useState<boolean>(
    Boolean(
      (settings.exchangeRateSales && settings.exchangeRateSales !== settings.exchangeRateUsdToCdf) ||
      (settings.exchangeRateRecoveries && settings.exchangeRateRecoveries !== settings.exchangeRateUsdToCdf)
    )
  );
  const [newRateSales, setNewRateSales] = useState<string>(
    settings.exchangeRateSales ? settings.exchangeRateSales.toString() : settings.exchangeRateUsdToCdf.toString()
  );
  const [newRateRecoveries, setNewRateRecoveries] = useState<string>(
    settings.exchangeRateRecoveries ? settings.exchangeRateRecoveries.toString() : settings.exchangeRateUsdToCdf.toString()
  );
  const [allowCashierOverride, setAllowCashierOverride] = useState<boolean>(
    Boolean(settings.allowCashierRateOverride)
  );
  const [rateChangeReason, setRateChangeReason] = useState<string>('');
  const [rateError, setRateError] = useState<string | null>(null);

  // Exchange Rate History search filter
  const [historySearch, setHistorySearch] = useState<string>('');

  // Interactive Live Currency Simulator
  const [simUsdAmount, setSimUsdAmount] = useState<string>('50');
  const [simCdfAmount, setSimCdfAmount] = useState<string>('142500');

  const activeRate = settings.exchangeRateUsdToCdf || 2850;
  const activeRateSales = settings.exchangeRateSales || activeRate;
  const activeRateRecoveries = settings.exchangeRateRecoveries || activeRate;

  // Sync state if settings updated externally
  React.useEffect(() => {
    setFormSettings(settings);
    setNewRateUsdToCdf(settings.exchangeRateUsdToCdf.toString());
    setNewRateSales((settings.exchangeRateSales || settings.exchangeRateUsdToCdf).toString());
    setNewRateRecoveries((settings.exchangeRateRecoveries || settings.exchangeRateUsdToCdf).toString());
    setAllowCashierOverride(Boolean(settings.allowCashierRateOverride));
  }, [settings]);

  // Handle general settings submission (Identity, legal, credit rules)
  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle dedicated exchange rate update (Owner only)
  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRateError(null);
    setRateSuccessMessage(null);

    const parsedRate = parseFloat(newRateUsdToCdf);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setRateError('Veuillez saisir un taux de change valide supérieur à zéro.');
      return;
    }

    const parsedSales = enableDistinctRates ? parseFloat(newRateSales) || parsedRate : parsedRate;
    const parsedRecoveries = enableDistinctRates ? parseFloat(newRateRecoveries) || parsedRate : parsedRate;

    const trimmedReason = rateChangeReason.trim();
    if (!trimmedReason) {
      setRateError('Le motif explicite du changement de taux est obligatoire pour l\'audit comptable.');
      return;
    }

    // Call updateExchangeRate from context with cashier override setting atomically
    updateExchangeRate({
      rateUsdToCdf: parsedRate,
      rateSales: parsedSales,
      rateRecoveries: parsedRecoveries,
      allowCashierRateOverride: allowCashierOverride,
      reason: trimmedReason,
    });

    setRateSuccessMessage(
      `Le taux de change a été mis à jour avec succès : 1 USD = ${parsedRate.toLocaleString('fr-FR')} CDF.`
    );
    setRateChangeReason('');
    setTimeout(() => setRateSuccessMessage(null), 5000);
  };

  // Preset rate buttons helper
  const handleSelectPresetRate = (rate: number) => {
    setNewRateUsdToCdf(rate.toString());
    if (!enableDistinctRates) {
      setNewRateSales(rate.toString());
      setNewRateRecoveries(rate.toString());
    }
  };

  // Restore past rate into form
  const handleRestorePastRate = (entry: ExchangeRateHistoryEntry) => {
    setNewRateUsdToCdf(entry.rateUsdToCdf.toString());
    setNewRateSales((entry.rateSales || entry.rateUsdToCdf).toString());
    setNewRateRecoveries((entry.rateRecoveries || entry.rateUsdToCdf).toString());
    setEnableDistinctRates(
      Boolean(
        (entry.rateSales && entry.rateSales !== entry.rateUsdToCdf) ||
        (entry.rateRecoveries && entry.rateRecoveries !== entry.rateUsdToCdf)
      )
    );
    setRateChangeReason(`Rétablissement du taux antérieur du ${new Date(entry.changedAt).toLocaleDateString('fr-FR')} (${entry.rateUsdToCdf} CDF)`);
    // Scroll to form smoothly
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Export exchange rate history to CSV
  const handleExportRateHistoryCSV = () => {
    const list = settings.exchangeRateHistory || [];
    if (list.length === 0) return;

    const headers = ['ID', 'Date', 'Taux_USD_CDF', 'Taux_Ventes', 'Taux_Recouvrements', 'Modifie_Par', 'Motif'];
    const rows = list.map((e) => [
      `"${e.id}"`,
      `"${new Date(e.changedAt).toISOString()}"`,
      e.rateUsdToCdf,
      e.rateSales || e.rateUsdToCdf,
      e.rateRecoveries || e.rateUsdToCdf,
      `"${e.changedByName.replace(/"/g, '""')}"`,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historique_Taux_USD_CDF_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const list = settings.exchangeRateHistory || [];
    if (!historySearch.trim()) return list;
    const q = historySearch.toLowerCase();
    return list.filter(
      (e) =>
        e.rateUsdToCdf.toString().includes(q) ||
        e.changedByName.toLowerCase().includes(q) ||
        (e.reason && e.reason.toLowerCase().includes(q)) ||
        new Date(e.changedAt).toLocaleDateString('fr-FR').includes(q)
    );
  }, [settings.exchangeRateHistory, historySearch]);

  const handleDownloadBackup = () => {
    const json = exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sauvegarde_CalinaGestion_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDatabaseJSON(content);
      setImportStatus(res.message);
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
  };

  // Convertisseur calculations
  const simConvertedCdf = useMemo(() => {
    const val = parseFloat(simUsdAmount);
    if (isNaN(val)) return '0';
    return Math.round(val * activeRate).toLocaleString('fr-FR');
  }, [simUsdAmount, activeRate]);

  const simConvertedUsd = useMemo(() => {
    const val = parseFloat(simCdfAmount);
    if (isNaN(val)) return '0.00';
    return (val / activeRate).toFixed(2);
  }, [simCdfAmount, activeRate]);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Paramètres & Taux de Change</h3>
            <p className="text-xs text-slate-400">
              Quincaillerie Calina • Gestion multi-devises USD / CDF, identité et sécurité
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'ADMIN' ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Session Propriétaire (Admin)</span>
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Consultation seule (Réservé Propriétaire)</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('EXCHANGE_RATE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
            activeTab === 'EXCHANGE_RATE'
              ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Taux de Change USD / CDF</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/80 font-mono">
            {activeRate.toLocaleString('fr-FR')} FC
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPANY_INFO')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
            activeTab === 'COMPANY_INFO'
              ? 'bg-blue-500/10 border-blue-500 text-blue-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Building className="w-4 h-4 text-blue-400" />
          <span>Identité Commerciale & Facturation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
            activeTab === 'USERS'
              ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Gestion des Utilisateurs ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
            activeTab === 'BACKUP'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Sauvegarde & Données</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
            activeTab === 'AUDIT_LOGS'
              ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <History className="w-4 h-4 text-purple-400" />
          <span>Journal d'Audit ({auditLogs.length})</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Paramètres de l'entreprise enregistrés avec succès !</span>
        </div>
      )}

      {rateSuccessMessage && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{rateSuccessMessage}</span>
        </div>
      )}

      {importStatus && (
        <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* TAB 1: DEDICATED EXCHANGE RATE CONFIGURATION & HISTORY */}
      {activeTab === 'EXCHANGE_RATE' && (
        <div className="space-y-6">
          {/* Active Official Rate Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Convention Officielle en Vigueur
                </span>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1 flex items-baseline gap-2">
                  <span>1 USD = {activeRate.toLocaleString('fr-FR')} CDF</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ACTIF
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ce taux est le pivot officiel de Quincaillerie Calina pour convertir les prix des articles, les acomptes et les règlements de créances.
                </p>
              </div>

              {/* Sub-rates badges */}
              <div className="grid grid-cols-2 gap-2 text-xs flex-shrink-0">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">Taux Ventes Comptant</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {activeRateSales.toLocaleString('fr-FR')} CDF
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">Taux Recouvrements</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {activeRateRecoveries.toLocaleString('fr-FR')} CDF
                  </span>
                </div>
              </div>
            </div>

            {/* Cashier override policy status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-850/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-slate-300">
                  Dérogation caissier sur les transactions :{' '}
                  <strong className={settings.allowCashierRateOverride ? 'text-emerald-400' : 'text-amber-400'}>
                    {settings.allowCashierRateOverride ? 'Autorisée (Négociation possible)' : 'Verrouillée (Taux officiel strict)'}
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Dernière modification : {settings.exchangeRateHistory?.[0] ? new Date(settings.exchangeRateHistory[0].changedAt).toLocaleString('fr-FR') : 'Non renseignée'}
              </span>
            </div>
          </div>

          {/* Interactive Live Converter Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                <span>Simulateur de Conversion Instantanée (Contrôle Propriétaire)</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Basé sur 1 USD = {activeRate.toLocaleString('fr-FR')} CDF
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* USD -> CDF */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <label className="block text-slate-300 font-semibold">
                  Montant en Dollars Américains (USD $) :
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={simUsdAmount}
                      onChange={(e) => setSimUsdAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-slate-400 font-bold">=</span>
                  <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-black text-sm">
                    {simConvertedCdf} FC
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {['10', '25', '50', '100', '250', '500'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSimUsdAmount(val)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* CDF -> USD */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <label className="block text-slate-300 font-semibold">
                  Montant en Francs Congolais (CDF FC) :
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={simCdfAmount}
                      onChange={(e) => setSimCdfAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-2 font-bold text-slate-500 text-xs">FC</span>
                  </div>
                  <span className="text-slate-400 font-bold">=</span>
                  <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-blue-400 font-mono font-black text-sm">
                    ${simConvertedUsd}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {['50000', '100000', '150000', '285000', '500000', '1000000'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSimCdfAmount(val)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
                    >
                      {(parseInt(val, 10) / 1000).toLocaleString('fr-FR')}k FC
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form to Modify Exchange Rate (Owner / Admin) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Modifier le Taux de Change (Formulaire Propriétaire)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mettez à jour le cours officiel dès qu'il évolue sur le marché de Kinshasa ou Goma
                </p>
              </div>

              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                Action Sécurisée
              </span>
            </div>

            {rateError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{rateError}</span>
              </div>
            )}

            <form onSubmit={handleRateSubmit} className="space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Valeurs courantes du marché congolais (clic rapide) :
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[2800, 2830, 2850, 2880, 2900, 2950, 3000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={currentUser?.role !== 'ADMIN'}
                      onClick={() => handleSelectPresetRate(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition border ${
                        parseFloat(newRateUsdToCdf) === preset
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset.toLocaleString('fr-FR')} FC
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Rate Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Nouveau Taux Pivot Standard (1 USD en Francs CDF) * :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="100"
                      disabled={currentUser?.role !== 'ADMIN'}
                      value={newRateUsdToCdf}
                      onChange={(e) => {
                        setNewRateUsdToCdf(e.target.value);
                        if (!enableDistinctRates) {
                          setNewRateSales(e.target.value);
                          setNewRateRecoveries(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-black text-base focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                      CDF
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Exemple de convention : 1 USD = 2 850 CDF
                  </span>
                </div>

                {/* Cashier override toggle */}
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block text-xs">
                        Dérogation caissier autorisée ?
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Permettre au caissier d'ajuster le taux par vente
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                      <input
                        type="checkbox"
                        disabled={currentUser?.role !== 'ADMIN'}
                        checked={allowCashierOverride}
                        onChange={(e) => setAllowCashierOverride(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Distinct Rates Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    disabled={currentUser?.role !== 'ADMIN'}
                    checked={enableDistinctRates}
                    onChange={(e) => setEnableDistinctRates(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Définir des taux distincts pour les ventes et les recouvrements de créances</span>
                </label>
              </div>

              {enableDistinctRates && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-700/80">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Taux appliqué aux ventes au comptant (CDF) :
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="100"
                      disabled={currentUser?.role !== 'ADMIN'}
                      value={newRateSales}
                      onChange={(e) => setNewRateSales(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Taux appliqué aux recouvrements de dettes (CDF) :
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="100"
                      disabled={currentUser?.role !== 'ADMIN'}
                      value={newRateRecoveries}
                      onChange={(e) => setNewRateRecoveries(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Motif obligatoire de la modification (Audit comptable) * :
                </label>
                <input
                  type="text"
                  required
                  disabled={currentUser?.role !== 'ADMIN'}
                  placeholder="Ex : Hausse du cours sur le marché de Kinshasa / Lubumbashi, note BCC"
                  value={rateChangeReason}
                  onChange={(e) => setRateChangeReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-slate-400">Suggestions :</span>
                  {[
                    'Ajustement cours officiel BCC',
                    'Hausse marché de change Kinshasa',
                    'Baisse du Franc Congolais',
                    'Fixation début de semaine commerciale',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      disabled={currentUser?.role !== 'ADMIN'}
                      onClick={() => setRateChangeReason(sug)}
                      className="text-[10px] text-blue-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrity & Non-retroactivity Rule Banner */}
              <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Règle d'irréversibilité comptable :</strong> La modification du taux ne recalculera JAMAIS rétroactivement les ventes antérieures ni les recouvrements déjà validés. Chaque opération conserve dans l'historique le taux effectif qui lui a été appliqué au moment de sa réalisation.
                </p>
              </div>

              {/* Submit Button */}
              {currentUser?.role === 'ADMIN' ? (
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer et Appliquer le Nouveau Taux ({newRateUsdToCdf} CDF)</span>
                </button>
              ) : (
                <div className="text-xs text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-800/60">
                  Connectez-vous avec un compte Administrateur (Propriétaire) pour modifier les taux de change.
                </div>
              )}
            </form>
          </div>

          {/* Past Exchange Rates History (Point 5 Exigence Métier) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Historique des Taux de Change Passés</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Traçabilité intégrale de chaque modification de cours avec auteur, horodatage et motif
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportRateHistoryCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exporter CSV</span>
                </button>

                <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded-lg">
                  {filteredHistory.length} entrée(s)
                </span>
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher dans l'historique des taux (date, motif, auteur, taux)..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* History Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-700">
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3">Date & Heure</th>
                    <th className="py-2.5 px-3">Taux Pivot (1 USD)</th>
                    <th className="py-2.5 px-3">Taux Ventes</th>
                    <th className="py-2.5 px-3">Taux Recouvrement</th>
                    <th className="py-2.5 px-3">Modifié Par</th>
                    <th className="py-2.5 px-3">Motif & Justification</th>
                    {currentUser?.role === 'ADMIN' && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredHistory.map((entry, idx) => {
                    const isCurrentlyActive = idx === 0 && entry.rateUsdToCdf === settings.exchangeRateUsdToCdf;

                    return (
                      <tr
                        key={entry.id}
                        className={`transition ${
                          isCurrentlyActive ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3">
                          {isCurrentlyActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              ACTIF
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                              ARCHIVÉ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-sans whitespace-nowrap">
                          <div className="font-semibold text-white">
                            {new Date(entry.changedAt).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(entry.changedAt).toLocaleTimeString('fr-FR')}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400 text-sm whitespace-nowrap">
                          {entry.rateUsdToCdf.toLocaleString('fr-FR')} CDF
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {(entry.rateSales || entry.rateUsdToCdf).toLocaleString('fr-FR')} CDF
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {(entry.rateRecoveries || entry.rateUsdToCdf).toLocaleString('fr-FR')} CDF
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-sans whitespace-nowrap">
                          {entry.changedByName}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-sans text-[11px] max-w-xs">
                          {entry.reason || 'Mise à jour standard'}
                        </td>
                        {currentUser?.role === 'ADMIN' && (
                          <td className="py-3 px-3 text-right">
                            {!isCurrentlyActive && (
                              <button
                                type="button"
                                onClick={() => handleRestorePastRate(entry)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-lg text-[11px] font-sans font-semibold border border-slate-700 transition inline-flex items-center gap-1"
                                title="Charger ce taux dans le formulaire pour le réappliquer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Recharger</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={currentUser?.role === 'ADMIN' ? 8 : 7} className="py-8 text-center text-slate-400 font-sans">
                        Aucun historique correspondant à la recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY IDENTITY & BILLING */}
      {activeTab === 'COMPANY_INFO' && (
        <form onSubmit={handleSettingsSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h4 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Building className="w-4 h-4 text-blue-400" />
              <span>Identité Commerciale & Mentions Légales</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Raison Sociale :</label>
                <input
                  type="text"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.companyName}
                  onChange={(e) => setFormSettings({ ...formSettings, companyName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Slogan Commercial :</label>
                <input
                  type="text"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.slogan}
                  onChange={(e) => setFormSettings({ ...formSettings, slogan: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Numéro Téléphone Caisse :</label>
                <input
                  type="text"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adresse Magasin & Dépôt :</label>
                <input
                  type="text"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.address}
                  onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">N° RCCM (Registre de Commerce) :</label>
                <input
                  type="text"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.rcm}
                  onChange={(e) => setFormSettings({ ...formSettings, rcm: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Identification Nationale (Id. Nat) :</label>
                <input
                  type="text"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.idNat}
                  onChange={(e) => setFormSettings({ ...formSettings, idNat: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Operational & Credit Rules */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h4 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Settings className="w-4 h-4 text-purple-400" />
              <span>Règles Opérationnelles & Reçus</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Délai d'échéance crédit par défaut (Jours) :
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.defaultCreditPeriodDays}
                  onChange={(e) => setFormSettings({ ...formSettings, defaultCreditPeriodDays: parseInt(e.target.value, 10) || 14 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Vente avec stock négatif :
                </label>
                <select
                  disabled={currentUser?.role !== 'ADMIN'}
                  value={formSettings.allowNegativeStock ? 'true' : 'false'}
                  onChange={(e) => setFormSettings({ ...formSettings, allowNegativeStock: e.target.value === 'true' })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="false">Interdite (Contrôle strict stock dispo)</option>
                  <option value="true">Autorisée (Dérogation exceptionnelle)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Texte de pied de page sur les reçus / factures :
              </label>
              <input
                type="text"
                disabled={currentUser?.role !== 'ADMIN'}
                value={formSettings.receiptFooterText}
                onChange={(e) => setFormSettings({ ...formSettings, receiptFooterText: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>

            {currentUser?.role === 'ADMIN' && (
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les Informations Commerciales</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* TAB: USER MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Gestion des Comptes Utilisateurs</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Créez et gérez les accès pour les administrateurs et caissiers/vendeurs.
              </p>
            </div>
            {currentUser?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Créer un utilisateur</span>
              </button>
            )}
          </div>

          {userSuccessMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{userSuccessMessage}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Nom</th>
                  <th className="py-2.5 px-3">Identifiant</th>
                  <th className="py-2.5 px-3">Rôle</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Date de création</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{u.username}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-800'
                      }`}>
                        {u.role === 'ADMIN' ? 'ADMINISTRATEUR' : 'CAISSIER / VENDEUR'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.active ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP, RESTORE & DATA RESET */}
      {activeTab === 'BACKUP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h4 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Sauvegarde & Restauration de la Base de Données</span>
          </h4>

          <p className="text-xs text-slate-300 leading-relaxed">
            L'application fonctionne en <strong>mode hors connexion</strong> avec stockage local sécurisé. Vous pouvez télécharger à tout moment une sauvegarde intégrale (stocks, ventes, créances, devises, historique des taux) ou la restaurer sur un autre appareil Android ou iPhone.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger Sauvegarde JSON</span>
            </button>

            <label className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Restaurer depuis un fichier JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            {currentUser?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Voulez-vous réinitialiser et charger le jeu de données de test complet MVP (Produits, Clients, Ventes, Créances) ?')) {
                    resetDatabaseToDefault();
                    window.location.reload();
                  }
                }}
                className="py-3 px-4 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4 text-purple-400" />
                <span>Charger Données de Test MVP</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span>Journal d'Audit de Sécurité & Opérations Sensibles</span>
            </h4>
            <span className="text-xs text-slate-400">{auditLogs.length} événements enregistrés</span>
          </div>

          <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs flex justify-between items-start gap-2">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-purple-300">
                      {log.category}
                    </span>
                    <span>{log.action}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                </div>
                <div className="text-right text-[10px] text-slate-500 flex-shrink-0">
                  <div>Par {log.userName}</div>
                  <div>{new Date(log.createdAt).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                Aucun événement d'audit récent.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER ACCOUNT */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Créer un Nouvel Utilisateur</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nom Complet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marc Kabila"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Identifiant de Connexion (Username) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: mkabila"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rôle de l'utilisateur *
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="CASHIER">Caissier / Vendeur (Ventes POS, encaissements)</option>
                  <option value="ADMIN">Administrateur / Propriétaire (Accès complet)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mot de Passe *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mot de passe confidentiel"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow"
                >
                  Enregistrer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
