import React, { useState } from 'react';
import {
  Smartphone,
  Database,
  Shield,
  Layers,
  Server,
  Code,
  FileCode,
  CheckCircle,
  Cpu,
  Copy,
  BookOpen,
  Terminal,
  RefreshCcw,
} from 'lucide-react';

export const ArchitectureDocView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    'ARCHI' | 'SQL' | 'FLUTTER' | 'SECURITY' | 'DEPLOY'
  >('ARCHI');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
            Dossier d'Ingénierie & Spécifications Officielles
          </span>
          <span className="text-xs text-slate-400">Équipe d'Experts Calina Gestion</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white">
          Architecture Logicielle, Base de Données & Flutter Android
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
          Rapport complet rédigé par l'architecte logiciel, le développeur mobile Flutter senior, le spécialiste des bases de données et l'expert en cybersécurité pour la <strong>Quincaillerie Calina</strong>.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSection('ARCHI')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSection === 'ARCHI'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Architecture & Justification</span>
        </button>

        <button
          onClick={() => setActiveSection('SQL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSection === 'SQL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>2. Schéma SQL & Migrations</span>
        </button>

        <button
          onClick={() => setActiveSection('FLUTTER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSection === 'FLUTTER'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>3. Code Flutter (Dart) & Drift</span>
        </button>

        <button
          onClick={() => setActiveSection('SECURITY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSection === 'SECURITY'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>4. Sécurité & Contrôle Métier</span>
        </button>

        <button
          onClick={() => setActiveSection('DEPLOY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
            activeSection === 'DEPLOY'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>5. Compilation APK & Déploiement</span>
        </button>
      </div>

      {/* Section 1: Architecture Recommendation */}
      {activeSection === 'ARCHI' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-slate-300 text-xs leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Recommandation de l'Architecte Logiciel : Modèle « Offline-First » Hybride</span>
            </h3>
            <p>
              Pour une société commerciale comme la <strong>Quincaillerie Calina</strong> opérant en République Démocratique du Congo (RDC) ou en Afrique Centrale avec des réseaux Internet mobiles (3G/4G/Fibre) sujets à des coupures fréquentes, <strong>l'architecture « Offline-First » (Local-First) avec synchronisation bidirectionnelle transactionnelle est l'unique choix viable</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <div className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Base Locale Embarquée</span>
              </div>
              <p className="text-slate-400">
                Sur chaque smartphone Android : <strong>SQLite via Drift (Flutter)</strong> ou IndexedDB (PWA). Permet aux vendeurs de scanner les articles, encaisser les ventes comptant et éditer les reçus même pendant une coupure totale d'Internet ou de courant électrique.
              </p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <div className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-400" />
                <span>Base Centrale Sécurisée</span>
              </div>
              <p className="text-slate-400">
                Serveur Cloud ou Serveur Local Magasin sous <strong>PostgreSQL</strong>. Héberge l'autorité suprême de consolidation, le registre inviolable d'audit et les sauvegardes chiffrées automatiques quotidiennes.
              </p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <div className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
                <RefreshCcw className="w-4 h-4 text-amber-400" />
                <span>Moteur de Synchronisation</span>
              </div>
              <p className="text-slate-400">
                Queue d'opérations hors-ligne persistée (Outbox pattern). Les transactions locales reçoivent un UUID v4 déterministe. Dès que la connexion revient, les opérations sont envoyées avec horodatage vectoriel pour éliminer tout risque de doublon.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
            <h4 className="font-bold text-white text-sm">Gestion des Conflits de Stock en Multi-Appareils</h4>
            <p>
              <strong>Hypothèse retenue :</strong> Si deux vendeurs vendent le même article simultanément en mode hors-ligne sans connexion mutuelle, le système n'écrase jamais le stock absolu de l'autre. Chaque appareil émet un delta relatif (ex: <code>quantityDelta = -5</code>) consigné dans la table <code>stock_movements</code>. Le stock central consolidé est calculé par la somme des deltas validés. En cas de dépassement exceptionnel post-synchronisation, une alerte immédiate est notifiée au Propriétaire avec la traçabilité des deux ventes concernées.
            </p>
          </div>
        </div>
      )}

      {/* Section 2: Relational SQL Schema & Migrations */}
      {activeSection === 'SQL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <span>Structure de la Base de Données Relationnelle (PostgreSQL / SQLite)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Tables, contraintes d'intégrité, contraintes CHECK et clés étrangères
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(SQL_SCHEMA, 'sql')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey === 'sql' ? 'Copié !' : 'Copier SQL'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 leading-relaxed max-h-[60vh]">
            {SQL_SCHEMA}
          </pre>
        </div>
      )}

      {/* Section 3: Flutter & Dart Architecture */}
      {activeSection === 'FLUTTER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <span>Code Dart Flutter & Définition de Table Drift</span>
              </h3>
              <p className="text-xs text-slate-400">
                Architecture Clean & Modèles pour application native Android
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(FLUTTER_DART_CODE, 'dart')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey === 'dart' ? 'Copié !' : 'Copier Dart'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-[11px] font-mono text-blue-300 leading-relaxed max-h-[60vh]">
            {FLUTTER_DART_CODE}
          </pre>
        </div>
      )}

      {/* Section 4: Security Matrix */}
      {activeSection === 'SECURITY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 text-xs text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Matrice de Cybersécurité & Protection Financière Calina</span>
          </h3>

          <div className="space-y-3">
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
              <h4 className="font-bold text-white text-sm mb-1">1. Hachage des Mots de Passe & Authentification</h4>
              <p>
                Aucun mot de passe n'est stocké en texte clair. Utilisation du standard <strong>Argon2id</strong> ou <strong>PBKDF2 avec SHA-256 et sel cryptographique aléatoire de 32 octets</strong>. Les sessions locales sont sécurisées via <code>flutter_secure_storage</code> (qui utilise Android Keystore matériel sur le téléphone).
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
              <h4 className="font-bold text-white text-sm mb-1">2. Séparation Stricte des Rôles (RBAC)</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><strong>Administrateur / Propriétaire</strong> : Configuration du magasin, fixation et modification des prix de vente, attribution et révision des plafonds de crédit, approbation des dérogations exceptionnelles, accès aux marges et bénéfices réels, export des sauvegardes.</li>
                <li><strong>Vendeur / Caissier</strong> : Saisie des ventes, encaissements comptant et acomptes, émission des tickets de caisse, enregistrement des nouveaux clients (catégorie B par défaut). <em>Interdiction absolue de modifier les prix, d'accorder du crédit à un client de catégorie B, de supprimer des lignes d'historique ou de masquer un écart de caisse.</em></li>
              </ul>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700">
              <h4 className="font-bold text-white text-sm mb-1">3. Inviolabilité de l'Audit Trail</h4>
              <p>
                Chaque opération sensible (vente annulée, ajustement manuel de stock, passage d'un client en catégorie A, remboursement de créance) génère une entrée immuable dans <code>audit_logs</code> contenant l'ID de l'utilisateur, son nom, l'horodatage précis à la milliseconde et le motif obligatoire.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Deployment Guide */}
      {activeSection === 'DEPLOY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 text-xs text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <span>Instructions de Compilation Android APK & Déploiement</span>
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-white text-sm mb-1">Compilation Native Flutter (APK Android)</h4>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
                <div># 1. Vérifier l'environnement Android</div>
                <div>flutter doctor</div>
                <div className="pt-1"># 2. Installer les dépendances Dart</div>
                <div>flutter pub get</div>
                <div className="pt-1"># 3. Générer le code Drift SQLite</div>
                <div>dart run build_runner build --delete-conflicting-outputs</div>
                <div className="pt-1"># 4. Compiler l'APK de production autonome (sans serveur nécessaire au départ)</div>
                <div>flutter build apk --release --split-per-abi</div>
                <div className="text-slate-400 text-[10px] pt-1">
                  ➔ L'APK optimisé se trouvera dans : <code>build/app/outputs/flutter-apk/app-arm64-v8a-release.apk</code>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm mb-1">Déploiement PWA Immédiat (Sur vos téléphones dès aujourd'hui)</h4>
              <p>
                Cette application web fonctionne déjà comme une Progressive Web App (PWA) de production. Vous pouvez l'installer instantanément sur n'importe quel smartphone Android :
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-300">
                <li>Ouvrez l'application dans Chrome sur votre smartphone Android.</li>
                <li>Appuyez sur la bannière bleue <strong>« Installer l'App »</strong> ou sur le menu Chrome (3 points) ➔ <em>« Ajouter à l'écran d'accueil »</em>.</li>
                <li>L'icône Calina s'affiche sur votre téléphone et démarre en plein écran, sans barre d'adresse et avec fonctionnement hors-ligne actif.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SQL_SCHEMA = `-- ========================================================
-- SCHEMA RELATIONNEL CALINA GESTION (PostgreSQL / SQLite)
-- Societe : Quincaillerie Calina
-- ========================================================

-- 1. Table Utilisateurs & Securite
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CASHIER')),
    password_hash VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table Fournisseurs
CREATE TABLE suppliers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    current_debt NUMERIC(15, 2) DEFAULT 0.00 CHECK (current_debt >= 0),
    currency VARCHAR(5) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table Produits & Stock
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    unit VARCHAR(30) NOT NULL, -- piece, sac, barre, kg, etc.
    purchase_price NUMERIC(15, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(15, 2) NOT NULL CHECK (selling_price >= purchase_price),
    currency VARCHAR(5) DEFAULT 'USD',
    stock_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    min_threshold NUMERIC(15, 2) NOT NULL DEFAULT 5.00,
    supplier_id VARCHAR(36) REFERENCES suppliers(id),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Registre Inviolable des Mouvements de Stock
CREATE TABLE stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('ACHAT', 'VENTE', 'RETOUR_CLIENT', 'RETOUR_FOURNISSEUR', 'CORRECTION', 'INITIAL')),
    quantity_delta NUMERIC(15, 2) NOT NULL,
    quantity_before NUMERIC(15, 2) NOT NULL,
    quantity_after NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'USD',
    reason TEXT NOT NULL, -- OBLIGATOIRE
    reference_id VARCHAR(50),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table Clients & Autorisation de Credit
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    category CHAR(1) NOT NULL CHECK (category IN ('A', 'B')),
    credit_limit NUMERIC(15, 2) DEFAULT 0.00 CHECK (credit_limit >= 0),
    current_debt NUMERIC(15, 2) DEFAULT 0.00 CHECK (current_debt >= 0),
    notes TEXT,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Historique Trace des Changements de Categorie Client
CREATE TABLE customer_category_history (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
    previous_category CHAR(1) NOT NULL,
    new_category CHAR(1) NOT NULL,
    reason TEXT NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table des Ventes
CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(36) REFERENCES customers(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('COMPTANT', 'PARTIEL', 'CREDIT')),
    subtotal NUMERIC(15, 2) NOT NULL,
    discount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) NOT NULL,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'USD',
    exchange_rate NUMERIC(15, 4) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    cancelled BOOLEAN DEFAULT FALSE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Lignes de Vente (Articles)
CREATE TABLE sale_items (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(15, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'USD'
);

-- 9. Table des Creances Clients (Module Prioritaire)
CREATE TABLE debts (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL REFERENCES sales(id),
    sale_number VARCHAR(50) NOT NULL,
    customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    initial_amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),
    currency VARCHAR(5) DEFAULT 'USD',
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('EN_COURS', 'PARTIELLEMENT_REGLEE', 'REGLEE', 'EN_RETARD')),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Table des Recouvrements (Remboursements de Creance)
CREATE TABLE debt_payments (
    id VARCHAR(36) PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    debt_id VARCHAR(36) NOT NULL REFERENCES debts(id),
    customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(5) DEFAULT 'USD',
    payment_method VARCHAR(30) NOT NULL,
    reference VARCHAR(100),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Mouvements de Caisse Raccordes a leur Source
CREATE TABLE cash_movements (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    source_reference VARCHAR(50) NOT NULL,
    direction VARCHAR(5) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(5) DEFAULT 'USD',
    payment_method VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

const FLUTTER_DART_CODE = `// ========================================================
// CALINA GESTION - FLUTTER MOBILE ARCHITECTURE (DART)
// Package: com.quincaillerie.calina
// ========================================================

import 'package:drift/drift.dart';
import 'dart:io';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'app_database.g.dart';

// Definition de la Table Produits en SQLite local avec Drift
class ProductsTable extends Table {
  TextColumn get id => text()();
  TextColumn get sku => text().unique()();
  TextColumn get name => text()();
  TextColumn get category => text()();
  TextColumn get unit => text()(); // piece, sac, barre, kg
  RealColumn get purchasePrice => real()();
  RealColumn get sellingPrice => real()();
  RealColumn get stockQuantity => real()();
  RealColumn get minThreshold => real()();
  TextColumn get currency => text().withDefault(const Constant('USD'))();
  BoolColumn get archived => boolean().withDefault(const Constant(false))();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

// Definition de la Table Creances (Debts)
class DebtsTable extends Table {
  TextColumn get id => text()();
  TextColumn get saleNumber => text()();
  TextColumn get customerId => text()();
  TextColumn get customerName => text()();
  TextColumn get customerPhone => text()();
  RealColumn get initialAmount => real()();
  RealColumn get paidAmount => real().withDefault(const Constant(0.0))();
  RealColumn get remainingAmount => real()();
  DateTimeColumn get dueDate => dateTime()();
  TextColumn get status => text()(); // EN_COURS, PARTIELLEMENT_REGLEE, REGLEE, EN_RETARD
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

// Business Rules Validator en Dart pour Flutter
class CalinaBusinessValidator {
  static bool canGrantCredit({
    required String customerCategory,
    required double creditLimit,
    required double currentDebt,
    required double requestedCreditAmount,
  }) {
    // Regle 1 : Categorie B strictement interdite
    if (customerCategory != 'A') {
      return false;
    }
    // Regle 2 : Verification plafond disponible
    final availableCredit = creditLimit - currentDebt;
    return requestedCreditAmount <= availableCredit;
  }
}`;
