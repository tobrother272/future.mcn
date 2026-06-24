/**
 * AES-256-GCM decrypt for migrating legacy encrypted passwords.
 * Only used as a one-time read-migration — new passwords are stored as plaintext.
 */
import { createDecipheriv } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const secret = process.env.CHANNEL_CRED_SECRET ?? "";
  if (secret.length !== 64) return null;
  return Buffer.from(secret, "hex");
}

/** Returns true if the string looks like an AES-GCM ciphertext (iv:tag:enc hex) */
export function isLegacyCiphertext(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p));
}

/** Attempt to decrypt legacy ciphertext. Returns null if key missing or decrypt fails. */
export function tryDecryptLegacy(ciphertext: string): string | null {
  try {
    const key = getKey();
    if (!key) return null;
    const [ivHex, tagHex, encHex] = ciphertext.split(":") as [string, string, string];
    const iv        = Buffer.from(ivHex, "hex");
    const tag       = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const decipher  = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
