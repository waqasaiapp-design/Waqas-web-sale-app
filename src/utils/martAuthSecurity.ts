/**
 * WAQAS POS SOFTWARE - Offline Single Password Lock Engine
 *
 * Security & Launch Behavior Guarantees:
 * 1. Verifies the application password using a salted SHA-256 digest (no plaintext password stored in source code or localStorage).
 * 2. Works 100% offline with zero network, Google, Firebase, or server auth dependencies.
 * 3. Holds unlock state strictly in memory for the current launch session — every new app launch starts locked and requires the password again.
 * 4. Cleans only legacy authentication and persistent-unlock keys while preserving all business records.
 */

const UNLOCK_SALT = 'WAQAS_POS_UNLOCK_SALT_v1_2026_9F4A';
const UNLOCK_HASH = '78b925ca903aae3866fc51bd7cc8fbd2b6564520a75a471ec917c8cdde3a2f4c';
const SESSION_SIGNING_KEY = 'WAQAS_POS_SESSION_LOCK_SIGN_KEY_v2_2026_C7E2';

export const UNLOCK_STORAGE_KEY = 'waqas_pos_device_unlock_v1';

const LEGACY_AUTH_KEYS = [
  UNLOCK_STORAGE_KEY,
  'waqas_mart_auth_session',
  'waqas_mart_active_password_v2',
  'waqas_mart_password_history_v2',
  'waqas_mart_app_pin_hash_v6',
];

export interface SessionUnlockRecord {
  version: 2;
  unlocked: true;
  unlockedAt: number;
  sessionNonce: string;
  signature: string;
}

// Ephemeral in-memory unlock state for the active launch only (never persisted across app launches)
let currentLaunchUnlockRecord: SessionUnlockRecord | null = null;

/**
 * Standard RFC 6234 synchronous SHA-256 (identical output in Browser, PWA, and Node/tsx)
 */
export function sha256Hex(input: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  const hiBits = Math.floor(bitLen / 0x100000000);
  const loBits = bitLen >>> 0;
  bytes.push(
    (hiBits >>> 24) & 0xff, (hiBits >>> 16) & 0xff, (hiBits >>> 8) & 0xff, hiBits & 0xff,
    (loBits >>> 24) & 0xff, (loBits >>> 16) & 0xff, (loBits >>> 8) & 0xff, loBits & 0xff
  );

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const rotr = (v: number, n: number) => (v >>> n) | (v << (32 - n));
  const w = new Uint32Array(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3];
    let e = H[4], f = H[5], g = H[6], h = H[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H, (val) => val.toString(16).padStart(8, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function generateRandomNonce(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return sha256Hex(`${Date.now()}-${Math.random()}-${Math.random()}`).slice(0, 32);
}

function computeSessionUnlockSignature(sessionNonce: string, unlockedAt: number): string {
  return sha256Hex(`${SESSION_SIGNING_KEY}:${sessionNonce}:${unlockedAt}`);
}

/**
 * Clean up legacy login/password/persistent-unlock keys on launch without touching any POS business records.
 */
export function cleanupLegacyAuthStorage(): void {
  currentLaunchUnlockRecord = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const key of LEGACY_AUTH_KEYS) {
        window.localStorage.removeItem(key);
      }
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      for (const key of LEGACY_AUTH_KEYS) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

/**
 * Verify password offline against the embedded salted SHA-256 hash.
 */
export function verifyAppUnlockPassword(passwordInput: string): boolean {
  if (typeof passwordInput !== 'string' || passwordInput.length === 0) {
    return false;
  }
  const digest = sha256Hex(`${UNLOCK_SALT}:${passwordInput}`);
  return constantTimeEqual(digest, UNLOCK_HASH);
}

/**
 * Store signed unlock state strictly in memory for the current launch session only.
 * Never persists unlock state to localStorage so every new app launch asks for the password again.
 */
export function saveUnlockedState(): SessionUnlockRecord {
  const unlockedAt = Date.now();
  const sessionNonce = generateRandomNonce();
  const signature = computeSessionUnlockSignature(sessionNonce, unlockedAt);

  const record: SessionUnlockRecord = {
    version: 2,
    unlocked: true,
    unlockedAt,
    sessionNonce,
    signature,
  };

  cleanupLegacyAuthStorage();
  currentLaunchUnlockRecord = record;
  return record;
}

/**
 * Check whether the current active launch session has been unlocked.
 */
export function isAppUnlocked(): boolean {
  const rec = currentLaunchUnlockRecord;
  if (
    !rec ||
    rec.version !== 2 ||
    rec.unlocked !== true ||
    typeof rec.unlockedAt !== 'number' ||
    typeof rec.sessionNonce !== 'string' ||
    rec.sessionNonce.length < 16 ||
    typeof rec.signature !== 'string'
  ) {
    return false;
  }

  const expectedSignature = computeSessionUnlockSignature(rec.sessionNonce, rec.unlockedAt);
  return constantTimeEqual(rec.signature, expectedSignature);
}

/**
 * Lock the in-memory session (used on new app launch or reset).
 */
export function resetSessionUnlockState(): void {
  currentLaunchUnlockRecord = null;
}

/**
 * Unlock application for the active launch session with offline password verification.
 */
export function unlockWithPassword(passwordInput: string): { success: boolean; error?: string } {
  if (!passwordInput || passwordInput.length === 0) {
    return {
      success: false,
      error: 'Please enter the application password.',
    };
  }

  if (!verifyAppUnlockPassword(passwordInput)) {
    return {
      success: false,
      error: 'Incorrect password. Access denied.',
    };
  }

  saveUnlockedState();
  return { success: true };
}
