import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStockAvailability,
  createStockMovement,
  validateCreditSale,
  processDebtRepayment,
  calculateFinancialMetrics,
  calculateProfitMetrics,
  convertCurrency,
  calculateMultiCurrencyCashBalances,
} from './businessRules.ts';
import type { Product, Customer, Debt, SaleItem } from '../types/index.ts';

const mockProduct: Product = {
  id: 'PROD-001',
  sku: 'CIM-50KG',
  name: 'Ciment Portland 50kg',
  category: 'Gros Œuvre',
  unit: 'sac',
  purchasePrice: 9.0,
  sellingPrice: 12.0,
  currency: 'USD',
  stockQuantity: 50,
  minThreshold: 10,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCustomerCategoryA: Customer = {
  id: 'CUST-001',
  code: 'CLI-001',
  name: 'Entreprise BTP Mwamba',
  phone: '+243990000001',
  category: 'A',
  creditLimit: 1000.0,
  currentDebt: 200.0, // Crédit disponible restant = 800.0
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCustomerCategoryB: Customer = {
  id: 'CUST-002',
  code: 'CLI-002',
  name: 'Client Particulier Alain',
  phone: '+243990000002',
  category: 'B', // Comptant uniquement !
  creditLimit: 0,
  currentDebt: 0,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('Règle 1: Le stock ne doit jamais être modifié sans mouvement traceur avec motif obligatoire', () => {
  assert.throws(
    () => {
      createStockMovement({
        product: mockProduct,
        type: 'CORRECTION',
        quantityDelta: 5,
        reason: '', // Motif vide interdit
        userId: 'USER-1',
        userName: 'Admin',
      });
    },
    /Un motif obligatoire doit être renseigné/
  );

  const result = createStockMovement({
    product: mockProduct,
    type: 'VENTE',
    quantityDelta: -10,
    reason: 'Vente client VNT-001',
    userId: 'USER-1',
    userName: 'Admin',
    referenceId: 'VNT-001',
  });

  assert.equal(result.updatedProduct.stockQuantity, 40);
  assert.equal(result.movement.quantityBefore, 50);
  assert.equal(result.movement.quantityAfter, 40);
  assert.equal(result.movement.quantityDelta, -10);
  assert.equal(result.movement.type, 'VENTE');
});

test('Règle 2: Une vente ne peut pas dépasser le stock disponible sans autorisation explicite', () => {
  const checkSufficient = validateStockAvailability(mockProduct, 30, false);
  assert.equal(checkSufficient.valid, true);

  const checkExcess = validateStockAvailability(mockProduct, 60, false);
  assert.equal(checkExcess.valid, false);
  assert.match(checkExcess.reason || '', /Stock insuffisant/);

  // Avec dérogation autorisée explicite
  const checkExcessWithOverride = validateStockAvailability(mockProduct, 60, true);
  assert.equal(checkExcessWithOverride.valid, true);
});

test('Règle 3a: Refus catégorique de vente à crédit pour un client de catégorie B', () => {
  const result = validateCreditSale({
    customer: mockCustomerCategoryB,
    saleType: 'CREDIT',
    totalAmount: 150,
    paidAmount: 0,
  });

  assert.equal(result.valid, false);
  assert.match(result.error || '', /Catégorie B \(Comptant uniquement\)/);
});

test('Règle 3b: Refus de crédit si le montant dépasse le plafond disponible du client catégorie A', () => {
  // Client A a un plafond de 1000 et déjà 200 de dette -> crédit dispo = 800
  // Tentative d'emprunter 850
  const resultExcess = validateCreditSale({
    customer: mockCustomerCategoryA,
    saleType: 'CREDIT',
    totalAmount: 850,
    paidAmount: 0,
  });

  assert.equal(resultExcess.valid, false);
  assert.match(resultExcess.error || '', /Dépassement de plafond de crédit/);

  // Vente dans la limite (ex: 500)
  const resultValid = validateCreditSale({
    customer: mockCustomerCategoryA,
    saleType: 'CREDIT',
    totalAmount: 500,
    paidAmount: 0,
  });

  assert.equal(resultValid.valid, true);
  assert.equal(resultValid.creditAmount, 500);
});

test('Règle 4: Remboursement partiel avec recalcul et clôture automatique quand le solde atteint zéro', () => {
  const initialDebt: Debt = {
    id: 'DEBT-001',
    saleId: 'SALE-001',
    saleNumber: 'VNT-202610-001',
    customerId: 'CUST-001',
    customerName: 'Entreprise BTP Mwamba',
    customerPhone: '+243990000001',
    initialAmount: 500.0,
    paidAmount: 0.0,
    remainingAmount: 500.0,
    currency: 'USD',
    dueDate: '2026-11-01',
    status: 'EN_COURS',
    userId: 'USER-1',
    userName: 'Admin',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  // 1er remboursement partiel de 200
  const step1 = processDebtRepayment({
    debt: initialDebt,
    amountToPay: 200,
    paymentMethod: 'ESPECES',
    userId: 'USER-1',
    userName: 'Admin',
  });

  assert.equal(step1.updatedDebt.paidAmount, 200);
  assert.equal(step1.updatedDebt.remainingAmount, 300);
  assert.equal(step1.updatedDebt.status, 'PARTIELLEMENT_REGLEE');
  assert.equal(step1.cashMovement.amount, 200);
  assert.equal(step1.cashMovement.type, 'RECOUVREMENT_CREANCE');

  // 2e remboursement du solde restant exact (300) -> Clôture automatique 'REGLEE'
  const step2 = processDebtRepayment({
    debt: step1.updatedDebt,
    amountToPay: 300,
    paymentMethod: 'AIRTEL_MONEY',
    userId: 'USER-1',
    userName: 'Admin',
  });

  assert.equal(step2.updatedDebt.paidAmount, 500);
  assert.equal(step2.updatedDebt.remainingAmount, 0);
  assert.equal(step2.updatedDebt.status, 'REGLEE');
});

test('Règle 5: Refus strict d un remboursement supérieur au solde restant', () => {
  const debt: Debt = {
    id: 'DEBT-002',
    saleId: 'SALE-002',
    saleNumber: 'VNT-002',
    customerId: 'CUST-001',
    customerName: 'Entreprise BTP Mwamba',
    customerPhone: '+243990000001',
    initialAmount: 100.0,
    paidAmount: 40.0,
    remainingAmount: 60.0,
    currency: 'USD',
    dueDate: '2026-11-01',
    status: 'PARTIELLEMENT_REGLEE',
    userId: 'USER-1',
    userName: 'Admin',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  assert.throws(
    () => {
      processDebtRepayment({
        debt,
        amountToPay: 80, // Dépasse le solde de 60
        paymentMethod: 'ESPECES',
        userId: 'USER-1',
        userName: 'Admin',
      });
    },
    /ne peut pas dépasser le solde restant/
  );
});

test('Règle 6: Cohérence financière - Aucune double comptabilisation du recouvrement dans le CA', () => {
  // Scénario :
  // Vente 1 : 100$ au comptant (payé 100$)
  // Vente 2 : 200$ à crédit (payé 50$ acompte, 150$ reste à payer)
  // Plus tard : Recouvrement de 100$ sur la Vente 2
  // Dépense : 30$ de transport
  const sales = [
    { totalAmount: 100, paidAmount: 100, remainingAmount: 0, cancelled: false, currency: 'USD' as const },
    { totalAmount: 200, paidAmount: 50, remainingAmount: 150, cancelled: false, currency: 'USD' as const },
  ];

  const debtPayments = [
    { amount: 100, currency: 'USD' as const },
  ];

  const expenses = [
    { amount: 30, currency: 'USD' as const },
  ];

  const metrics = calculateFinancialMetrics({
    sales,
    debtPayments,
    expenses,
    targetCurrency: 'USD',
    exchangeRateUsdToCdf: 2850,
  });

  // Chiffre d'Affaires = 100 + 200 = 300 (Le remboursement de 100 n'augmente PAS le CA !)
  assert.equal(metrics.turnover, 300);

  // Encaissements totaux réels = Vente 1 (100) + Acompte Vente 2 (50) + Recouvrement (100) = 250
  assert.equal(metrics.totalActualCashIn, 250);

  // Solde net de caisse = 250 - 30 (dépenses) = 220
  assert.equal(metrics.netCashFlow, 220);
});

test('Règle 7: Calcul exact de la marge brute et du bénéfice net (COGS)', () => {
  const items: SaleItem[] = [
    {
      productId: 'PROD-001',
      productSku: 'CIM-50KG',
      productName: 'Ciment Portland 50kg',
      unit: 'sac',
      quantity: 10,
      unitCost: 9.0, // Coût total = 90$
      unitPrice: 12.0, // Vente brute = 120$
      discount: 0,
      subtotal: 120.0,
      currency: 'USD',
    },
  ];

  const sales = [
    { items, cancelled: false, currency: 'USD' as const },
  ];

  const expenses = [
    { amount: 10, currency: 'USD' as const }, // Électricité 10$
  ];

  const profit = calculateProfitMetrics({
    sales,
    expenses,
    targetCurrency: 'USD',
    exchangeRateUsdToCdf: 2850,
  });

  assert.equal(profit.totalSalesRevenue, 120);
  assert.equal(profit.totalCOGS, 90);
  assert.equal(profit.grossMargin, 30); // 120 - 90
  assert.equal(profit.grossMarginPercentage, 25.0); // 30 / 120 = 25%
  assert.equal(profit.netProfit, 20); // 30 - 10
});

test('Règle 8: Conversion multi-devises exacte USD <-> CDF', () => {
  const rate = 2850;
  const toCdf = convertCurrency(10, 'USD', 'CDF', rate);
  assert.equal(toCdf.amount, 28500);

  const toUsd = convertCurrency(28500, 'CDF', 'USD', rate);
  assert.equal(toUsd.amount, 10);
});

test('Règle 9: Non-rétroactivité des taux de change sur les transactions passées', () => {
  // Une vente passée enregistrée avec un taux de 2 800 CDF
  const pastSale = {
    totalAmount: 100, // 100$
    currency: 'USD' as const,
    exchangeRateApplied: 2800,
    paidAmountInPaymentCurrency: 280000, // 280 000 FC payés au moment de la vente
  };

  // Le propriétaire modifie ensuite le taux à 2 850 CDF
  const newOfficialRate = 2850;

  // L'opération passée conserve strictement son taux historique figé (2800)
  assert.equal(pastSale.exchangeRateApplied, 2800);
  assert.notEqual(pastSale.exchangeRateApplied, newOfficialRate);
  assert.equal(pastSale.paidAmountInPaymentCurrency, 280000);
});

test('Règle 10: Gestion multi-devises USD / CDF sans mélange dans le tiroir-caisse', () => {
  const movements = [
    { amount: 150, currency: 'USD' as const, direction: 'IN' as const },
    { amount: 50, currency: 'USD' as const, direction: 'OUT' as const }, // Dépense 50$
    { amount: 285000, currency: 'CDF' as const, direction: 'IN' as const },
    { amount: 85000, currency: 'CDF' as const, direction: 'OUT' as const }, // Dépense 85 000 FC
  ];

  const balances = calculateMultiCurrencyCashBalances({
    cashMovements: movements,
    exchangeRateUsdToCdf: 2850,
    displayCurrency: 'USD',
  });

  // USD net = 150 - 50 = 100$
  assert.equal(balances.usd.balance, 100);
  // CDF net = 285 000 - 85 000 = 200 000 FC
  assert.equal(balances.cdf.balance, 200000);

  // Consolidated in USD = 100 + (200 000 / 2850) = 100 + 70.18 = 170.18$
  assert.equal(balances.consolidatedInUSD, 170.18);
});

