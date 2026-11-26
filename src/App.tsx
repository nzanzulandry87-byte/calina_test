import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { Navigation, type ActiveTab } from './components/Navigation.tsx';
import { InstallPrompt } from './components/InstallPrompt.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { ShieldCheck, LogIn, Lock, CheckCircle, AlertCircle, Building2, UserPlus } from 'lucide-react';

// Views
import { DashboardView } from './views/DashboardView.tsx';
import { POSView } from './views/POSView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { DebtsView } from './views/DebtsView.tsx';
import { CustomersView } from './views/CustomersView.tsx';
import { CashView } from './views/CashView.tsx';
import { PurchasesView } from './views/PurchasesView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

// Screen 1: Initial Admin Creation Screen (When no Admin exists)
function AdminSetupScreen({ onAdminCreated }: { onAdminCreated: () => void }) {
  const { createInitialAdmin } = useApp();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Veuillez entrer votre nom complet.');
      return;
    }
    if (!username.trim()) {
      setError("Veuillez choisir un nom d'utilisateur.");
      return;
    }
    if (!password.trim() || password.length < 3) {
      setError('Le mot de passe doit comporter au moins 3 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    createInitialAdmin(name.trim(), username.trim().toLowerCase(), password);
    onAdminCreated();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/40 rounded-2xl flex items-center justify-center text-blue-400 mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white">Configuration Initiale</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Aucun compte administrateur n'a été détecté. Veuillez créer le compte Administrateur Principal pour sécuriser l'accès à votre application.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nom complet du Propriétaire / Admin *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nzanzu Landry"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Identifiant de Connexion (Username) *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mot de passe confidentiel *
            </label>
            <input
              type="password"
              required
              placeholder="Créer un mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              required
              placeholder="Confirmer votre mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Créer le Compte Administrateur</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// Screen 2: Login & Registration Screen (RBAC Protected)
function LoginScreen({ initialMessage }: { initialMessage?: string }) {
  const { login, addUser, users } = useApp();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState(initialMessage || '');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim() || !password.trim()) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    const success = login(username, password);
    if (!success) {
      setError("Identifiant ou mot de passe incorrect, ou compte inactif.");
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!regName.trim()) {
      setError('Veuillez indiquer votre nom complet.');
      return;
    }
    if (!regUsername.trim()) {
      setError("Veuillez choisir un nom d'utilisateur.");
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === regUsername.trim().toLowerCase())) {
      setError("Ce nom d'utilisateur est déjà utilisé par un autre membre.");
      return;
    }
    if (!regPassword.trim() || regPassword.length < 3) {
      setError('Le mot de passe doit comporter au moins 3 caractères.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    // Role default for self-registration: CASHIER (Caissier/Vendeur)
    addUser({
      name: regName.trim(),
      username: regUsername.trim().toLowerCase(),
      role: 'CASHIER',
      passwordHash: regPassword,
      active: true,
    });

    setMessage(`Compte Caissier créé avec succès pour ${regName.trim()} ! Connectez-vous.`);
    setUsername(regUsername.trim().toLowerCase());
    setPassword(regPassword);
    setRegName('');
    setRegUsername('');
    setRegPassword('');
    setRegConfirmPassword('');
    setMode('LOGIN');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/40 rounded-2xl flex items-center justify-center text-blue-400 mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white">Calina Gestion</h1>
          <p className="text-xs text-slate-400">
            {mode === 'LOGIN' ? "Connectez-vous pour accéder au Tableau de bord" : "Inscription d'un nouveau membre de l'équipe"}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'LOGIN' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Connexion</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'REGISTER' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Inscription (Vendeur)</span>
          </button>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald-950/70 border border-emerald-700 text-emerald-300 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nom d'utilisateur (Username) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: admin ou vendeur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mot de passe *
              </label>
              <input
                type="password"
                required
                placeholder="Saisissez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Se Connecter</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nom Complet *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Marc Kabila"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nom d'utilisateur (Username) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: mkabila"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mot de passe *
              </label>
              <input
                type="password"
                required
                placeholder="Créer un mot de passe"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmer le mot de passe *
              </label>
              <input
                type="password"
                required
                placeholder="Confirmer le mot de passe"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>S'inscrire (Compte Caissier)</span>
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              if (confirm('Voulez-vous réinitialiser le stockage local pour afficher la page de création du compte Administrateur ?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline font-medium transition"
          >
            Créer un nouveau compte administrateur principal (Reset)
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Application Container (RBAC Restricted)
function MainContent() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* PWA Install Banner */}
      <InstallPrompt />

      {/* Main Header with Logo, Currency Toggle, User Pill */}
      <Header />

      {/* Navigation Bar (Desktop top tabs & Mobile drawers) */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
        {activeTab === 'pos' && <POSView />}
        {activeTab === 'products' && <ProductsView />}
        {activeTab === 'debts' && <DebtsView />}
        {activeTab === 'customers' && <CustomersView />}
        {activeTab === 'cash' && (
          currentUser?.role === 'ADMIN' ? (
            <CashView />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto text-center space-y-4 my-12 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Accès Restreint : Caisse & Dépenses</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ce module financier est strictement confidentiel et réservé au Propriétaire / Administrateur.
              </p>
              <button
                onClick={() => setActiveTab('pos')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow"
              >
                Retour à la Caisse POS
              </button>
            </div>
          )
        )}
        {activeTab === 'purchases' && <PurchasesView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Printable / Shareable Receipt Modal */}
      <ReceiptModal />
    </div>
  );
}

// App Root Switcher
function AppRoot() {
  const { users, currentUser } = useApp();
  const [createdAdminNotice, setCreatedAdminNotice] = useState<string | null>(null);

  const hasAdmin = users.some((u) => u.role === 'ADMIN' && u.active);

  // 1. If no admin exists -> show Admin Setup Screen (Registration of Primary Admin)
  if (!hasAdmin) {
    return (
      <AdminSetupScreen
        onAdminCreated={() => {
          setCreatedAdminNotice('Compte Administrateur créé avec succès ! Veuillez vous connecter.');
        }}
      />
    );
  }

  // 2. If admin exists but not logged in -> show Login/Registration Screen
  if (!currentUser) {
    return <LoginScreen initialMessage={createdAdminNotice || undefined} />;
  }

  // 3. Logged in -> show Main Application with RBAC Navigation
  return <MainContent />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
