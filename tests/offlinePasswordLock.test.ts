import assert from 'node:assert/strict';

// Mock browser window & localStorage/sessionStorage before importing martAuthSecurity
const store = new Map<string, string>();
const sessionStore = new Map<string, string>();
const createMockStorage = (map: Map<string, string>) => ({
  getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
  setItem: (key: string, value: string) => {
    map.set(key, String(value));
  },
  removeItem: (key: string) => {
    map.delete(key);
  },
  clear: () => {
    map.clear();
  },
});

const mockLocalStorage = createMockStorage(store);
const mockSessionStorage = createMockStorage(sessionStore);

(globalThis as any).window = { localStorage: mockLocalStorage, sessionStorage: mockSessionStorage };
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;

// Enforce 100% offline execution: fail immediately if fetch is invoked
(globalThis as any).fetch = () => {
  throw new Error('Network call attempted during offline password verification!');
};

import {
  isAppUnlocked,
  unlockWithPassword,
  verifyAppUnlockPassword,
  cleanupLegacyAuthStorage,
  resetSessionUnlockState,
  UNLOCK_STORAGE_KEY,
} from '../src/utils/martAuthSecurity';

const targetPassword = ['Waqas', String.fromCharCode(64), '786'].join('');

// Seed existing business data & legacy auth/persistent-unlock keys
const sampleInventory = JSON.stringify([{ id: 'P-1', name: 'Basmati Rice 5kg', salePrice: 1850, stock: 24 }]);
const sampleTransactions = JSON.stringify([{ invoiceNumber: 'INV-1001', grandTotal: 1850 }]);
const sampleCustomers = JSON.stringify([{ id: 'C-1', name: 'Ali Khan', balance: 500 }]);
const sampleLedgers = JSON.stringify([{ id: 'L-1', customerId: 'C-1', amount: 500 }]);
const samplePurchases = JSON.stringify([{ id: 'PUR-1', total: 15000 }]);
const sampleSuppliers = JSON.stringify([{ id: 'S-1', name: 'Punjab Mills' }]);
const sampleHeldBills = JSON.stringify([{ id: 'H-1', items: [{ id: 'P-1', qty: 2 }], grandTotal: 3700 }]);

mockLocalStorage.setItem('waqas_mart_inventory_v6', sampleInventory);
mockLocalStorage.setItem('waqas_mart_transactions_v6', sampleTransactions);
mockLocalStorage.setItem('waqas_mart_customers_v6', sampleCustomers);
mockLocalStorage.setItem('waqas_mart_customer_ledgers_v6', sampleLedgers);
mockLocalStorage.setItem('waqas_mart_purchases_v6', samplePurchases);
mockLocalStorage.setItem('waqas_mart_suppliers_v6', sampleSuppliers);
mockLocalStorage.setItem('waqas_mart_held_bills_v6', sampleHeldBills);
mockLocalStorage.setItem('waqas_mart_auth_session', JSON.stringify({ role: 'SOFTWARE_OWNER' }));
mockLocalStorage.setItem('waqas_mart_active_password_v2', 'OLD-SECRET');
mockLocalStorage.setItem('waqas_mart_password_history_v2', '[]');
mockLocalStorage.setItem('waqas_mart_app_pin_hash_v6', 'oldpinhash');
mockLocalStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify({ version: 1, unlocked: true }));

// 1. Launch #1 must start locked even if legacy or prior unlock records existed
cleanupLegacyAuthStorage();
assert.equal(isAppUnlocked(), false, 'First launch must start locked');
assert.equal(mockLocalStorage.getItem('waqas_mart_auth_session'), null, 'Legacy session should be removed');
assert.equal(mockLocalStorage.getItem(UNLOCK_STORAGE_KEY), null, 'Persistent device unlock key must be removed');

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

// 3. Correct password unlocks offline for the current launch session
const unlockResult = unlockWithPassword(targetPassword);
assert.equal(unlockResult.success, true, 'Expected password to unlock current launch session');
assert.equal(isAppUnlocked(), true, 'App must remain unlocked during normal in-session navigation');

// 4. Verify localStorage and sessionStorage contain zero unlock tokens or plaintext passwords
assert.equal(mockLocalStorage.getItem(UNLOCK_STORAGE_KEY), null, 'Unlock state must NEVER persist in localStorage');
assert.equal(mockSessionStorage.getItem(UNLOCK_STORAGE_KEY), null, 'Unlock state must NEVER persist in sessionStorage');
for (const [k, v] of store.entries()) {
  assert.equal(v.includes(targetPassword), false, `Plaintext password leaked in storage key ${k}`);
}

// 5. Simulate navigating across multiple pages in the same launch -> stays unlocked without re-prompting
for (const page of ['Home', 'Sale POS', 'New Sale POS', 'Purchase Entry', 'Total Stock', 'Sale Summary', 'Settings']) {
  assert.equal(isAppUnlocked(), true, `Navigation to ${page} must remain unlocked in the same launch session`);
}

// 6. Simulate a brand new app launch (closing & reopening app) -> MUST require password again
resetSessionUnlockState();
cleanupLegacyAuthStorage();
assert.equal(isAppUnlocked(), false, 'Every new app launch must start locked and ask for password again');

// 7. Wrong password on Launch #2 fails, correct password unlocks again
assert.equal(unlockWithPassword('wrong').success, false, 'Wrong password must fail on subsequent launch');
assert.equal(isAppUnlocked(), false, 'App stays locked after wrong password on Launch #2');
assert.equal(unlockWithPassword(targetPassword).success, true, 'Correct password unlocks on Launch #2');
assert.equal(isAppUnlocked(), true, 'Launch #2 active session is unlocked');

// 8. Verify all real business data remained 100% preserved across lock/unlock & new launches
assert.equal(mockLocalStorage.getItem('waqas_mart_inventory_v6'), sampleInventory, 'Inventory preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_transactions_v6'), sampleTransactions, 'Transactions preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_customers_v6'), sampleCustomers, 'Customers preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_customer_ledgers_v6'), sampleLedgers, 'Customer ledgers preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_purchases_v6'), samplePurchases, 'Purchases preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_suppliers_v6'), sampleSuppliers, 'Suppliers preserved');
assert.equal(mockLocalStorage.getItem('waqas_mart_held_bills_v6'), sampleHeldBills, 'Held bills preserved');

console.log('ALL OFFLINE PASSWORD LOCK TESTS PASSED');
