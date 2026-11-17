import React, { useState } from 'react';
import { X, Trash2, PlusCircle, MinusCircle, ShoppingBag, PauseCircle, CheckCircle2, Percent, Receipt } from 'lucide-react';
import { CartItem, POSMode } from '../types/pos';
import { formatRs } from '../data/defaultProducts';

interface CartDrawerModalProps {
  isOpen: boolean;
  mode: POSMode;
  cart: CartItem[];
  subtotal: number;
  discount: number;
  taxAmount?: number;
  grandTotal: number;
  totalQty: number;
  onClose: () => void;
  onUpdateQty: (itemId: string, newQty: number) => void;
  onUpdatePrice?: (itemId: string, newPrice: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onHoldBill: () => void;
  onProceedCheckout: () => void;
  onUpdateDiscount: (amt: number) => void;
  onUpdateTax?: (amt: number) => void;
}

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({
  isOpen,
  mode,
  cart,
  subtotal,
  discount,
  taxAmount = 0,
  grandTotal,
  totalQty,
  onClose,
  onUpdateQty,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onHoldBill,
  onProceedCheckout,
  onUpdateDiscount,
  onUpdateTax,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Active Cart / موجودہ اشیاء</h3>
              <p className="text-xs text-slate-300">
                {totalQty} {totalQty === 1 ? 'item' : 'items'} · Mode: <span className="uppercase font-semibold text-emerald-400">{mode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1 bg-red-950/80 px-2 py-1 rounded-xl border border-red-400/50">
                  <button
                    type="button"
                    onClick={() => {
                      onClearCart();
                      setConfirmClear(false);
                    }}
                    className="px-2 py-1 text-[11px] font-black bg-red-600 text-white rounded-lg cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-2.5 py-1.5 text-xs font-bold text-red-300 hover:text-white hover:bg-red-600/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50 max-h-[380px]">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">ٹوکری میں کوئی آئٹم نہیں ہے</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.product.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      Stock: <span className={item.product.stock < 0 ? 'text-red-600 font-bold' : 'font-semibold'}>{item.product.stock}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-700 tabular-nums">
                      {formatRs(item.lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Unit Price & Quantity Controls */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Price Rs.</span>
                    {onUpdatePrice ? (
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 0) {
                            onUpdatePrice(item.id, v);
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none tabular-nums min-h-[36px]"
                        aria-label={`Unit price for ${item.product.name}`}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-800">{formatRs(item.unitPrice)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={item.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onUpdateQty(item.id, val);
                        }
                      }}
                      className="w-12 text-center font-black text-xs tabular-nums text-slate-900 bg-white border border-slate-200 rounded-lg py-1 min-h-[32px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      aria-label={`Quantity for ${item.product.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary */}
        {cart.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatRs(subtotal)}</span>
            </div>

            {/* Discount Input & Quick Presets */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                <span>Discount (رعایت):</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onUpdateDiscount(preset)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer min-h-[32px] ${
                      discount === preset ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {preset === 0 ? '0' : `-${preset}`}
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onUpdateDiscount(isNaN(v) || v < 0 ? 0 : v);
                  }}
                  className="w-16 px-2 py-1 text-right text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[32px]"
                  aria-label="Discount amount"
                />
              </div>
            </div>

            {/* Optional Tax / GST Input */}
            {onUpdateTax && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tax / GST (ٹیکس):</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={taxAmount || ''}
                  placeholder="0"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onUpdateTax(isNaN(v) || v < 0 ? 0 : v);
                  }}
                  className="w-24 px-2 py-1 text-right text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[32px]"
                  aria-label="Tax amount"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Total Amount</span>
                <span className="text-xl font-black text-slate-900 tabular-nums">{formatRs(grandTotal)}</span>
              </div>

              {/* Hold Bill & Checkout Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onHoldBill}
                  className="px-3.5 py-2.5 min-h-[44px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <PauseCircle className="w-4 h-4 text-amber-700" />
                  <span>Hold Bill</span>
                </button>

                <button
                  type="button"
                  onClick={onProceedCheckout}
                  className="px-5 py-2.5 min-h-[44px] bg-[#16a34a] hover:bg-green-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Checkout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

