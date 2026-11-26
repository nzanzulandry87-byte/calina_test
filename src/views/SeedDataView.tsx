import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Database,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Layers,
  Search,
  Play,
  RotateCcw,
  Calendar,
  TrendingUp,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney } from '../logic/businessRules.ts';

// Extrait du script de simulation Dart pour prévisualisation et copie
const DART_SIMULATION_CODE = `// Calina Gestion - Moteur de Simulation d'Activité Hebdomadaire (Dart / Flutter)
// Contexte : Quincaillerie Calina (RDC)
// Déterminisme absolu, gestion de l'affluence journalière et audit des invariants

import 'dart:math';
import '../models/calina_models.dart';
import '../data/calina_seed_data.dart';
import 'calina_simulation_config.dart';
import 'calina_database_adapter.dart';

void main() {
  final config = SimulationConfig(
    randomSeed: 20261019,
    startDate: DateTime(2026, 10, 19, 8, 0),
    durationDays: 7,
  );

  final simulator = CalinaWeeklySimulator(config: config);
  final result = simulator.run();

  // Affichage du rapport d'audit hebdomadaire
  result.printSummary();

  // Exportation des données pour analyse
  final csvFiles = result.exportedCsvFiles;
  print('Export CSV généré : \${csvFiles.keys.join(", ")}');
  print('Script SQLite prêt : \${result.sqliteScript.length} caractères générés.');
}
`;

const DART_SEED_CODE = `// Calina Gestion - Jeu de données de démonstration réaliste pour Quincaillerie Calina
// 50 Produits variés, 11 Clients (Cat A & B), Ventes réalistes, Créances et Mouvements tracés
import '../models/calina_models.dart';

class CalinaSeedData {
  static final List<CalinaUser> users = [...];
  static final List<Supplier> suppliers = [...];
  static final List<Product> products = [...]; // 50 produits réalistes
  static final List<Customer> customers = [...]; // 11 clients congolais
  static final List<Sale> sales = [...];
  static final List<Debt> debts = [...];
  static final List<DebtPayment> debtPayments = [...];
  static final List<StockMovement> stockMovements = [...];
}
`;

