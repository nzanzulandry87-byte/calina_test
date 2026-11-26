import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  User,
  CreditCard,
  Banknote,
  DollarSign,
  Coins,
  Printer,
  ChevronRight,
  ShieldAlert,
  Percent,
  FileText,
  FileCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  formatMoney,
  convertCurrency,
  validateStockAvailability,
  validateCreditSale,
} from '../logic/businessRules.ts';
import type {
  Product,
  Customer,
  SaleItem,
  SaleType,
  PaymentMethod,
  Currency,
} from '../types/index.ts';

export const POSView: React.FC = () => {
  const {
    products,
    customers,
    settings,
    displayCurrency,
    processSaleTransaction,
    resetDatabaseToDefault,
  } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');

  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Multi-Currency State (Exigence Section 2 : Champ obligatoire « Devise de paiement » USD / CDF)
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('USD');
  const baseRate = settings.exchangeRateSales || settings.exchangeRateUsdToCdf || 2850;
  const [cashierCustomRate, setCashierCustomRate] = useState<string>(baseRate.toString());

  const effectiveExchangeRate = useMemo(() => {
    if (settings.allowCashierRateOverride) {
      const parsed = parseFloat(cashierCustomRate);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return baseRate;
  }, [settings.allowCashierRateOverride, cashierCustomRate, baseRate]);

  // Customer & Transaction options
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [saleType, setSaleType] = useState<SaleType>('COMPTANT');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [dueDays, setDueDays] = useState<number>(settings.defaultCreditPeriodDays);

  // Mixed Payment Multi-Currency State (USD + CDF)
  const [isMixedPayment, setIsMixedPayment] = useState<boolean>(false);
  const [paidUsdInput, setPaidUsdInput] = useState<string>('');
  const [paidCdfInput, setPaidCdfInput] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Quotation (Flux Devis) State
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [associatedQuote, setAssociatedQuote] = useState<{
    id: string;
    code: string;
    totalAmount: number;
    customerName: string;
  } | null>(null);

  const [quotationsList, setQuotationsList] = useState([
    {
      id: 'DEV-001',
      code: 'DEV-2026-001',
      customerId: 'CST-001',
      customerName: 'Entreprise BTP Mwamba & Fils SARL',
      date: '2026-10-19',
      totalAmount: 571.0,
      status: 'ACTIF' as 'ACTIF' | 'CONVERTI' | 'ANNULE',
      convertedSaleNumber: undefined as string | undefined,
      notes: '30 sacs Ciment 42.5R + 20 barres Fer Ø10',
      items: [
        { productId: 'PRD-001', quantity: 30 },
        { productId: 'PRD-004', quantity: 20 },
      ],
    },
    {
      id: 'DEV-002',
      code: 'DEV-2026-002',
      customerId: 'CST-004',
      customerName: 'Maçonnerie Kambale & Frères',
      date: '2026-10-19',
      totalAmount: 202.0,
      status: 'ACTIF' as 'ACTIF' | 'CONVERTI' | 'ANNULE',
      convertedSaleNumber: undefined as string | undefined,
      notes: '15 Tôles ondulées BG 28 + 10 kg Pointes 3 pouces',
      items: [
        { productId: 'PRD-007', quantity: 15 },
        { productId: 'PRD-046', quantity: 10 },
      ],
    },
    {
      id: 'DEV-003',
      code: 'DEV-2026-003',
      customerId: 'CST-002',
      customerName: 'ETS Kivu Construction & Décoration',
      date: '2026-10-17',
      totalAmount: 159.2,
      status: 'CONVERTI' as 'ACTIF' | 'CONVERTI' | 'ANNULE',
      convertedSaleNumber: 'VNT-2026-DEV-003',
      notes: '4 seaux Peinture émulsion 20L + 4 Rouleaux façade',
      items: [
        { productId: 'PRD-027', quantity: 4 },
        { productId: 'PRD-031', quantity: 4 },
      ],
    },
  ]);

  // Multi-Currency Price Helper
  const getProductPriceInPaymentCurrency = (product: Product): number => {
    if (product.currency === paymentCurrency) return product.sellingPrice;
    if (product.currency === 'USD' && paymentCurrency === 'CDF') {
      return Math.round(product.sellingPrice * effectiveExchangeRate);
    }
    if (product.currency === 'CDF' && paymentCurrency === 'USD') {
      return Number((product.sellingPrice / effectiveExchangeRate).toFixed(2));
    }
    return product.sellingPrice;
  };

  const handlePaymentCurrencyChange = (newCurr: Currency) => {
    if (newCurr === paymentCurrency) return;
    setPaymentCurrency(newCurr);

    // Recalculer le panier dans la nouvelle devise
    setCart((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const baseSelling = prod ? prod.sellingPrice : item.unitPrice;
        let newUnitPrice: number;
        let newUnitCost: number;

        if (newCurr === 'CDF') {
          newUnitPrice = Math.round(baseSelling * effectiveExchangeRate);
          newUnitCost = Math.round((prod ? prod.purchasePrice : item.unitCost) * effectiveExchangeRate);
        } else {
          newUnitPrice = prod ? prod.sellingPrice : Number((item.unitPrice / effectiveExchangeRate).toFixed(2));
          newUnitCost = prod ? prod.purchasePrice : Number((item.unitCost / effectiveExchangeRate).toFixed(2));
        }

        return {
          ...item,
          currency: newCurr,
          unitPrice: newUnitPrice,
          unitCost: newUnitCost,
          subtotal: item.quantity * newUnitPrice,
        };
      })
    );

    setPaidAmountInput('');
  };

  const handleSelectQuote = (quote: typeof quotationsList[0]) => {
    setErrorMessage('');
    if (quote.status === 'CONVERTI') {
      setErrorMessage(`Ce devis (${quote.code}) a déjà été converti en vente (${quote.convertedSaleNumber}) et ne peut pas être réutilisé.`);
      return;
    }

    const newCart: SaleItem[] = [];
    for (const it of quote.items) {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        const unitPrice = getProductPriceInPaymentCurrency(prod);
        const unitCost =
          paymentCurrency === 'CDF'
            ? Math.round(prod.purchasePrice * effectiveExchangeRate)
            : prod.purchasePrice;

        newCart.push({
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          unit: prod.unit,
          quantity: it.quantity,
          unitCost,
          unitPrice,
          discount: 0,
          subtotal: it.quantity * unitPrice,
          currency: paymentCurrency,
        });
      }
    }

    setCart(newCart);
    setSelectedCustomerId(quote.customerId);
    const convertedQuoteTotal = newCart.reduce((s, it) => s + it.subtotal, 0);

    setAssociatedQuote({
      id: quote.id,
      code: quote.code,
      totalAmount: convertedQuoteTotal,
      customerName: quote.customerName,
    });
    setPaidAmountInput(convertedQuoteTotal.toString());
    setQuotationModalOpen(false);
    setSuccessMessage(`Devis ${quote.code} (${formatMoney(convertedQuoteTotal, paymentCurrency)}) chargé pour ${quote.customerName}.`);
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (!p.archived && p.category) set.add(p.category);
    });
    return ['TOUS', ...Array.from(set)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.archived) return false;
      const matchesCat = selectedCategory === 'TOUS' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Available credit for selected customer (en USD)
  const availableCredit = useMemo(() => {
    if (!selectedCustomer) return 0;
    if (selectedCustomer.category !== 'A') return 0;
    return Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentDebt);
  }, [selectedCustomer]);

  // Add product to cart (prix calculé dans la devise de paiement choisie)
  const addToCart = (product: Product) => {
    setErrorMessage('');
    const existing = cart.find((it) => it.productId === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const requestedQty = currentQtyInCart + 1;

    // Check stock
    const check = validateStockAvailability(product, requestedQty, settings.allowNegativeStock);
    if (!check.valid) {
      setErrorMessage(check.reason || 'Stock insuffisant.');
      return;
    }

    const unitPrice = getProductPriceInPaymentCurrency(product);
    const unitCost =
      paymentCurrency === 'CDF'
        ? Math.round(product.purchasePrice * effectiveExchangeRate)
        : product.purchasePrice;

    if (existing) {
      setCart((prev) =>
        prev.map((it) =>
          it.productId === product.id
            ? {
                ...it,
                quantity: it.quantity + 1,
                subtotal: (it.quantity + 1) * it.unitPrice,
              }
            : it
        )
      );
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        unit: product.unit,
        quantity: 1,
        unitCost,
        unitPrice,
        discount: 0,
        subtotal: unitPrice,
        currency: paymentCurrency,
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage('');
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existing = cart.find((it) => it.productId === productId);
    if (!existing) return;

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const check = validateStockAvailability(product, newQty, settings.allowNegativeStock);
    if (!check.valid) {
      setErrorMessage(check.reason || 'Stock insuffisant.');
      return;
    }

    setCart((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              quantity: newQty,
              subtotal: newQty * it.unitPrice,
            }
          : it
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setPaidAmountInput('');
    setErrorMessage('');
  };

  // Convert total sale amount to USD equivalent
  const totalAmountInUsd = useMemo(() => {
    if (paymentCurrency === 'CDF') return totalAmount / effectiveExchangeRate;
    return totalAmount;
  }, [totalAmount, paymentCurrency, effectiveExchangeRate]);

  // Mixed payment auto-calculation functions
  const handleUsdChange = (val: string) => {
    setPaidUsdInput(val);
    const usdVal = parseFloat(val) || 0;
    const remainingUsd = totalAmountInUsd - usdVal;
    if (remainingUsd > 0) {
      setPaidCdfInput(Math.round(remainingUsd * effectiveExchangeRate).toString());
    } else {
      setPaidCdfInput('0');
    }
  };

  const handleCdfChange = (val: string) => {
    setPaidCdfInput(val);
    const cdfVal = parseFloat(val) || 0;
    const cdfInUsd = cdfVal / effectiveExchangeRate;
    const remainingUsd = totalAmountInUsd - cdfInUsd;
    if (remainingUsd > 0) {
      setPaidUsdInput(Number(remainingUsd.toFixed(2)).toString());
    } else {
      setPaidUsdInput('0');
    }
  };

  // Determine actual paid amount
  const paidAmount = useMemo(() => {
    if (saleType === 'COMPTANT') return totalAmount;
    if (saleType === 'CREDIT') return 0;
    const parsed = parseFloat(paidAmountInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [saleType, totalAmount, paidAmountInput]);

  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // Validate and submit sale
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (cart.length === 0) {
      setErrorMessage('Le panier est vide. Veuillez sélectionner au moins un article.');
      return;
    }

    if (saleType !== 'COMPTANT' && !selectedCustomer) {
      setErrorMessage('Un client doit être sélectionné pour une vente à crédit ou paiement partiel.');
      return;
    }

    if (saleType !== 'COMPTANT' && selectedCustomer?.category !== 'A') {
      setErrorMessage(
        `Crédit interdit : ${selectedCustomer?.name} est en Catégorie B (Comptant uniquement). Réglez 100% au comptant.`
      );
      return;
    }

    let finalPaidUsd: number | undefined;
    let finalPaidCdf: number | undefined;
    let finalPaidAmount = paidAmount;
    let finalPaymentMethod = paymentMethod;

    if (saleType !== 'CREDIT' && isMixedPayment) {
      finalPaidUsd = parseFloat(paidUsdInput) || 0;
      finalPaidCdf = parseFloat(paidCdfInput) || 0;
      const totalPaidUsdEq = finalPaidUsd + (finalPaidCdf / effectiveExchangeRate);
      finalPaidAmount = Math.min(totalAmountInUsd, totalPaidUsdEq);
      finalPaymentMethod = 'MIXTE';

      if (totalPaidUsdEq <= 0 && saleType === 'COMPTANT') {
        setErrorMessage('Veuillez saisir au moins un montant reçu en USD ($) ou en CDF (FC).');
        return;
      }
    } else if (saleType === 'PARTIEL' && (paidAmount <= 0 || paidAmount >= totalAmount)) {
      setErrorMessage(
        `Pour une vente partielle, l'acompte doit être supérieur à 0 et inférieur au total (${formatMoney(totalAmount, paymentCurrency)}).`
      );
      return;
    }

    // Due date
    const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = processSaleTransaction({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Client Comptant',
      customerPhone: selectedCustomer?.phone,
      customerCategory: selectedCustomer?.category,
      items: cart,
      subtotal,
      discount: discountAmount,
      totalAmount,
      paidAmount: isMixedPayment ? finalPaidAmount : paidAmount,
      paidAmountUsd: isMixedPayment ? finalPaidUsd : (paymentCurrency === 'USD' ? paidAmount : 0),
      paidAmountCdf: isMixedPayment ? finalPaidCdf : (paymentCurrency === 'CDF' ? paidAmount : 0),
      saleType,
      paymentMethod: finalPaymentMethod,
      currency: paymentCurrency,
      paymentCurrency,
      appliedExchangeRate: effectiveExchangeRate,
      paidAmountInPaymentCurrency: paidAmount,
      dueDate: remainingAmount > 0 ? dueDate : undefined,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Erreur lors de la validation de la vente.');
      return;
    }

    // Success & Quotation Conversion
    if (associatedQuote) {
      setQuotationsList((prev) =>
        prev.map((q) =>
          q.id === associatedQuote.id
            ? { ...q, status: 'CONVERTI', convertedSaleNumber: result.sale?.saleNumber }
            : q
        )
      );
      setSuccessMessage(
        `Vente ${result.sale?.saleNumber} validée et rattachée au devis ${associatedQuote.code} ! Encaissement de ${formatMoney(paidAmount, paymentCurrency)} enregistré.`
      );
      setAssociatedQuote(null);
    } else {
      setSuccessMessage(`Vente ${result.sale?.saleNumber} validée avec succès (${paymentCurrency}) ! Le reçu a été généré.`);
    }

    clearCart();
    setSelectedCustomerId('');
    setSaleType('COMPTANT');
  };

  return (
    <div className="pb-24 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Product Catalog & Search (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Category Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom d'article ou référence SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-xs"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[62vh] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stockQuantity <= 0;
            const isLowStock = p.stockQuantity <= p.minThreshold && !isOutOfStock;
            const inCart = cart.find((it) => it.productId === p.id);
            const displayPrice = getProductPriceInPaymentCurrency(p);

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all select-none ${
                  isOutOfStock
                    ? 'bg-slate-900/60 border-slate-800 opacity-50 cursor-not-allowed'
                    : inCart
                    ? 'bg-blue-950/40 border-blue-500/80 shadow-md ring-1 ring-blue-500/50 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {p.sku}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isOutOfStock
                          ? 'bg-rose-900/80 text-rose-300'
                          : isLowStock
                          ? 'bg-amber-900/80 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.stockQuantity} {p.unit}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                    {p.name}
                  </h4>
                </div>

                <div className="mt-3 flex items-end justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-black text-blue-400 text-sm">
                      {formatMoney(displayPrice, paymentCurrency)}
                    </div>
                    {paymentCurrency !== p.currency && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Base: {formatMoney(p.sellingPrice, p.currency)}
                      </div>
                    )}
                  </div>
                  {inCart ? (
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      {inCart.quantity}
                    </span>
                  ) : (
                    <button
                      disabled={isOutOfStock}
                      className="w-6 h-6 rounded-full bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 space-y-3 my-4">
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/40 rounded-2xl flex items-center justify-center text-blue-400 mx-auto">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-white">Votre catalogue de produits est actuellement vide</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pour effectuer des ventes à la caisse POS, vous devez d'abord ajouter des produits ou charger le jeu de démonstration MVP.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetDatabaseToDefault();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Charger les produits de démonstration MVP
              </button>
            </div>
          )}

          {products.length > 0 && filteredProducts.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              Aucun produit ne correspond à votre recherche ou catégorie sélectionnée.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Cart, Customer & Checkout Form (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        <form onSubmit={handleSubmitSale} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Panier de Vente</h3>
              <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                {cart.reduce((s, it) => s + it.quantity, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                Vider
              </button>
            )}
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white truncate">{item.productName}</div>
                  <div className="text-[11px] text-slate-400">
                    {formatMoney(item.unitPrice, item.currency)} / {item.unit}
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-white text-xs">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right flex-shrink-0 min-w-16">
                  <div className="font-bold text-white">
                    {formatMoney(item.subtotal, item.currency)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-850/40 rounded-xl border border-slate-800 border-dashed">
                Sélectionnez des articles dans le catalogue pour composer la vente.
              </div>
            )}
          </div>

          {/* Champ Obligatoire : Devise de paiement (Exigence Métier Section 2) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Devise de paiement <span className="text-rose-400 font-black">*</span></span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                Champ obligatoire
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePaymentCurrencyChange('USD')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  paymentCurrency === 'USD'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <span>USD ($ - Dollar)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentCurrencyChange('CDF')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  paymentCurrency === 'CDF'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <span className="font-mono text-sm font-black text-blue-300">FC</span>
                <span>CDF (FC - Franc Congolais)</span>
              </button>
            </div>

            {/* Bannière de Convention & Anti-Confusion */}
            <div
              className={`p-2.5 rounded-xl border text-xs ${
                paymentCurrency === 'CDF'
                  ? 'bg-blue-950/40 border-blue-800/70 text-blue-200'
                  : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-[11px]">
                <span>Convention officielle appliquée :</span>
                <span className="font-mono font-bold">1 USD = {effectiveExchangeRate.toLocaleString('fr-FR')} CDF</span>
              </div>
              <p className="text-[10px] mt-1 text-slate-300">
                {paymentCurrency === 'CDF'
                  ? 'Attention : les prix, totaux, encaissements et reçus de cette vente sont libellés en Francs Congolais (CDF).'
                  : 'La vente, l\'encaissement et le reçu seront libellés en Dollars Américains (USD).'}
              </p>

              {/* Dérogation de taux par le caissier si autorisée par le propriétaire */}
              {settings.allowCashierRateOverride && (
                <div className="pt-2 mt-1.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-300 text-[11px]">Taux spécifique transaction (1 USD = X CDF) :</span>
                  <input
                    type="number"
                    value={cashierCustomRate}
                    onChange={(e) => setCashierCustomRate(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Customer Selection & Credit Category Check */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Client & Autorisation de Crédit :
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const cust = customers.find((c) => c.id === e.target.value);
                if (cust?.category === 'B') {
                  setSaleType('COMPTANT');
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Client Comptant (Anonyme / Sans compte) --</option>
              {customers
                .filter((c) => !c.archived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Catégorie {c.category} ({c.category === 'A' ? `Plafond ${c.creditLimit}$` : 'Comptant uniquement'})
                  </option>
                ))}
            </select>

            {/* Customer Status Banner */}
            {selectedCustomer && (
              <div
                className={`p-2.5 rounded-xl border text-xs ${
                  selectedCustomer.category === 'A'
                    ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                    : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Catégorie {selectedCustomer.category} :</span>
                  <span>{selectedCustomer.category === 'A' ? 'Crédit Autorisé' : 'Comptant Strict'}</span>
                </div>
                {selectedCustomer.category === 'A' ? (
                  <div className="mt-1 space-y-0.5 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span>Plafond total accordé :</span>
                      <span>${selectedCustomer.creditLimit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dette actuelle en cours :</span>
                      <span className="text-rose-400 font-semibold">${selectedCustomer.currentDebt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-400 border-t border-blue-900/60 pt-0.5">
                      <span>Crédit disponible :</span>
                      <span>
                        ${availableCredit.toFixed(2)}
                        {paymentCurrency === 'CDF' && ` (~${formatMoney(availableCredit * effectiveExchangeRate, 'CDF')})`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-300/90 mt-1">
                    Règle stricte : Les clients de Catégorie B doivent régler l'intégralité au comptant.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sale Type Selector (Comptant, Partiel, Crédit) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Modalité de Paiement :</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSaleType('COMPTANT')}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  saleType === 'COMPTANT'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                Comptant (100%)
              </button>
              <button
                type="button"
                disabled={selectedCustomer?.category === 'B'}
                onClick={() => {
                  if (selectedCustomer?.category === 'B') return;
                  setSaleType('PARTIEL');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  selectedCustomer?.category === 'B'
                    ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500'
                    : saleType === 'PARTIEL'
                    ? 'bg-blue-600 border-blue-500 text-white shadow'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
                title={selectedCustomer?.category === 'B' ? 'Interdit pour client Catégorie B' : 'Acompte + Solde en créance'}
              >
                Partiel (Acompte)
              </button>
              <button
                type="button"
                disabled={selectedCustomer?.category === 'B'}
                onClick={() => {
                  if (selectedCustomer?.category === 'B') return;
                  setSaleType('CREDIT');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  selectedCustomer?.category === 'B'
                    ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500'
                    : saleType === 'CREDIT'
                    ? 'bg-rose-600 border-rose-500 text-white shadow'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
                title={selectedCustomer?.category === 'B' ? 'Interdit pour client Catégorie B' : '100% à crédit'}
              >
                Crédit (100%)
              </button>
            </div>
          </div>

          {/* If Partial: Enter Paid Amount */}
          {saleType === 'PARTIEL' && (
            <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Montant de l'acompte payé ({paymentCurrency}) :
              </label>
              <input
                type="number"
                step={paymentCurrency === 'CDF' ? '500' : '0.1'}
                min="0.1"
                max={totalAmount - 0.1}
                placeholder={paymentCurrency === 'CDF' ? 'Ex: 50000' : 'Ex: 50'}
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              {paymentCurrency === 'CDF' && paidAmount > 0 && (
                <div className="text-[11px] text-slate-400">
                  Équivalent acompte : ~${(paidAmount / effectiveExchangeRate).toFixed(2)} USD
                </div>
              )}
            </div>
          )}

          {/* Option Paiement Mixte Multi-devises (USD + CDF) */}
          {saleType !== 'CREDIT' && (
            <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMixedPayment}
                    onChange={(e) => {
                      setIsMixedPayment(e.target.checked);
                      if (e.target.checked) {
                        setPaidUsdInput(totalAmountInUsd.toFixed(2));
                        setPaidCdfInput('0');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>Paiement mixte multi-devises (USD + CDF)</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  1 USD = {effectiveExchangeRate.toLocaleString('fr-FR')} FC
                </span>
              </div>

              {isMixedPayment && (
                <div className="space-y-2 pt-1 border-t border-slate-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Montant reçu en USD ($) :
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 10.00"
                        value={paidUsdInput}
                        onChange={(e) => handleUsdChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Montant reçu en CDF (FC) :
                      </label>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        placeholder="Ex: 5700"
                        value={paidCdfInput}
                        onChange={(e) => handleCdfChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-750 flex items-center justify-between text-slate-300 font-mono">
                    <span>Total équivalent reçu :</span>
                    <span className="font-bold text-emerald-400">
                      ${((parseFloat(paidUsdInput) || 0) + ((parseFloat(paidCdfInput) || 0) / effectiveExchangeRate)).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector */}
          {saleType !== 'CREDIT' && !isMixedPayment && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Mode de Règlement :</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ESPECES', 'AIRTEL_MONEY', 'M_PESA', 'ORANGE_MONEY', 'BANQUE'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition border ${
                      paymentMethod === m
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Sous-total articles :</span>
              <span className="font-mono text-slate-200">{formatMoney(subtotal, paymentCurrency)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                <span>Remise accordée :</span>
              </span>
              <input
                type="number"
                min="0"
                max={subtotal}
                step={paymentCurrency === 'CDF' ? '100' : '0.5'}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-24 text-right bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-700">
              <span>TOTAL NET :</span>
              <span className="text-base text-blue-400 font-mono">
                {formatMoney(totalAmount, paymentCurrency)}
              </span>
            </div>

            <div className="flex justify-between text-slate-300 font-semibold">
              <span>Payé immédiatement :</span>
              <span className="text-emerald-400 font-mono">
                {formatMoney(paidAmount, paymentCurrency)}
              </span>
            </div>

            {remainingAmount > 0 && (
              <div className="pt-1 border-t border-slate-700/60 space-y-0.5">
                <div className="flex justify-between font-bold text-rose-400">
                  <span>Créance générée (Reste dû) :</span>
                  <span className="font-mono">{formatMoney(remainingAmount, paymentCurrency)}</span>
                </div>
                {paymentCurrency === 'CDF' && (
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Imputation plafond client :</span>
                    <span className="font-mono text-slate-300 font-semibold">
                      ${(remainingAmount / effectiveExchangeRate).toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition ${
              cart.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Valider la Vente & Imprimer le Reçu</span>
          </button>
        </form>
      </div>
    </div>
  );
};
