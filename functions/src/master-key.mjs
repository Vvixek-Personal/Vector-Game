// Shared, salted verification record for the owner's requested Developer key.
// The browser bundle and backend never need to contain the key in plaintext.
// This is a convenience gate for the current client-side fallback, not a
// substitute for the trusted Cloud Function path. Rotate it if the key leaks.

export const MASTER_KEY_MIN_LENGTH = 8;
export const MASTER_KEY_MAX_LENGTH = 256;
export const MASTER_KEY_HASH =
  "pbkdf2-sha256$150000$be96b1104890fe821142fbdad24b67e7$6771ee61f1728eb4bdec755cde86b9d8ed6ddeea8005437db3993dc1390c2ce5";

const encoder = new TextEncoder();

function fromHex(value) {
  if (typeof value !== "string" || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** Verify a PBKDF2-SHA256 `format$iterations$salt$hash` record. */
export async function verifyMasterKeyHash(password, record = MASTER_KEY_HASH) {
  if (typeof password !== "string" || password.length < MASTER_KEY_MIN_LENGTH || password.length > MASTER_KEY_MAX_LENGTH) return false;
  if (typeof record !== "string") return false;
  const [format, iterationsText, saltText, expected] = record.split("$");
  const iterations = Number(iterationsText);
  const salt = fromHex(saltText);
  const subtle = globalThis.crypto?.subtle;
  if (format !== "pbkdf2-sha256" || !Number.isSafeInteger(iterations) || iterations < 10000 || iterations > 1000000 || salt?.length < 16 || !/^[a-f0-9]{64}$/i.test(expected || "") || !subtle) return false;
  try {
    const key = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
    return equalHex(toHex(bits), expected.toLowerCase());
  } catch {
    return false;
  }
}

export function verifyMasterKey(password) {
  return verifyMasterKeyHash(password, MASTER_KEY_HASH);
}