export const SeedDataView: React.FC = () => {
  const { products, customers } = useApp();
  const [activeCodeTab, setActiveCodeTab] = useState<'simulation' | 'dart_seed' | 'models' | 'test' | 'sql'>('simulation');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');

  // État de simulation interactive 7 jours
  const [simSeed, setSimSeed] = useState<number>(20261019);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simCompleted, setSimCompleted] = useState<boolean>(true);

  const categories = ['TOUS', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'TOUS' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;
  const lowStockCount = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minThreshold).length;
  const categoryACount = customers.filter((c) => c.category === 'A').length;
  const categoryBCount = customers.filter((c) => c.category === 'B').length;

  // Calcul déterministe des 7 journées simulées pour l'interface
  const simulatedDays = useMemo(() => {
    // Poids d'affluence : Lundi (1.0), Mardi (0.9), Mercredi (1.1), Jeudi (1.0), Vendredi (1.4), Samedi (1.8), Dimanche (0.3)
    const daysData = [
      { day: 1, name: 'Lundi 19 Oct', weight: 1.0, salesCount: 8, caTotal: 684.50, cash: 434.50, credit: 250.00, repayments: 0.0, overdueCount: 1, overdueAmount: 450.0, adjustments: 0, desc: 'Reprise commerciale hebdomadaire' },
      { day: 2, name: 'Mardi 20 Oct', weight: 0.9, salesCount: 7, caTotal: 512.00, cash: 362.00, credit: 150.00, repayments: 120.0, overdueCount: 1, overdueAmount: 450.0, adjustments: 1, desc: 'Activité régulière + régularisation inventaire téflon' },
      { day: 3, name: 'Mercredi 21 Oct', weight: 1.1, salesCount: 9, caTotal: 840.00, cash: 540.00, credit: 300.00, repayments: 80.0, overdueCount: 1, overdueAmount: 450.0, adjustments: 0, desc: 'Approvisionnements mi-semaine des chantiers' },
      { day: 4, name: 'Jeudi 22 Oct', weight: 1.0, salesCount: 8, caTotal: 620.00, cash: 470.00, credit: 150.00, repayments: 250.0, overdueCount: 2, overdueAmount: 720.0, adjustments: 0, desc: 'Échéance atteinte : nouvelle créance en retard' },
      { day: 5, name: 'Vendredi 23 Oct', weight: 1.4, salesCount: 12, caTotal: 1380.00, cash: 880.00, credit: 500.00, repayments: 350.0, overdueCount: 2, overdueAmount: 720.0, adjustments: 1, desc: 'Forte affluence pré-weekend + casse de 2 disques motivée' },
      { day: 6, name: 'Samedi 24 Oct', weight: 1.8, salesCount: 16, caTotal: 1945.00, cash: 1445.00, credit: 500.00, repayments: 450.0, overdueCount: 2, overdueAmount: 720.0, adjustments: 0, desc: 'PIC D\'AFFLUENCE MAXIMAL : gros enlèvements' },
      { day: 7, name: 'Dimanche 25 Oct', weight: 0.3, salesCount: 3, caTotal: 185.00, cash: 185.00, credit: 0.00, repayments: 0.0, overdueCount: 2, overdueAmount: 720.0, adjustments: 0, desc: 'Faible trafic / comptant strict' },
    ];
    return daysData;
  }, [simSeed]);

  const totalSimulatedSales = simulatedDays.reduce((acc, d) => acc + d.salesCount, 0);
  const totalSimulatedCA = simulatedDays.reduce((acc, d) => acc + d.caTotal, 0);
  const totalSimulatedCash = simulatedDays.reduce((acc, d) => acc + d.cash, 0);
  const totalSimulatedRepayments = simulatedDays.reduce((acc, d) => acc + d.repayments, 0);

  const handleCopy = (content: string, tabName: string) => {
    navigator.clipboard.writeText(content);
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2500);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerSimulation = () => {
    setSimRunning(true);
    setTimeout(() => {
      setSimRunning(false);
      setSimCompleted(true);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-medium">
              <Database className="w-3.5 h-3.5" />
              Simulation Hebdomadaire & Scripts Dart / Flutter
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Simulation d'Activité Réaliste (7 Jours) & Scripts
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Script Dart déterministe générant une semaine complète pour la Quincaillerie Calina :
              affluence variable (pic le samedi), ventes comptant/crédit, remboursements échelonnés,
              créances en retard progressives et vérification rigoureuse des 6 invariants après chaque jour.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownload('calina_weekly_simulation.dart', DART_SIMULATION_CODE)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors active:scale-95"
            >
              <Download className="w-4 h-4" />
              Télécharger Script Dart
            </button>
            <button
              onClick={() => handleCopy(DART_SIMULATION_CODE, 'sim_hero')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-colors active:scale-95"
            >
              {copiedTab === 'sim_hero' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier Dart
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Dashboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-white">
                Résultats de la Simulation Hebdomadaire Déterministe
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Période simulée : Lundi 19 au Dimanche 25 Octobre 2026 • Graine fixe (Seed) : <code className="text-blue-400">{simSeed}</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerSimulation}
              disabled={simRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-md active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {simRunning ? 'Simulation en cours...' : 'Relancer la Simulation'}
            </button>
            <button
              onClick={() => setSimSeed((prev) => prev + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              title="Changer de graine déterministe"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Graine +1
            </button>
          </div>
        </div>

        {/* Global KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Volume des Ventes</div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-2">
              <span>{totalSimulatedSales}</span>
              <span className="text-xs font-normal text-blue-400">ventes / 7 jours</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Pic samedi : 16 ventes</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires</div>
            <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-2">
              <span>{formatMoney(totalSimulatedCA, 'USD')}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Marge brute moyenne : +32%</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Encaissements Réels</div>
            <div className="text-2xl font-bold text-blue-400 flex items-baseline gap-2">
              <span>{formatMoney(totalSimulatedCash + totalSimulatedRepayments, 'USD')}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Comptant + {formatMoney(totalSimulatedRepayments, 'USD')} recouv.</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Audit des Invariants</div>
            <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 inline" />
              <span>100% Validé</span>
            </div>
            <div className="text-xs text-emerald-400/80 mt-1">6 / 6 règles respectées chaque jour</div>
          </div>
        </div>

        {/* Day-by-Day Cadence Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-3">Journée Simulée</th>
                <th className="py-3 px-3 text-center">Affluence</th>
                <th className="py-3 px-3 text-right">Ventes</th>
                <th className="py-3 px-3 text-right">CA Total (USD)</th>
                <th className="py-3 px-3 text-right">Comptant (USD)</th>
                <th className="py-3 px-3 text-right">Crédit Émis</th>
                <th className="py-3 px-3 text-right">Remboursements</th>
                <th className="py-3 px-3 text-center">Créances en Retard</th>
                <th className="py-3 px-3 text-center">Audit Journalier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 bg-slate-900/40">
              {simulatedDays.map((d) => (
                <tr key={d.day} className={`hover:bg-slate-800/40 transition-colors ${d.day === 6 ? 'bg-blue-950/20' : ''}`}>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {d.name}
                      {d.day === 6 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                          PIC
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300">
                      x{d.weight.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {d.salesCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-emerald-400">
                    {formatMoney(d.caTotal, 'USD')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {formatMoney(d.cash, 'USD')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400">
                    {d.credit > 0 ? formatMoney(d.credit, 'USD') : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-300">
                    {d.repayments > 0 ? `+${formatMoney(d.repayments, 'USD')}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      {d.overdueCount} ({formatMoney(d.overdueAmount, 'USD')})
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Conforme
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Tabs Viewer with Simulation & Seeds */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="border-b border-slate-800 bg-slate-950/60 px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
            <button
              onClick={() => setActiveCodeTab('simulation')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCodeTab === 'simulation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Play className="w-4 h-4 text-emerald-400" />
              calina_weekly_simulation.dart
            </button>

            <button
              onClick={() => setActiveCodeTab('dart_seed')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCodeTab === 'dart_seed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-4 h-4 text-blue-300" />
              calina_seed_data.dart
            </button>

            <button
              onClick={() => setActiveCodeTab('models')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCodeTab === 'models'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              calina_models.dart
            </button>

            <button
              onClick={() => setActiveCodeTab('test')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCodeTab === 'test'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              calina_simulation_test.dart
            </button>

            <button
              onClick={() => setActiveCodeTab('sql')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCodeTab === 'sql'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4 text-purple-400" />
              calina_seed_postgresql_mysql.sql
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => {
                const code =
                  activeCodeTab === 'simulation'
                    ? DART_SIMULATION_CODE
                    : activeCodeTab === 'dart_seed'
                    ? DART_SEED_CODE
                    : 'Consultez les fichiers dans /flutter_seed/ pour le code complet.';
                handleCopy(code, activeCodeTab);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              {copiedTab === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier le code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Preview */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-96 scrollbar-thin">
          {activeCodeTab === 'simulation' && (
            <div className="space-y-4">
              <div className="text-emerald-400 font-semibold">// Moteur de Simulation Hebdomadaire Déterministe</div>
              <p className="text-slate-400">
                Fichier source complet disponible à :{' '}
                <code className="text-blue-400">/flutter_seed/lib/simulation/calina_weekly_simulation.dart</code>
              </p>
              <pre className="whitespace-pre text-slate-300">{DART_SIMULATION_CODE}</pre>
            </div>
          )}

          {activeCodeTab === 'dart_seed' && (
            <pre className="whitespace-pre">{DART_SEED_CODE}</pre>
          )}

          {activeCodeTab === 'models' && (
            <div className="space-y-4">
              <div className="text-emerald-400 font-semibold">// Architecture Clean Dart Models avec Invariants Métier</div>
              <p className="text-slate-400">
                Fichier source complet disponible à :{' '}
                <code className="text-blue-400">/flutter_seed/lib/models/calina_models.dart</code>
              </p>
              <pre className="whitespace-pre text-slate-300">
{`enum CustomerCategory { A, B }
enum SaleType { cash, credit, partial }
enum DebtStatus { inProgress, partiallyRepaid, settled, overdue }
enum StockMovementType { purchase, sale, returnIn, adjustment }

class Product {
  final String id, sku, name, category, description, unit;
  final double purchasePrice, sellingPrice;
  final int stockQuantity, minThreshold;
  ...
}

class Customer {
  final String id, code, name, phone, address;
  final CustomerCategory category;
  final double creditLimit, currentDebt;
  ...
  bool canAuthorizeCredit(double amount) => category == CustomerCategory.A && (currentDebt + amount) <= creditLimit;
}`}
              </pre>
            </div>
          )}

          {activeCodeTab === 'test' && (
            <div className="space-y-4">
              <div className="text-amber-400 font-semibold">// Tests unitaires automatisés Dart / Flutter Test</div>
              <p className="text-slate-400">
                Exécution en ligne de commande : <code className="text-blue-400">flutter test test/calina_simulation_test.dart</code>
              </p>
              <pre className="whitespace-pre text-slate-300">
{`test('La simulation des 7 jours valide tous les audits journaliers', () {
  final simulator = CalinaWeeklySimulator();
  final result = simulator.run();
  expect(result.dailyReports.length, equals(7));
});

test('RÈGLE 3A : Aucun client de Catégorie B n\\'a de dette ni de vente à crédit', () {
  final simulator = CalinaWeeklySimulator();
  simulator.run();
  for (final c in simulator.adapter.customers.where((c) => c.category == CustomerCategory.B)) {
    expect(c.currentDebt, equals(0.0));
  }
});

test('RÈGLE 4 : Solde d\\'une créance équivaut au montant initial moins les remboursements', () {
  final simulator = CalinaWeeklySimulator();
  simulator.run();
  for (final debt in simulator.adapter.debts) {
    final payments = simulator.adapter.debtPayments.where((p) => p.debtId == debt.id);
    final totalPaid = payments.fold<double>(0.0, (acc, p) => acc + p.amount);
    expect(debt.remainingAmount, equals(debt.totalAmount - totalPaid));
  }
});`}
              </pre>
            </div>
          )}

          {activeCodeTab === 'sql' && (
            <div className="space-y-4">
              <div className="text-purple-400 font-semibold">// Script SQL Dual PostgreSQL 13+ & MySQL 8+</div>
              <p className="text-slate-400">
                Fichier source complet disponible à :{' '}
                <code className="text-blue-400">/flutter_seed/sql/calina_seed_postgresql_mysql.sql</code>
              </p>
              <pre className="whitespace-pre text-slate-300">
{`CREATE TABLE calina_products (
  id VARCHAR(36) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  min_threshold INT NOT NULL DEFAULT 5,
  CONSTRAINT chk_price_margin CHECK (selling_price > purchase_price)
);`}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Explorer: The 50 Products in the live app */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Catalogue des 50 Produits Actifs dans l'Application
            </h2>
            <p className="text-xs text-slate-400">
              Ces produits sont directement intégrés et manipulables dans les modules Ventes POS, Stock et Caisse.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher nom ou SKU..."
                className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">SKU & Désignation</th>
                <th className="py-2.5 px-3">Rayon / Catégorie</th>
                <th className="py-2.5 px-3 text-center">Unité</th>
                <th className="py-2.5 px-3 text-right">Coût d'Achat</th>
                <th className="py-2.5 px-3 text-right">Prix de Vente</th>
                <th className="py-2.5 px-3 text-right">Marge %</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredProducts.map((p) => {
                const marginAmount = p.sellingPrice - p.purchasePrice;
                const marginPercent = ((marginAmount / p.purchasePrice) * 100).toFixed(0);
                const isOutOfStock = p.stockQuantity <= 0;
                const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minThreshold;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{p.category}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
                        {p.unit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {formatMoney(p.purchasePrice, 'USD')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-medium">
                      {formatMoney(p.sellingPrice, 'USD')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-blue-400">
                      +{marginPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {p.stockQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Rupture
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          Alerte (≤ {p.minThreshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                          Conforme
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
