import type {
  Product,
  Customer,
  SaleItem,
  SaleType,
  PaymentMethod,
  Currency,
  StockMovement,
  StockMovementType,
  Debt,
  DebtStatus,
  DebtPayment,
  CashMovement,
  CashMovementType,
} from '../types/index.ts';

/**
 * Règle 1 & 2 : Contrôle strict du stock disponible.
 * Renvoie un objet de résultat indiquant si la vente ou la sortie est possible.
 */
export function validateStockAvailability(
  product: Product,
  requestedQuantity: number,
  allowNegativeStock = false
): { valid: boolean; reason?: string; available: number } {
  if (requestedQuantity <= 0) {
    return { valid: false, reason: 'La quantité demandée doit être supérieure à 0.', available: product.stockQuantity };
  }

  if (product.stockQuantity < requestedQuantity && !allowNegativeStock) {
    return {
      valid: false,
      reason: `Stock insuffisant pour "${product.name}". Disponible: ${product.stockQuantity} ${product.unit}, demandé: ${requestedQuantity} ${product.unit}.`,
      available: product.stockQuantity,
    };
  }

  return { valid: true, available: product.stockQuantity };
}

/**
 * Création d'un mouvement de stock audité et inviolable.
 * Ne modifie jamais le stock sans mouvement traceur.
 */
export function createStockMovement(params: {
  product: Product;
  type: StockMovementType;
  quantityDelta: number;
  reason: string;
  userId: string;
  userName: string;
  referenceId?: string;
}): { updatedProduct: Product; movement: StockMovement } {
  const { product, type, quantityDelta, reason, userId, userName, referenceId } = params;

  if (!reason || reason.trim().length === 0) {
    throw new Error('Un motif obligatoire doit être renseigné pour toute modification de stock.');
  }

  if (quantityDelta === 0) {
    throw new Error('La variation de stock ne peut pas être nulle.');
  }

  const quantityBefore = product.stockQuantity;
  const quantityAfter = quantityBefore + quantityDelta;

  const updatedProduct: Product = {
    ...product,
    stockQuantity: quantityAfter,
    updatedAt: new Date().toISOString(),
  };

  const movement: StockMovement = {
    id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    type,
    quantityDelta,
    quantityBefore,
    quantityAfter,
    unitPrice: product.sellingPrice,
    currency: product.currency,
    reason: reason.trim(),
    referenceId,
    userId,
    userName,
    createdAt: new Date().toISOString(),
  };

  return { updatedProduct, movement };
}

/**
 * Règle 3 : Validation rigoureuse d'une vente à crédit.
 * - Catégorie B : crédit formellement interdit (comptant obligatoire 100%).
 * - Catégorie A : crédit permis UNIQUEMENT si (dette_actuelle + montant_credit <= plafond).
 */
