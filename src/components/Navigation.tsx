import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  CreditCard,
  Users,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  Smartphone,
  Menu,
  X,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'debts'
  | 'customers'
  | 'purchases'
  | 'cash'
  | 'reports'
  | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { products, debts, currentUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  // If a non-admin user lands on cash view, redirect to POS or Dashboard
  React.useEffect(() => {
    if (!isAdmin && activeTab === 'cash') {
      setActiveTab('pos');
    }
  }, [isAdmin, activeTab, setActiveTab]);

  // Compute alert badges
  const lowStockCount = products.filter(
    (p) => !p.archived && p.stockQuantity <= p.minThreshold
  ).length;

  const overdueDebtsCount = debts.filter((d) => d.status === 'EN_RETARD').length;

  const allNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    adminOnly?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'pos',
      label: 'Vente & Caisse',
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      id: 'debts',
      label: 'Créances & Recouvrements',
      icon: <CreditCard className="w-5 h-5" />,
      badge: overdueDebtsCount,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'products',
      label: 'Produits & Stock',
      icon: <Package className="w-5 h-5" />,
      badge: lowStockCount,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'customers',
      label: 'Clients',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'cash',
      label: 'Caisse & Dépenses',
      icon: <Wallet className="w-5 h-5" />,
      adminOnly: true,
    },
    {
      id: 'purchases',
      label: 'Achats & Fournisseurs',
      icon: <Truck className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'Rapports & Stats',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Desktop / Tablet Navigation Bar */}
      <nav aria-label="Navigation principale" className="hidden lg:block bg-slate-900 border-b border-slate-800 sticky top-[61px] z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white ${
                      item.badgeColor || 'bg-blue-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar with Quick Drawer Trigger */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-medium text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Vue :</span>
          <span className="font-semibold text-white flex items-center gap-1.5">
            {navItems.find((i) => i.id === activeTab)?.icon}
            {navItems.find((i) => i.id === activeTab)?.label}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Menu className="w-4 h-4" />
          <span>Tous les modules</span>
        </button>
      </div>

      {/* Mobile Fullscreen Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 text-white shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
              <div className="font-bold text-base text-white">Modules Calina Gestion</div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-colors ${
                      isActive
                        ? 'bg-blue-600 border-blue-500 text-white font-medium'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className={isActive ? 'text-white' : 'text-blue-400'}>{item.icon}</div>
                      {item.badge && item.badge > 0 ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                            item.badgeColor || 'bg-blue-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs leading-tight">{item.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Thumb Navigation Bar (Most frequent 5 actions) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around safe-area-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg transition ${
            activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Accueil</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`relative flex flex-col items-center py-1 px-3 rounded-lg transition ${
            activeTab === 'pos'
              ? 'text-white bg-blue-600 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Vente POS</span>
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className={`relative flex flex-col items-center py-1 px-2 rounded-lg transition ${
            activeTab === 'debts' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Créances</span>
          {overdueDebtsCount > 0 && (
            <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`relative flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeTab === 'products' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Stock</span>
          {lowStockCount > 0 && (
            <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-slate-900" />
          )}
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>
    </>
  );
};
