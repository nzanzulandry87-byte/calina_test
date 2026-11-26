# Calina POS - Solution de Gestion Commerciale, Point de Vente & Stocks

**Calina POS** est une application web progressive (PWA) et mobile performante, sécurisée et fonctionnant en mode **Offline-First**, conçue pour la gestion commerciale complète des quincailleries et commerces généraux.

---

##  Fonctionnalités Principales

- **Point de Vente (POS) & Caisse :** Encaissellements rapides, gestion du panier multi-articles, impression et génération de reçus/factures.
- **Gestion de Stock & Réapprovisionnement :** Suivi en temps réel des quantités, alertes de seuil minimal, entrées de stock et ajustements contrôlés avec journal d'audit.
- **Suivi des Crédits & Créances :** Gestion des clients par catégories (A & B), plafonds de crédit, échéanciers et historique des remboursements.
- **Caisse & Dépenses :** Gestion des flux d'espèces, comptage de fond de caisse, suivi des charges d'exploitation.
- **Gestion des Utilisateurs & Sécurité :** Contrôle d'accès basé sur les rôles (`ADMIN` et `CASHIER`), authentification sécurisée et premier démarrage contrôlé.
- **Multi-devises & Taux de Change :** Prise en charge native USD / CDF avec conversion dynamique et historique des taux.
- **Offline-First & PWA :** Fonctionne sans connexion Internet directe avec synchronisation locale et installation PWA / APK.

---

## 🛠 Stack Technique

- **Front-End :** React 19, TypeScript, Vite, Tailwind CSS
- **État & Stockage :** React Context API, LocalStorage (Persistance JSON)
- **Composants & Icônes :** Lucide React, Motion
- **Intégration Mobile :** Capacitor (Android / iOS)
- **PWA :** Vite Plugin PWA (Workbox Service Worker)

---

##  Installation & Démarrage Rapide

### Prérequis
- **Node.js** (v18+)
- **NPM** ou **Bun**

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancement en mode développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:3000`.

### 3. Compilation pour la production (Web & Mobile)
```bash
npm run build
```

---

##  Compilation Android (APK / AAB)

Pour générer le fichier Android `.apk` ou `.aab` pour le Google Play Store :

```bash
# 1. Compiler les assets Web
npm run build

# 2. Synchroniser les assets avec Capacitor
npx cap sync

# 3. Ouvrir le projet dans Android Studio
npx cap open android
```

Dans Android Studio : **Build > Build Bundle(s) / APK(s) > Build Bundle(s)**.

---

##  Sécurité & Premier Démarrage

Lors du premier lancement de l'application :
1. L'application détecte l'absence de compte administrateur et affiche automatiquement l'écran de **Configuration Initiale**.
2. Une fois l'Administrateur principal créé, l'accès au système est verrouillé par authentification.
3. Les administrateurs peuvent ensuite créer des comptes supplémentaires pour leurs caissiers/vendeurs depuis l'onglet **Paramètres > Gestion des Utilisateurs**.

---

##  Licence
Propriété exclusive - **Quincaillerie Calina SARL**. Tous droits réservés.