export function validateCreditSale(params: {
  customer?: Customer | null;
  saleType: SaleType;
  totalAmount: number;
  paidAmount: number;
  saleCurrency?: Currency;
  exchangeRateUsdToCdf?: number;
}): { valid: boolean; creditAmount: number; availableCredit: number; error?: string } {
  const {
    customer,
    saleType,
    totalAmount,
    paidAmount,
    saleCurrency = 'USD',
    exchangeRateUsdToCdf = 2850,
  } = params;

  if (saleType === 'COMPTANT') {
    if (paidAmount < totalAmount) {
      return {
        valid: false,
        creditAmount: 0,
        availableCredit: 0,
        error: `Une vente au comptant requiert le paiement intégral (${formatMoney(totalAmount, saleCurrency)}). Montant reçu: ${formatMoney(paidAmount, saleCurrency)}.`,
      };
    }
    return { valid: true, creditAmount: 0, availableCredit: 0 };
  }

  // Vente PARTIEL ou CREDIT
  if (!customer) {
    return {
      valid: false,
      creditAmount: totalAmount - paidAmount,
      availableCredit: 0,
      error: 'Un client enregistré est obligatoire pour toute vente à crédit ou paiement partiel.',
    };
  }

  if (customer.archived) {
    return {
      valid: false,
      creditAmount: totalAmount - paidAmount,
      availableCredit: 0,
      error: `Le client ${customer.name} est archivé. Aucune vente à crédit ne peut être accordée.`,
    };
  }

  if (customer.category !== 'A') {
    return {
      valid: false,
      creditAmount: totalAmount - paidAmount,
      availableCredit: 0,
      error: `Crédit refusé : Le client ${customer.name} est en Catégorie B (Comptant uniquement). Il doit régler la totalité (${formatMoney(totalAmount, saleCurrency)}).`,
    };
  }

  const rawCreditAmount = totalAmount - paidAmount;
  if (rawCreditAmount <= 0) {
    return { valid: true, creditAmount: 0, availableCredit: customer.creditLimit - customer.currentDebt };
  }

  // Le plafond de crédit client en RDC est généralement libellé en USD.
  // Si la vente est en CDF, on convertit la dette demandée en USD pour la comparer au plafond.
  const creditAmountInUSD =
    saleCurrency === 'CDF'
      ? rawCreditAmount / exchangeRateUsdToCdf
      : rawCreditAmount;

  const availableCreditInUSD = Math.max(0, customer.creditLimit - customer.currentDebt);

  if (creditAmountInUSD > availableCreditInUSD + 0.001) {
    const errorDetails =
      saleCurrency === 'CDF'
        ? `Dépassement de plafond de crédit pour ${customer.name} : Dette demandée (${formatMoney(rawCreditAmount, 'CDF')} = $${creditAmountInUSD.toFixed(2)}) > Crédit disponible ($${availableCreditInUSD.toFixed(2)}). Plafond: $${customer.creditLimit}, Dette en cours: $${customer.currentDebt}.`
        : `Dépassement de plafond de crédit pour ${customer.name} : Crédit demandé (${formatMoney(rawCreditAmount, 'USD')}) > Crédit disponible (${formatMoney(availableCreditInUSD, 'USD')}). Plafond: $${customer.creditLimit}, Dette en cours: $${customer.currentDebt}.`;

    return {
      valid: false,
      creditAmount: rawCreditAmount,
      availableCredit: availableCreditInUSD,
      error: errorDetails,
    };
  }

  return { valid: true, creditAmount: rawCreditAmount, availableCredit: availableCreditInUSD };
}

/**
 * Règle 5 : Remboursement de créance multidevise (Recouvrement USD / CDF).
 * - Le caissier choisit librement la devise effectivement reçue : USD ou CDF.
 * - Ne peut pas dépasser le solde dû (avec conversion exacte au taux du moment).
 * - Met à jour le solde restant.
 * - Passe automatiquement au statut 'REGLEE' quand solde = 0.
 * - Ne gonfle JAMAIS le chiffre d'affaires (ne crée pas de nouvelle vente).
 * - Enregistre le taux appliqué au moment du paiement sans altérer rétroactivement le passé.
 */
