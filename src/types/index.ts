export type Currency = 'USD' | 'CDF';

export type UserRole = 'ADMIN' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  passwordHash: string; // SHA-256 hash
  active: boolean;
  createdAt: string;
}

export type UnitOfMeasure =
  | 'pièce'
  | 'sac'
  | 'barre'
  | 'kg'
  | 'mètre'
  | 'litre'
  | 'boîte'
  | 'rouleau'
  | 'paquet'
  | 'seau'
  | 'pot'
  | 'bidon'
  | 'paire'
  | 'tube';

export interface Product {
  id: string;
  sku: string; // Référence unique
  name: string;
  category: string;
  description?: string;
  unit: UnitOfMeasure;
  purchasePrice: number; // Coût d'achat unitaire (dans la devise principale)
  sellingPrice: number; // Prix de vente unitaire (dans la devise principale)
  currency: Currency;
  stockQuantity: number;
  minThreshold: number; // Seuil d'alerte minimal
  supplierId?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'ACHAT' | 'VENTE' | 'RETOUR_CLIENT' | 'RETOUR_FOURNISSEUR' | 'CORRECTION' | 'INITIAL';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: StockMovementType;
  quantityDelta: number; // positif ou négatif
  quantityBefore: number;
  quantityAfter: number;
  unitPrice: number;
  currency: Currency;
  reason: string; // Obligatoire pour correction/audit
  referenceId?: string; // id de la vente, de l'achat ou de l'audit
  userId: string;
  userName: string;
  createdAt: string;
}

export type CustomerCategory = 'A' | 'B'; // A = Autorisé au crédit, B = Comptant seulement

export interface Customer {
  id: string;
  code: string; // Ex: CLI-001
  name: string;
  phone: string;
  address?: string;
  category: CustomerCategory;
  creditLimit: number; // Plafond maximal autorisé (en USD)
  currentDebt: number; // Solde dû actuel calculé dynamiquement
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCategoryHistory {
  id: string;
  customerId: string;
  previousCategory: CustomerCategory;
  newCategory: CustomerCategory;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export type PaymentMethod = 'ESPECES' | 'AIRTEL_MONEY' | 'M_PESA' | 'ORANGE_MONEY' | 'BANQUE' | 'MIXTE';

export type SaleType = 'COMPTANT' | 'PARTIEL' | 'CREDIT';

export interface SaleItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitCost: number; // Coût d'achat unitaire au moment de la vente pour calcul de marge
  unitPrice: number; // Prix de vente unitaire
  discount: number; // Remise unitaire
  subtotal: number;
  currency: Currency;
}

export interface Sale {
  id: string;
  saleNumber: string; // Ex: VNT-202610-0001
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerCategory?: CustomerCategory;
  type: SaleType;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paidAmountUsd?: number; // Montant réellement encaissé en USD ($)
  paidAmountCdf?: number; // Montant réellement encaissé en CDF (FC)
  remainingAmount: number; // Dette générée
  currency: Currency; // Devise de référence de la transaction
  paymentCurrency?: Currency; // Devise effectivement choisie par le caissier pour le paiement (USD ou CDF)
  exchangeRate: number; // Taux de change au moment de la transaction (ex: 2850 CDF/USD)
  exchangeRateApplied?: number; // Taux exact appliqué
  paidAmountInPaymentCurrency?: number; // Montant payé dans la devise de paiement
  remainingAmountInPaymentCurrency?: number; // Montant restant exprimé dans la devise de paiement
  paymentMethod: PaymentMethod;
  debtId?: string;
  userId: string;
  userName: string;
  cancelled: boolean;
  cancelReason?: string;
  createdAt: string;
}

export type DebtStatus = 'EN_COURS' | 'PARTIELLEMENT_REGLEE' | 'REGLEE' | 'EN_RETARD';

export interface Debt {
  id: string;
  saleId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  initialAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: Currency;
  exchangeRateAtCreation?: number;
  dueDate: string; // Date d'échéance
  status: DebtStatus;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  receiptNumber: string; // Ex: REC-202610-0001
  debtId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  debtInitialAmount?: number; // Montant initial de la créance d'origine
  debtPreviousPaidAmount?: number; // Montant déjà remboursé avant ce paiement
  amount: number; // Montant déduit de la créance (en devise de la créance)
  currency: Currency; // Devise de référence de la créance
  paymentCurrency?: Currency; // Devise effectivement reçue lors du recouvrement (USD ou CDF)
  amountReceived?: number; // Montant effectivement reçu en caisse
  exchangeRateApplied?: number; // Taux de change appliqué au moment du paiement
  remainingBalanceAfter?: number; // Solde restant après encaissement
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  currentDebt: number; // Ce que Calina doit à ce fournisseur
  currency: Currency;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export type PurchasePaymentStatus = 'PAYE' | 'PARTIEL' | 'NON_PAYE';

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: Currency;
  paymentStatus: PurchasePaymentStatus;
  userId: string;
  userName: string;
  createdAt: string;
}

export type CashMovementType = 'VENTE_COMPTANT' | 'VENTE_ACOMPTE' | 'RECOUVREMENT_CREANCE' | 'DEPENSE' | 'ACHAT_FOURNISSEUR' | 'APPORT_CAISSE' | 'RETRAIT_CAISSE';

export interface CashMovement {
  id: string;
  type: CashMovementType;
  sourceId?: string; // id de la vente, du recouvrement ou de l'achat
  sourceReference: string; // Ex: "VNT-001" ou "REC-001"
  direction: 'IN' | 'OUT'; // Entrée ou Sortie
  amount: number;
  currency: Currency;
  exchangeRateApplied?: number; // Taux appliqué lors de l'opération
  paymentMethod: PaymentMethod;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: 'LOYER' | 'TRANSPORT' | 'SALAIRES' | 'ELECTRICITE' | 'TAXES' | 'ENTRETIEN' | 'AUTRES';
  description: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'SECURITE' | 'STOCK' | 'VENTE' | 'CREANCE' | 'CLIENT' | 'PARAMETRES' | 'FOURNISSEUR';
  details: string;
  userId: string;
  userName: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ExchangeRateHistoryEntry {
  id: string;
  rateUsdToCdf: number;
  rateSales?: number;
  rateRecoveries?: number;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  reason?: string;
}

export interface AppSettings {
  companyName: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  rcm: string;
  idNat: string;
  primaryCurrency: Currency;
  secondaryCurrency: Currency;
  exchangeRateUsdToCdf: number; // Ex: 2850 (1 USD = X CDF)
  exchangeRateSales?: number; // Taux spécifique pour les ventes (si distinct)
  exchangeRateRecoveries?: number; // Taux spécifique pour les recouvrements de créance (si distinct)
  allowCashierRateOverride?: boolean; // Autoriser ou interdire aux caissiers de modifier le taux
  exchangeRateHistory?: ExchangeRateHistoryEntry[]; // Historique complet des modifications de taux
  defaultCreditPeriodDays: number; // Ex: 14 jours
  lowStockAlertDefault: number;
  receiptFooterText: string;
  allowNegativeStock: boolean;
}
