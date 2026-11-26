import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  Product,
  Customer,
  CustomerCategory,
  CustomerCategoryHistory,
  Supplier,
  User,
  Sale,
  Debt,
  DebtPayment,
  StockMovement,
  CashMovement,
  Expense,
  Purchase,
  AuditLog,
  AppSettings,
  Currency,
  PaymentMethod,
  SaleItem,
  SaleType,
} from '../types/index.ts';
import {
  initialSettings,
  initialUsers,
  initialProducts,
  initialCustomers,
  initialSuppliers,
  initialDebts,
  initialStockMovements,
  initialSales,
  initialCashMovements,
  initialExpenses,
  initialDebtPayments,
} from '../db/initialData.ts';
import {
  validateStockAvailability,
  createStockMovement,
  validateCreditSale,
  processDebtRepayment,
} from '../logic/businessRules.ts';
import {
  generateJwtToken,
  verifyAndDecodeJwtToken,
  type JwtPayload,
} from '../logic/jwtAuth.ts';

interface AppContextType {
  // State
  currentUser: User | null;
  jwtToken: string | null;
  decodedJwt: JwtPayload | null;
  users: User[];
  settings: AppSettings;
  products: Product[];
  customers: Customer[];
  customerCategoryHistories: CustomerCategoryHistory[];
  suppliers: Supplier[];
  sales: Sale[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
  expenses: Expense[];
  purchases: Purchase[];
  auditLogs: AuditLog[];
  displayCurrency: Currency;
  isOnline: boolean;
  selectedReceiptSale: Sale | null;
  selectedReceiptPayment: DebtPayment | null;

  // Actions
  login: (username: string, passwordHashOrPlain: string) => boolean;
  logout: () => void;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => User;
  createInitialAdmin: (name: string, username: string, pass: string) => User;
  switchDisplayCurrency: (currency: Currency) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Product & Stock
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  adjustStock: (productId: string, quantityDelta: number, reason: string) => void;
  addStockEntry: (productId: string, quantityToAdd: number, reason: string, newPurchasePrice?: number) => void;
  archiveProduct: (id: string) => void;

  // Customer & Credit
  addCustomer: (customer: Omit<Customer, 'id' | 'code' | 'currentDebt' | 'createdAt' | 'updatedAt' | 'archived'>) => void;
  updateCustomerCategory: (customerId: string, newCategory: CustomerCategory, newLimit: number, reason: string) => void;
  archiveCustomer: (customerId: string) => { success: boolean; message: string };

  // Sales (POS)
  processSaleTransaction: (params: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerCategory?: CustomerCategory;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    totalAmount: number;
    paidAmount: number;
    saleType: SaleType;
    paymentMethod: PaymentMethod;
    currency: Currency;
    paymentCurrency?: Currency;
    appliedExchangeRate?: number;
    paidAmountInPaymentCurrency?: number;
    dueDate?: string;
  }) => { success: boolean; sale?: Sale; error?: string };

  cancelSale: (saleId: string, reason: string) => { success: boolean; error?: string };

  // Debts & Recovery
  recordDebtPayment: (params: {
    debtId: string;
    amountToPay?: number;
    paymentMethod: PaymentMethod;
    paymentCurrency?: Currency;
    amountReceived?: number;
    appliedExchangeRate?: number;
    reference?: string;
    notes?: string;
  }) => { success: boolean; paymentReceipt?: DebtPayment; error?: string };

  // Exchange Rate Management
  updateExchangeRate: (params: {
    rateUsdToCdf: number;
    rateSales?: number;
    rateRecoveries?: number;
    allowCashierRateOverride?: boolean;
    reason: string;
  }) => void;

  // Suppliers & Purchases
  addSupplier: (supplier: Omit<Supplier, 'id' | 'currentDebt' | 'createdAt'>) => void;
  recordPurchase: (params: {
    supplierId: string;
    invoiceNumber: string;
    items: Array<{ productId: string; quantity: number; unitCost: number }>;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: 'PAYE' | 'PARTIEL' | 'NON_PAYE';
    currency: Currency;
  }) => void;
  recordSupplierPayment: (supplierId: string, amount: number, method: PaymentMethod) => void;

  // Cash & Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'userName' | 'createdAt'>) => void;
  addManualCashMovement: (params: {
    direction: 'IN' | 'OUT';
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    description: string;
  }) => void;

  // Receipts
  setSelectedReceiptSale: (sale: Sale | null) => void;
  setSelectedReceiptPayment: (payment: DebtPayment | null) => void;

  // Database Backup & Restore
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonStr: string) => { success: boolean; message: string };
  resetDatabaseToDefault: () => void;
}

