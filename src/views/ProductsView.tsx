import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  Edit2,
  Archive,
  ArrowUpDown,
  Filter,
  DollarSign,
  TrendingUp,
  CheckCircle,
  X,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney, convertCurrency } from '../logic/businessRules.ts';
import type { Product, UnitOfMeasure, Currency } from '../types/index.ts';

export const ProductsView: React.FC = () => {
  const {
    products,
    stockMovements,
    suppliers,
    settings,
    displayCurrency,
    currentUser,
    addProduct,
    updateProduct,
    adjustStock,
    addStockEntry,
    archiveProduct,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'LIST' | 'MOVEMENTS'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TOUS');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Modal: Add/Edit Product
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gros Œuvre');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('pièce');
  const [purchasePrice, setPurchasePrice] = useState('10');
  const [sellingPrice, setSellingPrice] = useState('14');
  const [initialStock, setInitialStock] = useState('10');
  const [minThreshold, setMinThreshold] = useState('5');
  const [supplierId, setSupplierId] = useState('');
  const [productError, setProductError] = useState('');

  // Modal: Stock Entry (Réapprovisionnement)
  const [showStockEntryModal, setShowStockEntryModal] = useState(false);
  const [entryProductId, setEntryProductId] = useState<string>('');
  const [entryQty, setEntryQty] = useState<string>('10');
  const [entryPurchasePrice, setEntryPurchasePrice] = useState<string>('');
  const [entryReason, setEntryReason] = useState<string>('Réapprovisionnement stock / Achat fournisseur');
  const [entryError, setEntryError] = useState<string>('');
  const [entrySuccess, setEntrySuccess] = useState<string>('');

  // Modal: Stock Adjustment (Strict Reason Requirement)
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('1');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjustReasonPreset, setAdjustReasonPreset] = useState<string>('Inventaire de contrôle physique');
  const [adjustReasonCustom, setAdjustReasonCustom] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string>('');

  const openStockEntryModalForProduct = (product?: Product) => {
    const targetProduct = product || products.find((p) => !p.archived);
    if (targetProduct) {
      setEntryProductId(targetProduct.id);
      setEntryPurchasePrice(targetProduct.purchasePrice.toString());
    } else {
      setEntryProductId('');
      setEntryPurchasePrice('');
    }
    setEntryQty('10');
    setEntryReason('Réapprovisionnement stock / Achat fournisseur');
    setEntryError('');
    setShowStockEntryModal(true);
  };

  const handleStockEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError('');
    if (!entryProductId) {
      setEntryError('Veuillez sélectionner un produit.');
      return;
    }
    const qty = Number(entryQty);
    if (isNaN(qty) || qty <= 0) {
      setEntryError('La quantité entrante doit être un nombre supérieur à 0.');
      return;
    }
    const price = entryPurchasePrice ? Number(entryPurchasePrice) : undefined;
    addStockEntry(entryProductId, qty, entryReason.trim() || 'Entrée de stock réapprovisionnement', price);
    const prod = products.find((p) => p.id === entryProductId);
    setEntrySuccess(`Entrée de stock (+${qty} ${prod?.unit || 'unités'}) pour ${prod?.name} enregistrée avec succès !`);
    setShowStockEntryModal(false);
    setTimeout(() => setEntrySuccess(''), 4000);
  };

  // Valuation
  const totalValuationCost = useMemo(() => {
    return products.reduce((sum, p) => {
      if (p.archived) return sum;
      const { amount } = convertCurrency(
        p.purchasePrice * p.stockQuantity,
        p.currency,
        displayCurrency,
        settings.exchangeRateUsdToCdf
      );
      return sum + amount;
    }, 0);
  }, [products, displayCurrency, settings]);

  const totalValuationSale = useMemo(() => {
    return products.reduce((sum, p) => {
      if (p.archived) return sum;
      const { amount } = convertCurrency(
        p.sellingPrice * p.stockQuantity,
        p.currency,
        displayCurrency,
        settings.exchangeRateUsdToCdf
      );
      return sum + amount;
    }, 0);
  }, [products, displayCurrency, settings]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (!p.archived && p.category) set.add(p.category);
    });
    return ['TOUS', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.archived) return false;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'TOUS' || p.category === categoryFilter;
      const matchesAlert = !filterAlertsOnly || p.stockQuantity <= p.minThreshold;
      return matchesSearch && matchesCat && matchesAlert;
    });
  }, [products, searchQuery, categoryFilter, filterAlertsOnly]);

  // Open modal for new product
  const openNewProductModal = () => {
    setEditingProductId(null);
    setSku(`ART-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory('Gros Œuvre');
    setDescription('');
    setUnit('pièce');
    setPurchasePrice('10');
    setSellingPrice('14');
    setInitialStock('20');
    setMinThreshold('5');
    setSupplierId('');
    setProductError('');
    setShowProductModal(true);
  };

  // Open modal for editing product
  const openEditProductModal = (p: Product) => {
    setEditingProductId(p.id);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description || '');
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice.toString());
    setSellingPrice(p.sellingPrice.toString());
    setInitialStock(p.stockQuantity.toString());
    setMinThreshold(p.minThreshold.toString());
    setSupplierId(p.supplierId || '');
    setProductError('');
    setShowProductModal(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProductError('');

    const pCost = parseFloat(purchasePrice);
    const pSell = parseFloat(sellingPrice);
    const pMin = parseInt(minThreshold, 10);
    const pInit = parseFloat(initialStock);

    if (isNaN(pCost) || isNaN(pSell) || pCost < 0 || pSell < 0) {
      setProductError('Veuillez renseigner des prix valides.');
      return;
    }

    if (!sku.trim() || !name.trim()) {
      setProductError('La référence SKU et le nom du produit sont obligatoires.');
      return;
    }

    // Check SKU uniqueness
    const duplicateSku = products.find(
      (p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== editingProductId
    );
    if (duplicateSku) {
      setProductError(`La référence SKU "${sku}" est déjà utilisée par un autre article.`);
      return;
    }

    if (editingProductId) {
      updateProduct(editingProductId, {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        unit,
        purchasePrice: pCost,
        sellingPrice: pSell,
        minThreshold: isNaN(pMin) ? 5 : pMin,
        supplierId: supplierId || undefined,
      });
    } else {
      addProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        unit,
        purchasePrice: pCost,
        sellingPrice: pSell,
        currency: 'USD',
        stockQuantity: isNaN(pInit) ? 0 : pInit,
        minThreshold: isNaN(pMin) ? 5 : pMin,
        supplierId: supplierId || undefined,
      });
    }

    setShowProductModal(false);
  };

  // Open Adjust Modal
  const openAdjustModal = (p: Product) => {
    setSelectedProductForAdjust(p);
    setAdjustDelta('1');
    setAdjustType('ADD');
    setAdjustReasonPreset('Inventaire de contrôle physique');
    setAdjustReasonCustom('');
    setAdjustError('');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    setAdjustError('');

    const qty = parseFloat(adjustDelta);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError('La quantité doit être strictement positive.');
      return;
    }

    const finalReason =
      adjustReasonCustom.trim() || adjustReasonPreset || 'Correction inventaire';

    if (!finalReason.trim()) {
      setAdjustError('Règle stricte : Un motif obligatoire doit être justifié pour toute modification de stock.');
      return;
    }

    const signedDelta = adjustType === 'ADD' ? qty : -qty;

    if (
      adjustType === 'SUBTRACT' &&
      selectedProductForAdjust.stockQuantity < qty &&
      !settings.allowNegativeStock
    ) {
      setAdjustError(
        `Impossible de retirer ${qty} ${selectedProductForAdjust.unit}. Le stock actuel n'est que de ${selectedProductForAdjust.stockQuantity}.`
      );
      return;
    }

    adjustStock(selectedProductForAdjust.id, signedDelta, finalReason);
    setSelectedProductForAdjust(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Bar: Stock Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Valeur Stock (Coût)</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatMoney(totalValuationCost, displayCurrency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Coût d'achat total des marchandises en magasin
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Valeur Stock (Vente)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatMoney(totalValuationSale, displayCurrency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Chiffre d'affaires potentiel brut en magasin
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertes de Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {products.filter((p) => !p.archived && p.stockQuantity <= p.minThreshold).length}
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1">
            Articles nécessitant réapprovisionnement
          </p>
        </div>
      </div>

      {/* Control Bar: Tabs, Search, Add Product Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Main View Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'LIST'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Catalogue & Stocks ({products.filter((p) => !p.archived).length})
            </button>
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Historique des Mouvements ({stockMovements.length})
            </button>
          </div>

          {/* Action Buttons: Stock Entry & New Product */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {products.some((p) => !p.archived) && (
              <button
                onClick={() => openStockEntryModalForProduct()}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Entrée de Stock (+)</span>
              </button>
            )}

            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={openNewProductModal}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Produit</span>
              </button>
            )}
          </div>
        </div>

        {entrySuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{entrySuccess}</span>
          </div>
        )}

        {activeTab === 'LIST' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, SKU ou catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFilterAlertsOnly(!filterAlertsOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  filterAlertsOnly
                    ? 'bg-amber-900/60 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alertes seules</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stockQuantity <= 0;
            const isLowStock = p.stockQuantity <= p.minThreshold && !isOutOfStock;

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition shadow-md flex flex-col justify-between ${
                  isOutOfStock
                    ? 'bg-rose-950/25 border-rose-800/60'
                    : isLowStock
                    ? 'bg-amber-950/25 border-amber-800/60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/40">
                      {p.sku}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? 'bg-rose-900 text-rose-200 animate-pulse'
                          : isLowStock
                          ? 'bg-amber-900 text-amber-200'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                      }`}
                    >
                      {isOutOfStock ? 'RUPTURE' : isLowStock ? 'SOUS SEUIL' : 'EN STOCK'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white leading-snug">{p.name}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.category}</div>
                  {p.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  {/* Stock level & thresholds */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Quantité en stock :</span>
                    <span className="font-black text-sm text-white">
                      {p.stockQuantity} {p.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Seuil d'alerte :</span>
                    <span>
                      {p.minThreshold} {p.unit}
                    </span>
                  </div>

                  {/* Prices & Margins */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2 rounded-xl text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Prix Achat</div>
                      <div className="font-semibold text-slate-200">
                        {formatMoney(p.purchasePrice, p.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Prix Vente</div>
                      <div className="font-bold text-blue-400">
                        {formatMoney(p.sellingPrice, p.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openAdjustModal(p)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 transition"
                      title="Modifier le stock avec motif obligatoire"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ajuster</span>
                    </button>

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => openEditProductModal(p)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title="Modifier la fiche produit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          if (confirm(`Voulez-vous archiver l'article ${p.name} ? L'historique sera conservé.`)) {
                            archiveProduct(p.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                        title="Archiver l'article"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              Aucun produit ne correspond aux critères de recherche.
            </div>
          )}
        </div>
      ) : (
        /* Stock Movements Ledger (Audited) */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Registre Inviolable des Mouvements de Stock</span>
            </h3>
            <span className="text-xs text-slate-400">
              Chaque entrée/sortie est obligatoirement tracée avec motif
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-[65vh] overflow-y-auto pr-1">
            {stockMovements.map((m) => {
              const isPositive = m.quantityDelta > 0;
              return (
                <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{m.productName}</span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                        {m.productSku}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          m.type === 'ACHAT'
                            ? 'bg-emerald-900 text-emerald-300'
                            : m.type === 'VENTE'
                            ? 'bg-blue-900 text-blue-300'
                            : m.type === 'CORRECTION'
                            ? 'bg-purple-900 text-purple-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 mt-1">
                      <strong>Motif :</strong> {m.reason}
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Par {m.userName} • {new Date(m.createdAt).toLocaleString('fr-FR')}
                      {m.referenceId && ` • Réf : ${m.referenceId}`}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 bg-slate-800/60 p-2 rounded-xl border border-slate-800 min-w-32">
                    <div
                      className={`font-black text-sm ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Av: {m.quantityBefore} ➔ Ap: {m.quantityAfter}
                    </div>
                  </div>
                </div>
              );
            })}

            {stockMovements.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun mouvement de stock enregistré.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New / Edit Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base">
                {editingProductId ? 'Modifier le Produit' : 'Créer un Nouvel Article'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {productError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {productError}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Référence SKU unique *
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    required
                    placeholder="Ex: CIM-50KG"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catégorie *
                  </label>
                  <input
                    type="text"
                    list="cat-list"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    placeholder="Ex: Gros Œuvre"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <datalist id="cat-list">
                    <option value="Gros Œuvre & Liants" />
                    <option value="Armatures & Fers" />
                    <option value="Peintures & Finitions" />
                    <option value="Toiture & Étanchéité" />
                    <option value="Quincaillerie & Fixations" />
                    <option value="Plomberie & Sanitaire" />
                    <option value="Électricité & Éclairage" />
                    <option value="Outillage & Chantier" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom commercial de l'article *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: Ciment Portland 42.5R (50kg)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unité de mesure *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="pièce">Pièce</option>
                    <option value="sac">Sac</option>
                    <option value="barre">Barre (12m)</option>
                    <option value="kg">Kilogramme (kg)</option>
                    <option value="mètre">Mètre</option>
                    <option value="litre">Litre</option>
                    <option value="boîte">Boîte</option>
                    <option value="rouleau">Rouleau</option>
                    <option value="paquet">Paquet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Seuil d'alerte minimal *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix d'Achat unitaire ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix de Vente unitaire ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {!editingProductId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantité de stock initial en magasin *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Créera un mouvement de stock initial audité avec l'utilisateur responsable.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description technique facultative
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Caractéristiques, dimensions, marque..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
                >
                  {editingProductId ? 'Mettre à jour' : 'Enregistrer le Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Audited Stock Adjustment */}
      {selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Ajustement de Stock Contrôlé</h3>
              </div>
              <button
                onClick={() => setSelectedProductForAdjust(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {adjustError}
              </div>
            )}

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
              <div className="font-bold text-white">{selectedProductForAdjust.name}</div>
              <div className="text-slate-400">
                Stock actuel : <strong className="text-amber-400">{selectedProductForAdjust.stockQuantity} {selectedProductForAdjust.unit}</strong>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('ADD')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    adjustType === 'ADD'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  + Entrée en stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('SUBTRACT')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    adjustType === 'SUBTRACT'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  - Sortie / Perte
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantité à {adjustType === 'ADD' ? 'ajouter' : 'déduire'} ({selectedProductForAdjust.unit}) :
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-base font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif obligatoire (Règle d'inviolabilité) :
                </label>
                <select
                  value={adjustReasonPreset}
                  onChange={(e) => setAdjustReasonPreset(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 mb-2"
                >
                  <option value="Inventaire de contrôle physique">Inventaire de contrôle physique</option>
                  <option value="Casse / Avarie constatée en rayon">Casse / Avarie constatée en rayon</option>
                  <option value="Perte ou vol constaté">Perte ou vol constaté</option>
                  <option value="Erreur de saisie précédente">Erreur de saisie précédente</option>
                  <option value="Autre motif explicite">Autre motif explicite (saisir ci-dessous)</option>
                </select>

                <input
                  type="text"
                  placeholder="Détails du motif (obligatoire si autre)..."
                  value={adjustReasonCustom}
                  onChange={(e) => setAdjustReasonCustom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForAdjust(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition"
                >
                  Confirmer l'Ajustement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enregistrer Entrée de Stock (Réapprovisionnement) */}
      {showStockEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Enregistrer une Entrée de Stock</h3>
              </div>
              <button
                onClick={() => setShowStockEntryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {entryError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                {entryError}
              </div>
            )}

            <form onSubmit={handleStockEntrySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sélectionner le Produit *
                </label>
                <select
                  value={entryProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setEntryProductId(id);
                    const p = products.find((prod) => prod.id === id);
                    if (p) setEntryPurchasePrice(p.purchasePrice.toString());
                  }}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choisir un produit en catalogue --</option>
                  {products
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock actuel: {p.stockQuantity} {p.unit})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantité entrante *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={entryQty}
                    onChange={(e) => setEntryQty(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nouveau Prix d'Achat ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Facultatif"
                    value={entryPurchasePrice}
                    onChange={(e) => setEntryPurchasePrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif / Référence de livraison
                </label>
                <input
                  type="text"
                  placeholder="Ex: Facture Fournisseur #1042 / Achat comptant"
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockEntryModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow"
                >
                  Enregistrer l'entrée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
