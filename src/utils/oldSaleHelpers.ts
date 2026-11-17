import { CartItem, CategoryInfo, Product } from '../types/pos';

export const safeStr = (v: unknown): string => (v == null ? '' : String(v).trim());

/**
 * Computes categories dynamically from genuine saved categories and saved products.
 * Excludes 'ALL ITEMS' because the fixed 'ALL ITEMS' button is always rendered first.
 * Never injects demo or example categories.
 */
export function buildMobileCategoryList(
  products: Product[],
  categories: CategoryInfo[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addIfUnique = (rawName: unknown) => {
    const clean = safeStr(rawName);
    if (!clean) return;
    const upper = clean.toUpperCase();
    if (upper === 'ALL ITEMS' || upper === 'ALL') return;
    if (!seen.has(upper)) {
      seen.add(upper);
      result.push(clean);
    }
  };

  // First include categories found on actual saved products
  products.forEach((p) => addIfUnique(p?.category));
  // Then include user/store categories already configured in settings/DB
  categories.forEach((c) => addIfUnique(c?.name));

  return result;
}

/**
 * Controls Old Sale Mobile product visibility:
 * - On initial open (empty search AND no category tapped yet), returns shouldDisplayProducts: false
 *   so zero products are shown until user searches/scans or selects a category / ALL ITEMS.
 * - Filters strictly across genuine saved `products` only.
 */
export function getOldSaleMobileVisibleProducts(
  products: Product[],
  searchQuery: string,
  selectedCategory: string | null
): { shouldDisplayProducts: boolean; visibleProducts: Product[] } {
  const q = safeStr(searchQuery).toLowerCase();

  if (!q && selectedCategory === null) {
    return { shouldDisplayProducts: false, visibleProducts: [] };
  }

  const targetCat = selectedCategory ? safeStr(selectedCategory).toUpperCase() : null;

  const visibleProducts = products.filter((p) => {
    if (targetCat && targetCat !== 'ALL ITEMS') {
      const pCat = safeStr(p?.category).toUpperCase();
      if (pCat !== targetCat && !pCat.includes(targetCat)) {
        return false;
      }
    }

    if (q) {
      const b = safeStr(p?.barcode).toLowerCase();
      const s = safeStr(p?.sku).toLowerCase();
      const n = safeStr(p?.name).toLowerCase();
      const u = safeStr(p?.urduName).toLowerCase();
      const c = safeStr(p?.category).toLowerCase();
      return (
        b.includes(q) ||
        s.includes(q) ||
        n.includes(q) ||
        u.includes(q) ||
        c.includes(q)
      );
    }

    return true;
  });

  return { shouldDisplayProducts: true, visibleProducts };
}

export function calculateCartTotals(
  cart: CartItem[],
  discountAmount: number,
  taxAmount: number
): {
  totalQty: number;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
} {
  const totalQty = cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.lineTotal) || 0), 0);
  const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const tax = Math.max(0, Number(taxAmount) || 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);

  return { totalQty, subtotal, discount, tax, grandTotal };
}

export function removeLastCartItem(cart: CartItem[]): CartItem[] {
  if (cart.length === 0) return cart;
  return cart.slice(0, cart.length - 1);
}

export function applyCompletedSaleStockDeduction(
  products: Product[],
  soldItems: CartItem[]
): Product[] {
  return products.map((p) => {
    const match = soldItems.find((i) => i.product.id === p.id);
    if (match) {
      return { ...p, stock: p.stock - match.quantity };
    }
    return p;
  });
}
