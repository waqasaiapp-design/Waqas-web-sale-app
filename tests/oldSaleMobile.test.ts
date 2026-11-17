import assert from 'node:assert/strict';
import {
  buildMobileCategoryList,
  getOldSaleMobileVisibleProducts,
  calculateCartTotals,
  removeLastCartItem,
  applyCompletedSaleStockDeduction,
} from '../src/utils/oldSaleHelpers';
import { CartItem, CategoryInfo, Product } from '../src/types/pos';

const savedProducts: Product[] = [
  {
    id: 'p1',
    barcode: '896400010001',
    sku: 'TEA-01',
    name: 'Tapal Danedar 200g',
    category: 'Groceries',
    price: 420,
    costPrice: 360,
    stock: 25,
    unit: 'Pack',
  },
  {
    id: 'p2',
    barcode: '896400010002',
    sku: 'COK-01',
    name: 'Coca Cola 1.5L',
    category: 'Beverages',
    price: 200,
    costPrice: 170,
    stock: 40,
    unit: 'Bottle',
  },
  {
    id: 'p3',
    barcode: '896400010003',
    sku: 'BIS-01',
    name: 'Sooper Biscuit Family Pack',
    category: 'Snacks',
    price: 120,
    costPrice: 95,
    stock: 15,
    unit: 'Pack',
  },
];

const savedCategories: CategoryInfo[] = [
  { id: 'ALL ITEMS', name: 'All Items' },
  { id: 'GROCERIES', name: 'Groceries' },
  { id: 'BEVERAGES', name: 'Beverages' },
];

// 1. Initial open: empty search AND null selectedCategory => zero products shown
{
  const res = getOldSaleMobileVisibleProducts(savedProducts, '', null);
  assert.equal(res.shouldDisplayProducts, false);
  assert.equal(res.visibleProducts.length, 0);
}

// 2. Selecting ALL ITEMS reveals all genuine saved products (no demo items)
{
  const res = getOldSaleMobileVisibleProducts(savedProducts, '', 'ALL ITEMS');
  assert.equal(res.shouldDisplayProducts, true);
  assert.equal(res.visibleProducts.length, 3);
  assert.equal(
    res.visibleProducts.some((p) => /al aqeeq|dubai kunafa|jazz/i.test(p.name)),
    false
  );
}

// 3. Selecting a specific category filters strictly to genuine products in that category
{
  const res = getOldSaleMobileVisibleProducts(savedProducts, '', 'Beverages');
  assert.equal(res.shouldDisplayProducts, true);
  assert.equal(res.visibleProducts.length, 1);
  assert.equal(res.visibleProducts[0].id, 'p2');
}

// 4. Barcode & text search retrieves matching genuine product even before selecting category
{
  const byBarcode = getOldSaleMobileVisibleProducts(savedProducts, '896400010001', null);
  assert.equal(byBarcode.shouldDisplayProducts, true);
  assert.equal(byBarcode.visibleProducts.length, 1);
  assert.equal(byBarcode.visibleProducts[0].name, 'Tapal Danedar 200g');

  const byMissing = getOldSaleMobileVisibleProducts(savedProducts, 'nonexistent-item', null);
  assert.equal(byMissing.shouldDisplayProducts, true);
  assert.equal(byMissing.visibleProducts.length, 0);
}

// 5. Category list builds cleanly from saved products + categories without 'ALL ITEMS' duplicate or demo categories
{
  const cats = buildMobileCategoryList(savedProducts, savedCategories);
  assert.deepEqual(cats, ['Groceries', 'Beverages', 'Snacks']);
}

// 6. Cart calculations (qty, custom price, discount, tax) & Delete One
{
  const emptyTotals = calculateCartTotals([], 0, 0);
  assert.equal(emptyTotals.totalQty, 0);
  assert.equal(emptyTotals.grandTotal, 0);

  const cart: CartItem[] = [
    {
      id: 'item-1',
      product: savedProducts[0],
      quantity: 2,
      unitPrice: 400, // edited unit price
      discountAmount: 0,
      lineTotal: 800,
    },
    {
      id: 'item-2',
      product: savedProducts[1],
      quantity: 3,
      unitPrice: 200,
      discountAmount: 0,
      lineTotal: 600,
    },
  ];

  const totals = calculateCartTotals(cart, 50, 20);
  assert.equal(totals.totalQty, 5);
  assert.equal(totals.subtotal, 1400);
  assert.equal(totals.discount, 50);
  assert.equal(totals.tax, 20);
  assert.equal(totals.grandTotal, 1370);

  const afterDeleteOne = removeLastCartItem(cart);
  assert.equal(afterDeleteOne.length, 1);
  assert.equal(afterDeleteOne[0].id, 'item-1');
}

// 7. Stock deduction runs only when sale completes
{
  const soldCart: CartItem[] = [
    {
      id: 'item-1',
      product: savedProducts[0],
      quantity: 4,
      unitPrice: 420,
      discountAmount: 0,
      lineTotal: 1680,
    },
  ];
  const updated = applyCompletedSaleStockDeduction(savedProducts, soldCart);
  assert.equal(updated.find((p) => p.id === 'p1')?.stock, 21);
  assert.equal(updated.find((p) => p.id === 'p2')?.stock, 40);
  // Original array remains untouched before checkout
  assert.equal(savedProducts.find((p) => p.id === 'p1')?.stock, 25);
}

console.log('ALL OLD SALE MOBILE HELPERS TESTS PASSED');