export function processDebtRepayment(params: {
  debt: Debt;
  amountToPay?: number; // Montant déduit de la dette (en devise de la dette)
  paymentMethod: PaymentMethod;
  paymentCurrency?: Currency; // Devise effectivement reçue (USD ou CDF)
  amountReceived?: number; // Montant en espèces ou mobile reçu dans paymentCurrency
  exchangeRateUsdToCdf?: number; // Taux de change applicable
  userId: string;
  userName: string;
  reference?: string;
  notes?: string;
}): {
  updatedDebt: Debt;
  paymentReceipt: DebtPayment;
  cashMovement: CashMovement;
} {
  const {
    debt,
    amountToPay,
    paymentMethod,
    paymentCurrency = debt.currency,
    amountReceived,
    exchangeRateUsdToCdf = 2850,
    userId,
    userName,
    reference,
    notes,
  } = params;

  if (debt.status === 'REGLEE' || debt.remainingAmount <= 0) {
    throw new Error(`Cette créance (Vente ${debt.saleNumber}) est déjà entièrement réglée.`);
  }

  // Calcul du montant déduit de la créance et du montant reçu en caisse
  let effectiveAmountDeducted: number;
  let effectiveAmountReceived: number;
  let rateApplied: number = exchangeRateUsdToCdf;

  if (paymentCurrency === debt.currency) {
    rateApplied = 1;
    effectiveAmountReceived = amountReceived !== undefined ? amountReceived : (amountToPay || 0);
    effectiveAmountDeducted = effectiveAmountReceived;
  } else if (debt.currency === 'USD' && paymentCurrency === 'CDF') {
    rateApplied = exchangeRateUsdToCdf;
    if (amountReceived !== undefined) {
      effectiveAmountReceived = amountReceived;
      effectiveAmountDeducted = Number((amountReceived / exchangeRateUsdToCdf).toFixed(2));
    } else {
      effectiveAmountDeducted = amountToPay || 0;
      effectiveAmountReceived = Math.round(effectiveAmountDeducted * exchangeRateUsdToCdf);
    }
  } else if (debt.currency === 'CDF' && paymentCurrency === 'USD') {
    rateApplied = exchangeRateUsdToCdf;
    if (amountReceived !== undefined) {
      effectiveAmountReceived = amountReceived;
      effectiveAmountDeducted = Math.round(amountReceived * exchangeRateUsdToCdf);
    } else {
      effectiveAmountDeducted = amountToPay || 0;
      effectiveAmountReceived = Number((effectiveAmountDeducted / exchangeRateUsdToCdf).toFixed(2));
    }
  } else {
    rateApplied = 1;
    effectiveAmountReceived = amountReceived !== undefined ? amountReceived : (amountToPay || 0);
    effectiveAmountDeducted = effectiveAmountReceived;
  }

  if (effectiveAmountReceived <= 0 || effectiveAmountDeducted <= 0) {
    throw new Error('Le montant du recouvrement doit être strictement supérieur à zéro.');
  }

  // Règle stricte : refus d'un remboursement supérieur au solde
  if (effectiveAmountDeducted > debt.remainingAmount + 0.001) {
    throw new Error(
      `Le remboursement équivalent (${formatMoney(effectiveAmountDeducted, debt.currency)}) ne peut pas dépasser le solde restant (${formatMoney(debt.remainingAmount, debt.currency)}). Montant reçu: ${formatMoney(effectiveAmountReceived, paymentCurrency)}.`
    );
  }

  const newPaidAmount = debt.paidAmount + effectiveAmountDeducted;
  const newRemainingAmount = Math.max(0, debt.remainingAmount - effectiveAmountDeducted);
  const newStatus: DebtStatus = newRemainingAmount <= 0.001 ? 'REGLEE' : 'PARTIELLEMENT_REGLEE';

  const updatedDebt: Debt = {
    ...debt,
    paidAmount: Number(newPaidAmount.toFixed(2)),
    remainingAmount: Number(newRemainingAmount.toFixed(2)),
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
  const paymentReceipt: DebtPayment = {
    id: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    receiptNumber,
    debtId: debt.id,
    saleNumber: debt.saleNumber,
    customerId: debt.customerId,
    customerName: debt.customerName,
    debtInitialAmount: debt.initialAmount,
    debtPreviousPaidAmount: debt.paidAmount,
    amount: effectiveAmountDeducted,
    currency: debt.currency,
    paymentCurrency,
    amountReceived: effectiveAmountReceived,
    exchangeRateApplied: rateApplied,
    remainingBalanceAfter: Number(newRemainingAmount.toFixed(2)),
    paymentMethod,
    reference,
    notes,
    userId,
    userName,
    createdAt: new Date().toISOString(),
  };

  // Le mouvement de caisse enregistre la devise et le montant EFFECTIVEMENT ENCAISSÉS dans le tiroir-caisse
  const descriptionNote =
    paymentCurrency !== debt.currency
      ? `Recouvrement créance ${debt.customerName} (Vente: ${debt.saleNumber}) : ${formatMoney(effectiveAmountReceived, paymentCurrency)} reçus (Taux: 1 USD = ${exchangeRateUsdToCdf} CDF, déduit ${formatMoney(effectiveAmountDeducted, debt.currency)})`
      : `Recouvrement créance ${debt.customerName} (Vente: ${debt.saleNumber})`;

  const cashMovement: CashMovement = {
    id: `CSH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'RECOUVREMENT_CREANCE',
    sourceId: paymentReceipt.id,
    sourceReference: receiptNumber,
    direction: 'IN',
    amount: effectiveAmountReceived,
    currency: paymentCurrency,
    paymentMethod,
    description: descriptionNote,
    userId,
    userName,
    createdAt: new Date().toISOString(),
  };

  return { updatedDebt, paymentReceipt, cashMovement };
}

/**
 * Règle 6 & 9 : Calcul exact du Chiffre d'Affaires vs Encaissements réels vs Créances générées.
 * Évite formellement toute double comptabilisation !
 *
 * Chiffre d'Affaires (Turnover) = Somme des ventes validées (TotalAmount).
 * Encaissements Réels (Cash Inflow) = Ventes comptant + Acomptes ventes + Recouvrements créances.
 * Créances en cours (Open Receivables) = Somme des soldes restants des créances.
 */
export function calculateFinancialMetrics(params: {
  sales: Array<{
    totalAmount: number;
    paidAmount: number;
    paidAmountUsd?: number;
    paidAmountCdf?: number;
    remainingAmount: number;
    cancelled: boolean;
    currency: Currency;
  }>;
  debtPayments: Array<{
    amount: number;
    currency: Currency;
    paymentCurrency?: Currency;
    amountReceived?: number;
  }>;
  expenses: Array<{ amount: number; currency: Currency }>;
  targetCurrency: Currency;
  exchangeRateUsdToCdf: number; // 1 USD = X CDF
}) {
  const { sales, debtPayments, expenses, targetCurrency, exchangeRateUsdToCdf } = params;

  const toTarget = (amount: number, fromCurrency: Currency): number => {
    if (fromCurrency === targetCurrency) return amount;
    if (fromCurrency === 'USD' && targetCurrency === 'CDF') {
      return amount * exchangeRateUsdToCdf;
    }
    if (fromCurrency === 'CDF' && targetCurrency === 'USD') {
      return amount / exchangeRateUsdToCdf;
    }
    return amount;
  };

  let turnover = 0; // Total des ventes réalisées (CA)
  let initialCashCollectedFromSales = 0; // Argent liquide/mobile entré lors des ventes
  let creditGranted = 0; // Crédit net accordé lors des ventes

  let totalCashInUsd = 0; // Somme exacte des dollars réellement reçus ($)
  let totalCashInCdf = 0; // Somme exacte des francs congolais réellement reçus (FC)

  for (const s of sales) {
    if (s.cancelled) continue;
    turnover += toTarget(s.totalAmount, s.currency);
    initialCashCollectedFromSales += toTarget(s.paidAmount, s.currency);
    creditGranted += toTarget(s.remainingAmount, s.currency);

    if (s.paidAmountUsd !== undefined || s.paidAmountCdf !== undefined) {
      totalCashInUsd += s.paidAmountUsd || 0;
      totalCashInCdf += s.paidAmountCdf || 0;
    } else {
      if (s.currency === 'USD') totalCashInUsd += s.paidAmount;
      else if (s.currency === 'CDF') totalCashInCdf += s.paidAmount;
    }
  }

  // Encaissements des dettes récupérées plus tard
  let debtRecovered = 0;
  for (const p of debtPayments) {
    debtRecovered += toTarget(p.amount, p.currency);
    const recvAmount = p.amountReceived !== undefined ? p.amountReceived : p.amount;
    if (p.paymentCurrency === 'CDF' || (!p.paymentCurrency && p.currency === 'CDF')) {
      totalCashInCdf += recvAmount;
    } else {
      totalCashInUsd += recvAmount;
    }
  }

  // Dépenses de la quincaillerie
  let totalExpenses = 0;
  for (const e of expenses) {
    totalExpenses += toTarget(e.amount, e.currency);
  }

  // Encaissements RÉELS TOTAUX
  const totalActualCashIn = initialCashCollectedFromSales + debtRecovered;
  // Solde net de caisse (Encaissements réels - Dépenses)
  const netCashFlow = totalActualCashIn - totalExpenses;

  return {
    turnover: Number(turnover.toFixed(2)),
    initialCashCollectedFromSales: Number(initialCashCollectedFromSales.toFixed(2)),
    creditGranted: Number(creditGranted.toFixed(2)),
    debtRecovered: Number(debtRecovered.toFixed(2)),
    totalActualCashIn: Number(totalActualCashIn.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netCashFlow: Number(netCashFlow.toFixed(2)),
    totalCashInUsd: Number(totalCashInUsd.toFixed(2)),
    totalCashInCdf: Number(totalCashInCdf.toFixed(2)),
  };
}

/**
 * Calcul du coût des marchandises vendues (COGS) et de la marge brute.
 * Marge brute = Ventes - Coût d'achat des produits vendus.
 * Marge nette = Marge brute - Dépenses opérationnelles.
 */
export function calculateProfitMetrics(params: {
  sales: Array<{
    items: SaleItem[];
    cancelled: boolean;
    currency: Currency;
  }>;
  expenses: Array<{ amount: number; currency: Currency }>;
  targetCurrency: Currency;
  exchangeRateUsdToCdf: number;
}) {
  const { sales, expenses, targetCurrency, exchangeRateUsdToCdf } = params;

  const toTarget = (amount: number, fromCurrency: Currency): number => {
    if (fromCurrency === targetCurrency) return amount;
    if (fromCurrency === 'USD' && targetCurrency === 'CDF') return amount * exchangeRateUsdToCdf;
    if (fromCurrency === 'CDF' && targetCurrency === 'USD') return amount / exchangeRateUsdToCdf;
    return amount;
  };

  let totalSalesRevenue = 0;
  let totalCOGS = 0; // Coût des marchandises vendues

  for (const s of sales) {
    if (s.cancelled) continue;
    for (const item of s.items) {
      const itemRevenue = item.subtotal;
      const itemCost = item.unitCost * item.quantity;
      totalSalesRevenue += toTarget(itemRevenue, item.currency || s.currency);
      totalCOGS += toTarget(itemCost, item.currency || s.currency);
    }
  }

  const grossMargin = totalSalesRevenue - totalCOGS;
  const grossMarginPercentage = totalSalesRevenue > 0 ? (grossMargin / totalSalesRevenue) * 100 : 0;

  let totalExpenses = 0;
  for (const exp of expenses) {
    totalExpenses += toTarget(exp.amount, exp.currency);
  }

  const netProfit = grossMargin - totalExpenses;
  const netProfitPercentage = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  return {
    totalSalesRevenue: Number(totalSalesRevenue.toFixed(2)),
    totalCOGS: Number(totalCOGS.toFixed(2)),
    grossMargin: Number(grossMargin.toFixed(2)),
    grossMarginPercentage: Number(grossMarginPercentage.toFixed(1)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    netProfitPercentage: Number(netProfitPercentage.toFixed(1)),
  };
}

/**
 * Règle 8 : Gestion stricte des devises (USD et CDF).
 * Empêche l'addition accidentelle de montants sans conversion explicite.
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRateUsdToCdf: number
): { amount: number; rateUsed: number } {
  if (from === to) {
    return { amount, rateUsed: 1 };
  }
  if (from === 'USD' && to === 'CDF') {
    return { amount: Number((amount * exchangeRateUsdToCdf).toFixed(0)), rateUsed: exchangeRateUsdToCdf };
  }
  if (from === 'CDF' && to === 'USD') {
    return { amount: Number((amount / exchangeRateUsdToCdf).toFixed(2)), rateUsed: exchangeRateUsdToCdf };
  }
  return { amount, rateUsed: 1 };
}

/**
 * Formatage monétaire clair et lisible.
 */
export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return `$${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC`;
}

/**
 * Règle 10 : Gestion physique séparée des caisses USD et CDF.
 * En RDC, la caisse d'une quincaillerie détient physiquement deux compartiments distincts :
 * - Tiroir devises étrangères (USD $)
 * - Tiroir monnaie locale (Franc Congolais CDF FC)
 * Cette fonction calcule les flux entrants, sortants et le solde net de chaque caisse de façon étanche.
 */
export function calculateMultiCurrencyCashBalances(params: {
  cashMovements: Array<{
    amount: number;
    currency: Currency;
    direction: 'IN' | 'OUT';
  }>;
  exchangeRateUsdToCdf: number;
  displayCurrency: Currency;
}) {
  const { cashMovements, exchangeRateUsdToCdf, displayCurrency } = params;

  let usdIn = 0;
  let usdOut = 0;
  let cdfIn = 0;
  let cdfOut = 0;

  for (const m of cashMovements) {
    if (m.currency === 'USD') {
      if (m.direction === 'IN') usdIn += m.amount;
      if (m.direction === 'OUT') usdOut += m.amount;
    } else if (m.currency === 'CDF') {
      if (m.direction === 'IN') cdfIn += m.amount;
      if (m.direction === 'OUT') cdfOut += m.amount;
    }
  }

  const usdBalance = Number((usdIn - usdOut).toFixed(2));
  const cdfBalance = Math.round(cdfIn - cdfOut);

  // Conversion consolidée dans la devise d'affichage
  const consolidatedInUSD = usdBalance + (cdfBalance / (exchangeRateUsdToCdf || 2850));
  const consolidatedInCDF = (usdBalance * (exchangeRateUsdToCdf || 2850)) + cdfBalance;

  const consolidatedBalance =
    displayCurrency === 'USD'
      ? Number(consolidatedInUSD.toFixed(2))
      : Math.round(consolidatedInCDF);

  return {
    usd: {
      inflows: Number(usdIn.toFixed(2)),
      outflows: Number(usdOut.toFixed(2)),
      balance: usdBalance,
    },
    cdf: {
      inflows: Math.round(cdfIn),
      outflows: Math.round(cdfOut),
      balance: cdfBalance,
    },
    consolidatedBalance,
    consolidatedInUSD: Number(consolidatedInUSD.toFixed(2)),
    consolidatedInCDF: Math.round(consolidatedInCDF),
  };
}
