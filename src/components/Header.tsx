import React, { useState } from 'react';
import {
  Store,
  Shield,
  User as UserIcon,
  Wifi,
  WifiOff,
  LogOut,
  RefreshCw,
  Coins,
  DollarSign,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney } from '../logic/businessRules.ts';

export const Header: React.FC = () => {
  const {
    currentUser,
    jwtToken,
    decodedJwt,
    users,
    login,
    logout,
    settings,
    displayCurrency,
    switchDisplayCurrency,
    isOnline,
    updateSettings,
  } = useApp();

  const [showUserModal, setShowUserModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState(settings.exchangeRateUsdToCdf.toString());
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  const handleRateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(newRate);
    if (rateNum > 0) {
      updateSettings({ exchangeRateUsdToCdf: rateNum });
      setShowRateModal(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const ok = login(loginUsername, loginPassword);
    if (ok) {
      setShowUserModal(false);
    } else {
      setLoginError('Identifiant ou mot de passe incorrect.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Store Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-500">
              <Store className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg tracking-tight text-white truncate">
                  {settings.companyName}
                </h1>
                <span className="hidden sm:inline-flex items-center text-[10px] font-semibold bg-blue-900/70 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50">
                  Quincaillerie
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden md:block">{settings.slogan}</p>
            </div>
          </div>

          {/* Controls: Currency, Online status, User */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Exchange Rate Badge / Currency Switcher */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => switchDisplayCurrency('USD')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  displayCurrency === 'USD'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Afficher en Dollars USD"
              >
                USD $
              </button>
              <button
                onClick={() => switchDisplayCurrency('CDF')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  displayCurrency === 'CDF'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Afficher en Francs Congolais (CDF)"
              >
                CDF FC
              </button>
            </div>

            {/* Quick Rate Pill (Clickable for Admin) */}
            <button
              onClick={() => currentUser?.role === 'ADMIN' && setShowRateModal(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 transition"
              title={currentUser?.role === 'ADMIN' ? 'Modifier le taux de change' : 'Taux de change actuel'}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>1$ = {settings.exchangeRateUsdToCdf.toLocaleString()} FC</span>
            </button>

            {/* Online / Offline Sync Badge */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/60 animate-pulse'
              }`}
              title={isOnline ? 'Connecté (Base synchronisée)' : 'Mode Hors-ligne (Données locales sécurisées)'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
            </div>

            {/* Current User Pill / Switch Account */}
            {currentUser ? (
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition text-left"
                title="Gérer la session utilisateur"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  }`}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {currentUser.role === 'ADMIN' ? 'Administrateur' : 'Vendeur'}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Connexion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Exchange Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Taux de Change USD / CDF</h3>
                <p className="text-xs text-slate-400">Défini pour la Quincaillerie Calina</p>
              </div>
            </div>

            <form onSubmit={handleRateUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1 Dollar Américain (USD) = Francs Congolais (CDF)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    min="100"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-bold">CDF / $</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Toutes les transactions conservent leur devise d'origine. Les rapports utiliseront ce taux pour l'équivalence.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User / Session Switcher Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 text-white">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Contrôle d'Accès & Utilisateurs</h3>
                  <p className="text-xs text-slate-400">Quincaillerie Calina</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        currentUser.role === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}
                    >
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">{currentUser.name}</div>
                      <div className="text-xs text-slate-400">
                        Rôle : <span className="text-amber-400 font-semibold">{currentUser.role === 'ADMIN' ? 'Administrateur / Propriétaire' : 'Vendeur / Caissier'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-900/60 text-emerald-400 border border-emerald-700/50">
                      Session JWT
                    </span>
                  </div>
                </div>

                {decodedJwt && (
                  <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Token JWT HS256 :</span>
                    <span className="text-blue-400 font-bold">
                      Valide jusqu'à {new Date(decodedJwt.exp * 1000).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                )}

                <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {currentUser.role === 'ADMIN' ? (
                    <p>
                      <strong className="text-slate-200">Droits Administrateur :</strong> Accès total (ventes, crédits, dérogations, modification des prix, gestion des utilisateurs, fournisseurs et rapports financiers).
                    </p>
                  ) : (
                    <p>
                      <strong className="text-slate-200">Droits Vendeur :</strong> Ventes POS, enregistrement clients, encaissements comptant et acomptes. Aucun droit de modifier les prix ou d'octroyer des crédits non autorisés.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowUserModal(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Se déconnecter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                    {loginError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom d'utilisateur (admin ou vendeur)
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Comptes démo : <code>admin</code> (admin123) ou <code>vendeur</code> (caisse123)
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
                >
                  Se connecter
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
