import assert from 'node:assert/strict';

// Mock browser window & localStorage before importing martAuthSecurity
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
};

(globalThis as any).window = { localStorage: mockLocalStorage };
(globalThis as any).localStorage = mockLocalStorage;

// Enforce 100% offline execution: fail immediately if fetch is invoked
(globalThis as any).fetch = () => {
  throw new Error('Network call attempted during offline password verification!');
};

import {
  isAppUnlocked,
  unlockWithPassword,
  verifyAppUnlockPassword,
  cleanupLegacyAuthStorage,
  UNLOCK_STORAGE_KEY,
} from '../src/utils/martAuthSecurity';

const targetPassword = ['Waqas', String.fromCharCode(64), '786'].join('');

// Seed existing business data & legacy auth keys
const sampleInventory = JSON.stringify([{ id: 'P-1', name: 'Basmati Rice 5kg', salePrice: 1850, stock: 24 }]);
const sampleTransactions = JSON.stringify([{ invoiceNumber: 'INV-1001', grandTotal: 1850 }]);
const sampleCustomers = JSON.stringify([{ id: 'C-1', name: 'Ali Khan', balance: 500 }]);
const sampleLedgers = JSON.stringify([{ id: 'L-1', customerId: 'C-1', amount: 500 }]);
const samplePurchases = JSON.stringify([{ id: 'PUR-1', total: 15000 }]);
const sampleSuppliers = JSON.stringify([{ id: 'S-1', name: 'Punjab Mills' }]);

mockLocalStorage.setItem('waqas_mart_inventory_v6', sampleInventory);
mockLocalStorage.setItem('waqas_mart_transactions_v6', sampleTransactions);
mockLocalStorage.setItem('waqas_mart_customers_v6', sampleCustomers);
mockLocalStorage.setItem('waqas_mart_customer_ledgers_v6', sampleLedgers);
mockLocalStorage.setItem('waqas_mart_purchases_v6', samplePurchases);
mockLocalStorage.setItem('waqas_mart_suppliers_v6', sampleSuppliers);
mockLocalStorage.setItem('waqas_mart_auth_session', JSON.stringify({ role: 'SOFTWARE_OWNER' }));
mockLocalStorage.setItem('waqas_mart_active_password_v2', 'OLD-SECRET');
mockLocalStorage.setItem('waqas_mart_password_history_v2', '[]');
mockLocalStorage.setItem('waqas_mart_app_pin_hash_v6', 'oldpinhash');

// 1. First launch must start locked even if old session existed
cleanupLegacyAuthStorage();
assert.equal(isAppUnlocked(), false, 'First launch must start locked');
assert.equal(mockLocalStorage.getItem('waqas_mart_auth_session'), null, 'Legacy session should be removed');

// 2. Wrong passwords must fail and stay locked
const wrongInputs = [
  '',
  'waqas@786',
  'WAQAS@786',
  'wrong-password',
  'waqas?887711',
  'MART-7860-9921-3KT3',
  ` ${targetPassword} `,
  `${targetPassword}1`,
];

for (const wrong of wrongInputs) {
  assert.equal(verifyAppUnlockPassword(wrong), false, `Expected wrong password rejection`);
  const res = unlockWithPassword(wrong);
  assert.equal(res.success, false, 'Expected unlockWithPassword to fail for wrong input');
  assert.ok(res.error && res.error.length > 0, 'Expected clear error message on wrong password');
  assert.equal(isAppUnlocked(), false, 'App must remain locked after wrong password');
}

// 3. Correct initial password unlocks offline
const unlockResult = unlockWithPassword(targetPassword);
assert.equal(unlockResult.success, true, 'Expected initial password to unlock app');
assert.equal(isAppUnlocked(), true, 'App must be unlocked after successful unlock');

// 4. Verify localStorage contains zero plaintext password
const savedRaw = mockLocalStorage.getItem(UNLOCK_STORAGE_KEY);
assert.ok(savedRaw, 'Signed unlock record should exist in localStorage');
assert.equal(savedRaw!.includes(targetPassword), false, 'Plaintext password must NEVER be stored in localStorage');
for (const [k, v] of store.entries()) {
  assert.equal(v.includes(targetPassword), false, `Plaintext password leaked in storage key ${k}`);
}

// 5. Simulate subsequent launch / refresh -> stays unlocked
assert.equal(isAppUnlocked(), true, 'Subsequent launch must open unlocked without re-prompting');

// 6. Tampered storage record must NOT validate
const parsed = JSON.parse(savedRaw!);
mockLocalStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify({ ...parsed, unlockedAt: parsed.unlockedAt + 1 }));
assert.equal(isAppUnlocked(), false, 'Tampered unlock record must fail signature check');

// Restore valid record and verify business data preservation
mockLocalStorage.setItem(UNLOCK_STORAGE_KEY, savedRaw!);
assert.equal(isAppUnlocked(), true, 'Valid unlock record passes after restore');
assert.equal(mockLocalStorage.getItem('waqas_mart_inventory_v6'), sampleInventory, 'Inventory preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_transactions_v6'), sampleTransactions, 'Transactions preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_customers_v6'), sampleCustomers, 'Customers preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_customer_ledgers_v6'), sampleLedgers, 'Customer ledgers preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_purchases_v6'), samplePurchases, 'Purchases preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_suppliers_v6'), sampleSuppliers, 'Suppliers preserved');

console.log('ALL OFFLINE PASSWORD LOCK TESTS PASSED');