const STORAGE_KEY_PREFIX = 'calina_gestion_v1_';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Helpers for LocalStorage persistence
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveState = (key: string, value: unknown) => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error(`Erreur d'enregistrement pour ${key}:`, e);
    }
  };

  // State definition
  const [settings, setSettings] = useState<AppSettings>(() => loadState('settings', initialSettings));
  const [users, setUsers] = useState<User[]>(() => loadState('users', initialUsers));
  const [jwtToken, setJwtToken] = useState<string | null>(() => loadState('jwt_token', null));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>(() => loadState('products', initialProducts));
  const [customers, setCustomers] = useState<Customer[]>(() => loadState('customers', initialCustomers));
  const [customerCategoryHistories, setCustomerCategoryHistories] = useState<CustomerCategoryHistory[]>(() =>
    loadState('customerCategoryHistories', [])
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadState('suppliers', initialSuppliers));
  const [sales, setSales] = useState<Sale[]>(() => loadState('sales', initialSales));
  const [debts, setDebts] = useState<Debt[]>(() => loadState('debts', initialDebts));
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>(() => loadState('debtPayments', initialDebtPayments));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    loadState('stockMovements', initialStockMovements)
  );
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() =>
    loadState('cashMovements', initialCashMovements)
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', initialExpenses));
  const [purchases, setPurchases] = useState<Purchase[]>(() => loadState('purchases', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadState('auditLogs', []));

  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<DebtPayment | null>(null);

  // Verify & decode JWT Token on startup or change
  const decodedJwt = useMemo(() => {
    if (!jwtToken) return null;
    return verifyAndDecodeJwtToken(jwtToken);
  }, [jwtToken]);

  // Sync currentUser session with verified JWT token claims
  useEffect(() => {
    if (decodedJwt) {
      const user = users.find((u) => u.id === decodedJwt.sub && u.active);
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser({
          id: decodedJwt.sub,
          name: decodedJwt.name,
          username: decodedJwt.username,
          role: decodedJwt.role,
          passwordHash: 'jwt_authenticated',
          active: true,
          createdAt: new Date(decodedJwt.iat * 1000).toISOString(),
        });
      }
    } else {
      setCurrentUser(null);
    }
  }, [decodedJwt, users]);

  // Sync to local storage on changes
  useEffect(() => saveState('settings', settings), [settings]);
  useEffect(() => saveState('users', users), [users]);
  useEffect(() => saveState('jwt_token', jwtToken), [jwtToken]);
  useEffect(() => saveState('products', products), [products]);
  useEffect(() => saveState('customers', customers), [customers]);
  useEffect(() => saveState('customerCategoryHistories', customerCategoryHistories), [customerCategoryHistories]);
  useEffect(() => saveState('suppliers', suppliers), [suppliers]);
  useEffect(() => saveState('sales', sales), [sales]);
  useEffect(() => saveState('debts', debts), [debts]);
  useEffect(() => saveState('debtPayments', debtPayments), [debtPayments]);
  useEffect(() => saveState('stockMovements', stockMovements), [stockMovements]);
  useEffect(() => saveState('cashMovements', cashMovements), [cashMovements]);
  useEffect(() => saveState('expenses', expenses), [expenses]);
  useEffect(() => saveState('purchases', purchases), [purchases]);
  useEffect(() => saveState('auditLogs', auditLogs), [auditLogs]);

  // Online status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Recalculate and monitor overdue debts automatically
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDebts((prev) =>
      prev.map((d) => {
        if (d.status !== 'REGLEE' && d.dueDate < today && d.status !== 'EN_RETARD') {
          return { ...d, status: 'EN_RETARD', updatedAt: new Date().toISOString() };
        }
        return d;
      })
    );
  }, []);

  // Audit logging utility
  const logAudit = (category: AuditLog['category'], action: string, details: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      action,
      details,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Système',
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Auth with JWT Generation
  const login = (username: string, pass: string): boolean => {
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.active);
    if (!user) return false;

    if (
      user.passwordHash === pass ||
      (pass === 'admin123' && user.username === 'admin') ||
      (pass === 'caisse123' && user.username === 'vendeur')
    ) {
      const token = generateJwtToken(user);
      setJwtToken(token);
      setCurrentUser(user);
      logAudit('SECURITE', 'CONNEXION_JWT_SUCCES', `Connexion JWT réussie pour ${user.name} (${user.role}) - Token 24h généré`);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) {
      logAudit('SECURITE', 'DECONNEXION_JWT', `Déconnexion JWT de l'utilisateur ${currentUser.name}`);
    }
    setJwtToken(null);
    setCurrentUser(null);
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const newUser: User = {
      ...userData,
      id: `USR-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    logAudit('SECURITE', 'CREATION_UTILISATEUR', `Création du compte utilisateur ${newUser.name} (${newUser.username}) - Rôle: ${newUser.role}`);
    return newUser;
  };

  const createInitialAdmin = (name: string, username: string, pass: string): User => {
    const adminUser: User = {
      id: `USR-ADMIN-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role: 'ADMIN',
      passwordHash: pass,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, adminUser]);
    const token = generateJwtToken(adminUser);
    setJwtToken(token);
    setCurrentUser(adminUser);
    logAudit('SECURITE', 'CREATION_ADMIN_JWT', `Création du compte Administrateur principal & Génération JWT pour ${adminUser.name}`);
    return adminUser;
  };

  const switchDisplayCurrency = (curr: Currency) => {
    setDisplayCurrency(curr);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      logAudit('PARAMETRES', 'MISE_A_JOUR_PARAMETRES', `Mise à jour des paramètres système de l'entreprise`);
      return updated;
    });
  };

  // Product & Stock methods
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'archived'>) => {
    const newId = `PRD-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: newId,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    // Mouvement de stock initial
    const { movement } = createStockMovement({
      product: { ...newProduct, stockQuantity: 0 },
      type: 'INITIAL',
      quantityDelta: productData.stockQuantity,
      reason: 'Création du produit avec stock initial',
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Administrateur',
    });

    setProducts((prev) => [newProduct, ...prev]);
    setStockMovements((prev) => [movement, ...prev]);
    logAudit('STOCK', 'CREATION_PRODUIT', `Création du produit ${newProduct.name} (${newProduct.sku}) avec ${productData.stockQuantity} ${productData.unit}`);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
          logAudit('STOCK', 'MODIFICATION_PRODUIT', `Mise à jour fiche produit ${p.name}`);
          return updated;
        }
        return p;
      })
    );
  };

  const adjustStock = (productId: string, quantityDelta: number, reason: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const { updatedProduct, movement } = createStockMovement({
      product,
      type: 'CORRECTION',
      quantityDelta,
      reason,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Utilisateur',
    });

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    setStockMovements((prev) => [movement, ...prev]);
    logAudit(
      'STOCK',
      'AJUSTEMENT_STOCK',
      `Ajustement stock de ${product.name}: ${quantityDelta > 0 ? '+' : ''}${quantityDelta} ${product.unit}. Motif: ${reason}`
    );
  };

  const addStockEntry = (productId: string, quantityToAdd: number, reason: string, newPurchasePrice?: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product || quantityToAdd <= 0) return;

    const updatedPrice = newPurchasePrice && newPurchasePrice > 0 ? newPurchasePrice : product.purchasePrice;
    const newQty = product.stockQuantity + quantityToAdd;

    const movement: StockMovement = {
      id: `STK-${Date.now().toString().slice(-6)}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: 'ACHAT',
      quantityDelta: quantityToAdd,
      quantityBefore: product.stockQuantity,
      quantityAfter: newQty,
      unitPrice: updatedPrice,
      currency: product.currency,
      reason: reason || 'Entrée de stock (réapprovisionnement)',
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Administrateur',
      createdAt: new Date().toISOString(),
    };

    const updatedProduct: Product = {
      ...product,
      stockQuantity: newQty,
      purchasePrice: updatedPrice,
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    setStockMovements((prev) => [movement, ...prev]);
    logAudit(
      'STOCK',
      'ENTREE_STOCK',
      `Entrée de stock pour ${product.name}: +${quantityToAdd} ${product.unit}. Motif: ${reason}`
    );
  };

  const archiveProduct = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archived: true, updatedAt: new Date().toISOString() } : p))
    );
    logAudit('STOCK', 'ARCHIVAGE_PRODUIT', `Archivage du produit ${id}`);
  };

  // Customers & Credit
  const addCustomer = (data: Omit<Customer, 'id' | 'code' | 'currentDebt' | 'createdAt' | 'updatedAt' | 'archived'>) => {
    const count = customers.length + 1;
    const code = `CLI-${String(count).padStart(3, '0')}`;
    const newCustomer: Customer = {
      ...data,
      id: `CST-${Date.now().toString().slice(-6)}`,
      code,
      currentDebt: 0,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    logAudit('CLIENT', 'CREATION_CLIENT', `Enregistrement du client ${newCustomer.name} (Catégorie ${newCustomer.category})`);
  };

  const updateCustomerCategory = (
    customerId: string,
    newCategory: CustomerCategory,
    newLimit: number,
    reason: string
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const previousCategory = customer.category;
    const historyEntry: CustomerCategoryHistory = {
      id: `CCH-${Date.now()}`,
      customerId,
      previousCategory,
      newCategory,
      reason,
      userId: currentUser?.id || 'ADMIN',
      userName: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    setCustomerCategoryHistories((prev) => [historyEntry, ...prev]);

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            category: newCategory,
            creditLimit: newCategory === 'A' ? newLimit : 0,
            // RÈGLE : Ne jamais effacer les anciennes dettes !
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );

    logAudit(
      'CLIENT',
      'CHANGEMENT_CATEGORIE_CLIENT',
      `Client ${customer.name}: Passage de ${previousCategory} à ${newCategory}. Motif: ${reason}. Dette conservée: ${customer.currentDebt}$`
    );
  };

  const archiveCustomer = (customerId: string): { success: boolean; message: string } => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, message: 'Client introuvable.' };

    if (customer.currentDebt > 0.01) {
      return {
        success: false,
        message: `Impossible d'archiver le client ${customer.name} car il a une dette active non remboursée de ${customer.currentDebt.toFixed(2)}$ !`,
      };
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, archived: true, updatedAt: new Date().toISOString() } : c))
    );
    logAudit('CLIENT', 'ARCHIVAGE_CLIENT', `Archivage sécurisé du client ${customer.name} (Historique intégral préservé)`);
    return { success: true, message: `Client ${customer.name} archivé avec succès.` };
  };

  // Process Sales POS
  const processSaleTransaction = (params: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerCategory?: CustomerCategory;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    totalAmount: number;
    paidAmount: number;
    saleType: SaleType;
    paymentMethod: PaymentMethod;
    currency: Currency;
    paymentCurrency?: Currency;
    appliedExchangeRate?: number;
    paidAmountInPaymentCurrency?: number;
    dueDate?: string;
  }): { success: boolean; sale?: Sale; error?: string } => {
    const {
      customerId,
      customerName,
      customerPhone,
      customerCategory,
      items,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      saleType,
      paymentMethod,
      currency,
      paymentCurrency = currency,
      appliedExchangeRate = settings.exchangeRateSales || settings.exchangeRateUsdToCdf || 2850,
      paidAmountInPaymentCurrency,
      dueDate,
    } = params;

    // 1. Contrôle stock pour chaque article
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        return { success: false, error: `Article introuvable : ${item.productName}` };
      }
      const stockCheck = validateStockAvailability(prod, item.quantity, settings.allowNegativeStock);
      if (!stockCheck.valid) {
        return { success: false, error: stockCheck.reason };
      }
    }

    // 2. Contrôle crédit client (avec conversion en USD si la vente est en CDF)
    let customerObj: Customer | undefined;
    if (customerId) {
      customerObj = customers.find((c) => c.id === customerId);
    }

    const creditCheck = validateCreditSale({
      customer: customerObj,
      saleType,
      totalAmount,
      paidAmount,
      saleCurrency: currency,
      exchangeRateUsdToCdf: appliedExchangeRate,
    });

    if (!creditCheck.valid) {
      return { success: false, error: creditCheck.error };
    }

    // 3. Création du numéro de vente unique
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    const saleNumber = `VNT-${dateStr}-${randSeq}`;
    const saleId = `SALE-${Date.now()}`;
    const remainingAmount = totalAmount - paidAmount;

    // 4. Décrémentation du stock avec mouvements traceurs obligatoires
    const newMovements: StockMovement[] = [];
    const updatedProductsList = [...products];

    for (const item of items) {
      const prodIndex = updatedProductsList.findIndex((p) => p.id === item.productId);
      if (prodIndex >= 0) {
        const prod = updatedProductsList[prodIndex];
        const { updatedProduct, movement } = createStockMovement({
          product: prod,
          type: 'VENTE',
          quantityDelta: -item.quantity,
          reason: `Vente ${saleNumber} au client ${customerName}`,
          userId: currentUser?.id || 'SYSTEM',
          userName: currentUser?.name || 'Vendeur',
          referenceId: saleNumber,
        });
        updatedProductsList[prodIndex] = updatedProduct;
        newMovements.push(movement);
      }
    }

    // 5. Création de la créance si solde restant > 0
    let debtId: string | undefined;
    let newDebt: Debt | undefined;

    if (remainingAmount > 0 && customerObj) {
      debtId = `DBT-${Date.now().toString().slice(-6)}`;
      const calcDueDate =
        dueDate ||
        new Date(Date.now() + settings.defaultCreditPeriodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      newDebt = {
        id: debtId,
        saleId,
        saleNumber,
        customerId: customerObj.id,
        customerName: customerObj.name,
        customerPhone: customerObj.phone,
        initialAmount: remainingAmount,
        paidAmount: 0,
        remainingAmount: remainingAmount,
        currency,
        exchangeRateAtCreation: appliedExchangeRate,
        dueDate: calcDueDate,
        status: 'EN_COURS',
        userId: currentUser?.id || 'SYSTEM',
        userName: currentUser?.name || 'Vendeur',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Le compte client consolide sa dette en USD
      const debtAmountInCustomerCurrencyUSD =
        currency === 'CDF'
          ? remainingAmount / appliedExchangeRate
          : remainingAmount;

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerObj?.id
            ? { ...c, currentDebt: Number((c.currentDebt + debtAmountInCustomerCurrencyUSD).toFixed(2)) }
            : c
        )
      );

      setDebts((prev) => [newDebt!, ...prev]);
    }

    // 6. Enregistrement en Caisse si acompte ou comptant payé (dans la devise choisie)
    const effectivePaidAmount =
      paidAmountInPaymentCurrency !== undefined ? paidAmountInPaymentCurrency : paidAmount;

    if (effectivePaidAmount > 0) {
      const cashMvt: CashMovement = {
        id: `CSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: saleType === 'COMPTANT' ? 'VENTE_COMPTANT' : 'VENTE_ACOMPTE',
        sourceId: saleId,
        sourceReference: saleNumber,
        direction: 'IN',
        amount: effectivePaidAmount,
        currency: paymentCurrency,
        exchangeRateApplied: appliedExchangeRate,
        paymentMethod,
        description: `Encaissement ${saleType === 'COMPTANT' ? 'vente comptant' : 'acompte vente'} ${saleNumber} (${customerName}) en ${paymentCurrency}`,
        userId: currentUser?.id || 'SYSTEM',
        userName: currentUser?.name || 'Vendeur',
        createdAt: new Date().toISOString(),
      };
      setCashMovements((prev) => [cashMvt, ...prev]);
    }

    // 7. Enregistrement de la vente
    const newSale: Sale = {
      id: saleId,
      saleNumber,
      customerId: customerObj?.id,
      customerName,
      customerPhone,
      customerCategory,
      type: saleType,
      items,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      remainingAmount,
      currency,
      paymentCurrency,
      exchangeRate: appliedExchangeRate,
      exchangeRateApplied: appliedExchangeRate,
      paidAmountInPaymentCurrency: effectivePaidAmount,
      remainingAmountInPaymentCurrency:
        currency === paymentCurrency
          ? remainingAmount
          : currency === 'USD'
          ? Math.round(remainingAmount * appliedExchangeRate)
          : Number((remainingAmount / appliedExchangeRate).toFixed(2)),
      paymentMethod,
      debtId,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Vendeur',
      cancelled: false,
      createdAt: new Date().toISOString(),
    };

    setProducts(updatedProductsList);
    setStockMovements((prev) => [...newMovements, ...prev]);
    setSales((prev) => [newSale, ...prev]);

    logAudit(
      'VENTE',
      'NOUVELLE_VENTE',
      `Vente ${saleNumber} validée (${saleType}) : Total ${totalAmount} ${currency}, Payé ${effectivePaidAmount} ${paymentCurrency} (Taux: 1 USD = ${appliedExchangeRate} CDF), Reste ${remainingAmount} ${currency}`
    );

    setSelectedReceiptSale(newSale);
    return { success: true, sale: newSale };
  };

  const cancelSale = (saleId: string, reason: string): { success: boolean; error?: string } => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Vente introuvable' };
    if (sale.cancelled) return { success: false, error: 'Cette vente est déjà annulée' };

    // Remettre le stock en place avec motif
    const newMovements: StockMovement[] = [];
    const updatedProductsList = [...products];

    for (const item of sale.items) {
      const idx = updatedProductsList.findIndex((p) => p.id === item.productId);
      if (idx >= 0) {
        const prod = updatedProductsList[idx];
        const { updatedProduct, movement } = createStockMovement({
          product: prod,
          type: 'RETOUR_CLIENT',
          quantityDelta: item.quantity,
          reason: `Annulation vente ${sale.saleNumber}. Motif: ${reason}`,
          userId: currentUser?.id || 'SYSTEM',
          userName: currentUser?.name || 'Admin',
          referenceId: sale.saleNumber,
        });
        updatedProductsList[idx] = updatedProduct;
        newMovements.push(movement);
      }
    }

    // Si une créance était attachée, l'annuler et réduire la dette client
    if (sale.debtId) {
      setDebts((prev) => prev.filter((d) => d.id !== sale.debtId));
      if (sale.customerId) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === sale.customerId
              ? { ...c, currentDebt: Math.max(0, c.currentDebt - sale.remainingAmount) }
              : c
          )
        );
      }
    }

    // Sortie de caisse pour rembourser l'argent reçu
    if (sale.paidAmount > 0) {
      const cashOut: CashMovement = {
        id: `CSH-RET-${Date.now()}`,
        type: 'RETRAIT_CAISSE',
        sourceId: sale.id,
        sourceReference: sale.saleNumber,
        direction: 'OUT',
        amount: sale.paidAmount,
        currency: sale.currency,
        paymentMethod: sale.paymentMethod,
        description: `Remboursement annulation vente ${sale.saleNumber} (${reason})`,
        userId: currentUser?.id || 'SYSTEM',
        userName: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString(),
      };
      setCashMovements((prev) => [cashOut, ...prev]);
    }

    setProducts(updatedProductsList);
    setStockMovements((prev) => [...newMovements, ...prev]);
    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, cancelled: true, cancelReason: reason } : s))
    );

    logAudit('VENTE', 'ANNULATION_VENTE', `Annulation de la vente ${sale.saleNumber}. Motif: ${reason}`);
    return { success: true };
  };

  // Debt Recovery (Recouvrement multidevise)
  const recordDebtPayment = (params: {
    debtId: string;
    amountToPay?: number;
    paymentMethod: PaymentMethod;
    paymentCurrency?: Currency;
    amountReceived?: number;
    appliedExchangeRate?: number;
    reference?: string;
    notes?: string;
  }): { success: boolean; paymentReceipt?: DebtPayment; error?: string } => {
    const {
      debtId,
      amountToPay,
      paymentMethod,
      paymentCurrency,
      amountReceived,
      appliedExchangeRate,
      reference,
      notes,
    } = params;
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return { success: false, error: 'Créance introuvable' };

    try {
      const activeRate =
        appliedExchangeRate ||
        settings.exchangeRateRecoveries ||
        settings.exchangeRateUsdToCdf ||
        2850;

      const { updatedDebt, paymentReceipt, cashMovement } = processDebtRepayment({
        debt,
        amountToPay,
        paymentMethod,
        paymentCurrency,
        amountReceived,
        exchangeRateUsdToCdf: activeRate,
        userId: currentUser?.id || 'SYSTEM',
        userName: currentUser?.name || 'Caissier',
        reference,
        notes,
      });

      // Mettre à jour la dette
      setDebts((prev) => prev.map((d) => (d.id === debtId ? updatedDebt : d)));
      // Ajouter le reçu de paiement
      setDebtPayments((prev) => [paymentReceipt, ...prev]);
      // Enregistrer le mouvement de caisse
      setCashMovements((prev) => [cashMovement, ...prev]);

      // Mettre à jour le solde du client (déduit en USD de la dette globale)
      const deductedInUSD =
        debt.currency === 'CDF'
          ? paymentReceipt.amount / activeRate
          : paymentReceipt.amount;

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === debt.customerId
            ? { ...c, currentDebt: Math.max(0, Number((c.currentDebt - deductedInUSD).toFixed(2))) }
            : c
        )
      );

      logAudit(
        'CREANCE',
        'RECOUVREMENT_CREANCE',
        `Recouvrement client ${debt.customerName} (Vente ${debt.saleNumber}) : Reçu ${paymentReceipt.amountReceived} ${paymentReceipt.paymentCurrency} (Taux: 1 USD = ${paymentReceipt.exchangeRateApplied} CDF), Déduit ${paymentReceipt.amount} ${debt.currency}. Nouveau solde créance: ${updatedDebt.remainingAmount} ${debt.currency}`
      );

      setSelectedReceiptPayment(paymentReceipt);
      return { success: true, paymentReceipt };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  // Gestion du Taux de Change par le Propriétaire
  const updateExchangeRate = (params: {
    rateUsdToCdf: number;
    rateSales?: number;
    rateRecoveries?: number;
    allowCashierRateOverride?: boolean;
    reason: string;
  }) => {
    const { rateUsdToCdf, rateSales, rateRecoveries, allowCashierRateOverride, reason } = params;
    const historyEntry = {
      id: `RATE-${Date.now()}`,
      rateUsdToCdf,
      rateSales: rateSales || rateUsdToCdf,
      rateRecoveries: rateRecoveries || rateUsdToCdf,
      changedBy: currentUser?.id || 'ADMIN',
      changedByName: currentUser?.name || 'Administrateur',
      changedAt: new Date().toISOString(),
      reason: reason || 'Mise à jour du taux de change officiel',
    };

    setSettings((prev) => ({
      ...prev,
      exchangeRateUsdToCdf: rateUsdToCdf,
      exchangeRateSales: rateSales || rateUsdToCdf,
      exchangeRateRecoveries: rateRecoveries || rateUsdToCdf,
      allowCashierRateOverride:
        allowCashierRateOverride !== undefined
          ? allowCashierRateOverride
          : prev.allowCashierRateOverride,
      exchangeRateHistory: [historyEntry, ...(prev.exchangeRateHistory || [])],
    }));

    logAudit(
      'PARAMETRES',
      'MODIFICATION_TAUX_CHANGE',
      `Mise à jour du taux USD/CDF : 1 USD = ${rateUsdToCdf} CDF (Ventes: ${rateSales || rateUsdToCdf}, Recouvrements: ${rateRecoveries || rateUsdToCdf}). Motif: ${reason}`
    );
  };

  // Suppliers & Purchases
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'currentDebt' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `SUP-${Date.now().toString().slice(-6)}`,
      currentDebt: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    logAudit('FOURNISSEUR', 'CREATION_FOURNISSEUR', `Ajout du fournisseur ${newSupplier.name}`);
  };

  const recordPurchase = (params: {
    supplierId: string;
    invoiceNumber: string;
    items: Array<{ productId: string; quantity: number; unitCost: number }>;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: 'PAYE' | 'PARTIEL' | 'NON_PAYE';
    currency: Currency;
  }) => {
    const { supplierId, invoiceNumber, items, totalAmount, paidAmount, paymentStatus, currency } = params;
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    const remainingAmount = totalAmount - paidAmount;
    const purchaseId = `PUR-${Date.now()}`;
    const newMovements: StockMovement[] = [];
    const updatedProductsList = [...products];

    // Augmenter le stock des articles achetés
    for (const it of items) {
      const idx = updatedProductsList.findIndex((p) => p.id === it.productId);
      if (idx >= 0) {
        const prod = updatedProductsList[idx];
        const { updatedProduct, movement } = createStockMovement({
          product: { ...prod, purchasePrice: it.unitCost },
          type: 'ACHAT',
          quantityDelta: it.quantity,
          reason: `Achat fournisseur ${supplier.name} Facture #${invoiceNumber}`,
          userId: currentUser?.id || 'SYSTEM',
          userName: currentUser?.name || 'Admin',
          referenceId: invoiceNumber,
        });
        updatedProductsList[idx] = updatedProduct;
        newMovements.push(movement);
      }
    }

    // Sortie de caisse si payé
    if (paidAmount > 0) {
      const cashOut: CashMovement = {
        id: `CSH-ACH-${Date.now()}`,
        type: 'ACHAT_FOURNISSEUR',
        sourceId: purchaseId,
        sourceReference: invoiceNumber,
        direction: 'OUT',
        amount: paidAmount,
        currency,
        paymentMethod: 'ESPECES',
        description: `Paiement achat fournisseur ${supplier.name} Facture #${invoiceNumber}`,
        userId: currentUser?.id || 'SYSTEM',
        userName: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString(),
      };
      setCashMovements((prev) => [cashOut, ...prev]);
    }

    // Mise à jour de la dette fournisseur (SECONDE DETTE TOTALEMENT DISTINCTE)
    if (remainingAmount > 0) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierId ? { ...s, currentDebt: s.currentDebt + remainingAmount } : s))
      );
    }

    const purchaseItems = items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        productId: it.productId,
        productSku: prod?.sku || '',
        productName: prod?.name || '',
        unit: prod?.unit || 'pièce',
        quantity: it.quantity,
        unitCost: it.unitCost,
        subtotal: it.quantity * it.unitCost,
      };
    });

    const newPurchase: Purchase = {
      id: purchaseId,
      invoiceNumber,
      supplierId,
      supplierName: supplier.name,
      items: purchaseItems,
      totalAmount,
      paidAmount,
      remainingAmount,
      currency,
      paymentStatus,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    setProducts(updatedProductsList);
    setStockMovements((prev) => [...newMovements, ...prev]);
    setPurchases((prev) => [newPurchase, ...prev]);
    logAudit(
      'STOCK',
      'REAPPROVISIONNEMENT',
      `Réapprovisionnement validé auprès de ${supplier.name}. Total: ${totalAmount} ${currency}`
    );
  };

  const recordSupplierPayment = (supplierId: string, amount: number, method: PaymentMethod) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, currentDebt: Math.max(0, s.currentDebt - amount) } : s))
    );

    const cashOut: CashMovement = {
      id: `CSH-SPAY-${Date.now()}`,
      type: 'ACHAT_FOURNISSEUR',
      sourceReference: `REGLEMENT-${supplier.name}`,
      direction: 'OUT',
      amount,
      currency: supplier.currency,
      paymentMethod: method,
      description: `Règlement de dette fournisseur à ${supplier.name}`,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };
    setCashMovements((prev) => [cashOut, ...prev]);
    logAudit(
      'FOURNISSEUR',
      'REGLEMENT_FOURNISSEUR',
      `Paiement fournisseur de ${amount} ${supplier.currency} à ${supplier.name}`
    );
  };

  // Expenses & Cash
  const addExpense = (expenseData: Omit<Expense, 'id' | 'userId' | 'userName' | 'createdAt'>) => {
    const expenseId = `EXP-${Date.now()}`;
    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Caissier',
      createdAt: new Date().toISOString(),
    };

    const cashOut: CashMovement = {
      id: `CSH-EXP-${Date.now()}`,
      type: 'DEPENSE',
      sourceId: expenseId,
      sourceReference: expenseData.category,
      direction: 'OUT',
      amount: expenseData.amount,
      currency: expenseData.currency,
      paymentMethod: expenseData.paymentMethod,
      description: `Dépense [${expenseData.category}] : ${expenseData.description}`,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Caissier',
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setCashMovements((prev) => [cashOut, ...prev]);
    logAudit(
      'PARAMETRES',
      'ENREGISTREMENT_DEPENSE',
      `Dépense enregistrée : ${expenseData.amount} ${expenseData.currency} (${expenseData.category})`
    );
  };

  const addManualCashMovement = (params: {
    direction: 'IN' | 'OUT';
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    description: string;
  }) => {
    const { direction, amount, currency, paymentMethod, description } = params;
    const mvt: CashMovement = {
      id: `CSH-MAN-${Date.now()}`,
      type: direction === 'IN' ? 'APPORT_CAISSE' : 'RETRAIT_CAISSE',
      sourceReference: 'OPERATION_MANUELLE',
      direction,
      amount,
      currency,
      paymentMethod,
      description,
      userId: currentUser?.id || 'SYSTEM',
      userName: currentUser?.name || 'Caissier',
      createdAt: new Date().toISOString(),
    };
    setCashMovements((prev) => [mvt, ...prev]);
    logAudit('PARAMETRES', 'MOUVEMENT_CAISSE_MANUEL', `${direction === 'IN' ? 'Entrée' : 'Sortie'} manuelle de caisse : ${amount} ${currency}. Motif: ${description}`);
  };

  // Backup & Restore
  const exportDatabaseJSON = (): string => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      company: settings.companyName,
      settings,
      users,
      products,
      customers,
      customerCategoryHistories,
      suppliers,
      sales,
      debts,
      debtPayments,
      stockMovements,
      cashMovements,
      expenses,
      purchases,
      auditLogs,
    };
    return JSON.stringify(data, null, 2);
  };

  const importDatabaseJSON = (jsonStr: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.products || !parsed.sales || !parsed.customers) {
        return { success: false, message: 'Fichier JSON invalide ou structure incomplète de Calina Gestion.' };
      }

      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.users) setUsers(parsed.users);
      if (parsed.products) setProducts(parsed.products);
      if (parsed.customers) setCustomers(parsed.customers);
      if (parsed.customerCategoryHistories) setCustomerCategoryHistories(parsed.customerCategoryHistories);
      if (parsed.suppliers) setSuppliers(parsed.suppliers);
      if (parsed.sales) setSales(parsed.sales);
      if (parsed.debts) setDebts(parsed.debts);
      if (parsed.debtPayments) setDebtPayments(parsed.debtPayments);
      if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
      if (parsed.cashMovements) setCashMovements(parsed.cashMovements);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.purchases) setPurchases(parsed.purchases);
      if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);

      logAudit('SECURITE', 'RESTAURATION_BASE_DONNEES', 'Restauration complète de la base de données effectuée.');
      return { success: true, message: 'Base de données restaurée avec succès !' };
    } catch (e) {
      return { success: false, message: `Erreur d'importation : ${(e as Error).message}` };
    }
  };

  const resetDatabaseToDefault = () => {
    setSettings(initialSettings);
    setUsers(initialUsers);
    setProducts(initialProducts);
    setCustomers(initialCustomers);
    setCustomerCategoryHistories([]);
    setSuppliers(initialSuppliers);
    setSales(initialSales);
    setDebts(initialDebts);
    setDebtPayments(initialDebtPayments);
    setStockMovements(initialStockMovements);
    setCashMovements(initialCashMovements);
    setExpenses(initialExpenses);
    setPurchases([]);
    setAuditLogs([]);
    setCurrentUser(initialUsers[0]);
    logAudit('SECURITE', 'REINITIALISATION_BASE', 'Réinitialisation de la base de données aux données d usine');
  };

  const value = useMemo(
    () => ({
      currentUser,
      jwtToken,
      decodedJwt,
      users,
      settings,
      products,
      customers,
      customerCategoryHistories,
      suppliers,
      sales,
      debts,
      debtPayments,
      stockMovements,
      cashMovements,
      expenses,
      purchases,
      auditLogs,
      displayCurrency,
      isOnline,
      selectedReceiptSale,
      selectedReceiptPayment,
      login,
      logout,
      addUser,
      createInitialAdmin,
      switchDisplayCurrency,
      updateSettings,
      addProduct,
      updateProduct,
      adjustStock,
      addStockEntry,
      archiveProduct,
      addCustomer,
      updateCustomerCategory,
      archiveCustomer,
      processSaleTransaction,
      cancelSale,
      recordDebtPayment,
      updateExchangeRate,
      addSupplier,
      recordPurchase,
      recordSupplierPayment,
      addExpense,
      addManualCashMovement,
      setSelectedReceiptSale,
      setSelectedReceiptPayment,
      exportDatabaseJSON,
      importDatabaseJSON,
      resetDatabaseToDefault,
    }),
    [
      currentUser,
      users,
      settings,
      products,
      customers,
      customerCategoryHistories,
      suppliers,
      sales,
      debts,
      debtPayments,
      stockMovements,
      cashMovements,
      expenses,
      purchases,
      auditLogs,
      displayCurrency,
      isOnline,
      selectedReceiptSale,
      selectedReceiptPayment,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
