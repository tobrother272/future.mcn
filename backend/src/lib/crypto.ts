/**
 * AES-256-GCM symmetric encrypt/decrypt for channel credentials.
 * Key is loaded from env var CHANNEL_CRED_SECRET (32-byte hex, 64 chars).
 * Ciphertext format: <iv_hex>:<authTag_hex>:<encrypted_hex>
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.CHANNEL_CRED_SECRET ?? "";
  if (secret.length !== 64) {
    throw new Error("CHANNEL_CRED_SECRET must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(secret, "hex");
}

export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptCredential(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encHex] = parts as [string, string, string];
  const iv        = Buffer.from(ivHex,  "hex");
  const tag       = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher  = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
