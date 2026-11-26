import React from 'react';
import { Printer, Share2, CheckCircle2, X, Download, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatMoney } from '../logic/businessRules.ts';

export const ReceiptModal: React.FC = () => {
  const {
    settings,
    selectedReceiptSale,
    selectedReceiptPayment,
    setSelectedReceiptSale,
    setSelectedReceiptPayment,
  } = useApp();

  if (!selectedReceiptSale && !selectedReceiptPayment) return null;

  const handlePrint = () => {
    window.print();
  };

  const closeReceipt = () => {
    setSelectedReceiptSale(null);
    setSelectedReceiptPayment(null);
  };

  // WhatsApp share generator
  const getWhatsAppShareText = (): string => {
    if (selectedReceiptSale) {
      const s = selectedReceiptSale;
      const lines = s.items
        .map((it) => `• ${it.productName}: ${it.quantity} ${it.unit} x ${formatMoney(it.unitPrice, s.currency)} = ${formatMoney(it.subtotal, s.currency)}`)
        .join('\n');
      return encodeURIComponent(
        `*${settings.companyName}*\n` +
        `Reçu de Vente N° ${s.saleNumber}\n` +
        `Date: ${new Date(s.createdAt).toLocaleString('fr-FR')}\n` +
        `Client: ${s.customerName}\n` +
        `------------------------\n` +
        `${lines}\n` +
        `------------------------\n` +
        `*Total: ${formatMoney(s.totalAmount, s.currency)}*\n` +
        `*Payé: ${formatMoney(s.paidAmount, s.currency)} (${s.paymentMethod})*\n` +
        (s.remainingAmount > 0 ? `*Reste à payer (Dette): ${formatMoney(s.remainingAmount, s.currency)}*\n` : '') +
        `Caissier: ${s.userName}\n` +
        `${settings.receiptFooterText}`
      );
    }
    if (selectedReceiptPayment) {
      const p = selectedReceiptPayment;
      return encodeURIComponent(
        `*${settings.companyName}*\n` +
        `Reçu de Recouvrement N° ${p.receiptNumber}\n` +
        `Date: ${new Date(p.createdAt).toLocaleString('fr-FR')}\n` +
        `Client: ${p.customerName}\n` +
        `Réf Vente: ${p.saleNumber}\n` +
        `------------------------\n` +
        `*Montant Encaissé: ${formatMoney(p.amount, p.currency)}*\n` +
        `Mode: ${p.paymentMethod}\n` +
        `Caissier: ${p.userName}\n` +
        `------------------------\n` +
        `Merci pour votre règlement !`
      );
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 my-8 print:border-none print:shadow-none print:rounded-none print:m-0 print:w-full">
        {/* Header bar (Hidden in print) */}
        <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">
              {selectedReceiptSale ? 'Facture / Reçu de Vente' : 'Reçu de Recouvrement'}
            </span>
          </div>
          <button
            onClick={closeReceipt}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Content */}
        <div className="p-6 text-sm font-sans" id="printable-receipt">
          {/* Company Branding */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              {settings.companyName}
            </h2>
            <p className="text-xs text-slate-600 font-medium">{settings.slogan}</p>
            <p className="text-[11px] text-slate-500 mt-1">{settings.address}</p>
            <p className="text-[11px] text-slate-500">Tél: {settings.phone}</p>
            <div className="flex justify-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
              <span>RCCM: {settings.rcm}</span>
              <span>IdNat: {settings.idNat}</span>
            </div>
          </div>

          {/* Ticket Metadata */}
          {selectedReceiptSale && (
            <>
              <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reçu N° :</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceiptSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Heure :</span>
                  <span>{new Date(selectedReceiptSale.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Caissier :</span>
                  <span className="font-semibold">{selectedReceiptSale.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client :</span>
                  <span className="font-bold text-blue-700">
                    {selectedReceiptSale.customerName}
                    {selectedReceiptSale.customerCategory && ` (Cat. ${selectedReceiptSale.customerCategory})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type de Vente :</span>
                  <span className="font-semibold uppercase text-slate-800">
                    {selectedReceiptSale.type === 'COMPTANT' ? 'Comptant (100% Réglé)' : selectedReceiptSale.type === 'PARTIEL' ? 'Partiel (Acompte + Crédit)' : 'Crédit (Non réglé)'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Devise de transaction :</span>
                  <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {selectedReceiptSale.currency} ({selectedReceiptSale.currency === 'USD' ? 'Dollar américain' : 'Franc congolais'})
                  </span>
                </div>
                {selectedReceiptSale.currency === 'CDF' && (
                  <div className="flex justify-between text-[11px] text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    <span>Taux officiel appliqué :</span>
                    <span className="font-mono font-bold">
                      1 USD = {(selectedReceiptSale.exchangeRateApplied || settings.exchangeRateUsdToCdf).toLocaleString('fr-FR')} CDF
                    </span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-3 border-b border-dashed border-slate-300">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-200 pb-1 text-left">
                      <th className="pb-1">Article</th>
                      <th className="text-right pb-1">Qté</th>
                      <th className="text-right pb-1">P.U</th>
                      <th className="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceiptSale.items.map((item, idx) => (
                      <tr key={idx} className="py-1">
                        <td className="py-1 pr-1">
                          <div className="font-medium text-slate-800">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.productSku}</div>
                        </td>
                        <td className="text-right py-1 text-slate-600 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="text-right py-1 text-slate-600 whitespace-nowrap">
                          {formatMoney(item.unitPrice, selectedReceiptSale.currency)}
                        </td>
                        <td className="text-right py-1 font-semibold text-slate-900 whitespace-nowrap">
                          {formatMoney(item.subtotal, selectedReceiptSale.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total :</span>
                  <span>{formatMoney(selectedReceiptSale.subtotal, selectedReceiptSale.currency)}</span>
                </div>
                {selectedReceiptSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Remise accordée :</span>
                    <span>-{formatMoney(selectedReceiptSale.discount, selectedReceiptSale.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>NET À PAYER ({selectedReceiptSale.currency}) :</span>
                  <span className="text-base text-blue-800 font-mono">
                    {formatMoney(selectedReceiptSale.totalAmount, selectedReceiptSale.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold pt-1">
                  <span>Montant Encaissé ({selectedReceiptSale.paymentMethod === 'MIXTE' ? 'Paiement Mixte USD/CDF' : selectedReceiptSale.paymentMethod}) :</span>
                  <span className="text-emerald-700 font-mono">
                    {formatMoney(selectedReceiptSale.paidAmount, selectedReceiptSale.currency)}
                  </span>
                </div>

                {(selectedReceiptSale.paymentMethod === 'MIXTE' || (selectedReceiptSale.paidAmountUsd !== undefined && selectedReceiptSale.paidAmountUsd > 0 && selectedReceiptSale.paidAmountCdf !== undefined && selectedReceiptSale.paidAmountCdf > 0)) && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px] font-mono">
                    <div className="font-bold text-slate-800 text-[10px] uppercase">Détail du paiement mixte reçu :</div>
                    <div className="flex justify-between text-emerald-700">
                      <span>• Recette en USD ($) :</span>
                      <span className="font-bold">{selectedReceiptSale.paidAmountUsd?.toLocaleString('fr-FR')} $</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>• Recette en CDF (FC) :</span>
                      <span className="font-bold">{selectedReceiptSale.paidAmountCdf?.toLocaleString('fr-FR')} FC</span>
                    </div>
                  </div>
                )}
                {selectedReceiptSale.remainingAmount > 0 && (
                  <div className="flex justify-between font-bold text-rose-600 pt-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    <span>SOLDE RESTANT (CRÉANCE) :</span>
                    <span className="font-mono">{formatMoney(selectedReceiptSale.remainingAmount, selectedReceiptSale.currency)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Debt Payment Receipt (Conforme Exigence Section 3) */}
          {selectedReceiptPayment && (
            <div className="py-3 border-b border-dashed border-slate-300 space-y-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center mb-2">
                <div className="text-emerald-800 font-bold text-sm uppercase">Reçu de Recouvrement de Créance</div>
                <div className="text-[11px] text-emerald-600">Encaissement et déduction de dette enregistrés</div>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Reçu N° :</span>
                <span className="font-mono font-bold text-slate-900">{selectedReceiptPayment.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Heure :</span>
                <span>{new Date(selectedReceiptPayment.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">1. Client débiteur :</span>
                <span className="font-bold text-slate-900">{selectedReceiptPayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">2. Réf. vente d'origine :</span>
                <span className="font-mono font-semibold text-blue-700">{selectedReceiptPayment.saleNumber}</span>
              </div>

              {/* Historique Créance */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 mt-2">
                {selectedReceiptPayment.debtInitialAmount !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>3. Montant initial créance :</span>
                    <span className="font-mono font-medium">{formatMoney(selectedReceiptPayment.debtInitialAmount, selectedReceiptPayment.currency)}</span>
                  </div>
                )}
                {selectedReceiptPayment.debtPreviousPaidAmount !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>4. Déjà remboursé :</span>
                    <span className="font-mono text-emerald-600">{formatMoney(selectedReceiptPayment.debtPreviousPaidAmount, selectedReceiptPayment.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 font-medium pt-1 border-t border-slate-200">
                  <span>6. Devise référence créance :</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceiptPayment.currency}</span>
                </div>
              </div>

              {/* Devise et Taux appliqué */}
              <div className="flex justify-between">
                <span className="text-slate-500">7. Devise reçue en caisse :</span>
                <span className="font-bold font-mono text-emerald-700">
                  {selectedReceiptPayment.paymentCurrency || selectedReceiptPayment.currency}
                </span>
              </div>

              {(selectedReceiptPayment.paymentCurrency && selectedReceiptPayment.paymentCurrency !== selectedReceiptPayment.currency) && (
                <div className="flex justify-between text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
                  <span className="font-semibold">8. Taux de change appliqué :</span>
                  <span className="font-mono font-bold">
                    1 USD = {(selectedReceiptPayment.exchangeRateApplied || settings.exchangeRateUsdToCdf).toLocaleString('fr-FR')} CDF
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">Mode d'encaissement :</span>
                <span className="font-semibold">{selectedReceiptPayment.paymentMethod}</span>
              </div>
              {selectedReceiptPayment.reference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Réf. transaction :</span>
                  <span className="font-mono">{selectedReceiptPayment.reference}</span>
                </div>
              )}

              {/* Montants et soldes */}
              <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 space-y-1.5 mt-2">
                <div className="flex justify-between items-center text-slate-800 font-bold">
                  <span>MONTANT REÇU EN CAISSE :</span>
                  <span className="text-emerald-700 font-mono text-sm">
                    {formatMoney(
                      selectedReceiptPayment.amountReceived !== undefined
                        ? selectedReceiptPayment.amountReceived
                        : selectedReceiptPayment.amount,
                      selectedReceiptPayment.paymentCurrency || selectedReceiptPayment.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 text-[11px]">
                  <span>Équivalent déduit de la créance :</span>
                  <span className="font-mono font-semibold">
                    -{formatMoney(selectedReceiptPayment.amount, selectedReceiptPayment.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-900 font-bold pt-1 border-t border-slate-300">
                  <span>9. Solde restant après encaissement :</span>
                  <span className="font-mono text-rose-600 font-black">
                    {formatMoney(
                      selectedReceiptPayment.remainingBalanceAfter !== undefined
                        ? selectedReceiptPayment.remainingBalanceAfter
                        : 0,
                      selectedReceiptPayment.currency
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Encaissé par :</span>
                <span className="font-medium">{selectedReceiptPayment.userName}</span>
              </div>
            </div>
          )}

          {/* Footer Notice */}
          <div className="text-center pt-4 space-y-1">
            <p className="text-[11px] text-slate-600 font-medium">{settings.receiptFooterText}</p>
            <div className="pt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Authentifié par Calina Gestion Système Sécurisé</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Print & WhatsApp) */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le reçu</span>
          </button>

          <a
            href={`https://wa.me/?text=${getWhatsAppShareText()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Partager WhatsApp</span>
          </a>

          <button
            onClick={closeReceipt}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
