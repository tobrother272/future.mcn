import crypto from "node:crypto";
import { queryOne, queryMany } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";

/**
 * CMS-scoped API keys.
 *
 * Tokens are 48 bytes of crypto-random base64url (≈64 chars). We never store
 * the plaintext, only sha256(plaintext) in hex — so a leaked DB dump can't be
 * replayed. The plaintext is returned exactly once from `create()`.
 */

export interface CmsApiKey {
  id: string;
  cms_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: "Active" | "Revoked";
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const TOKEN_PREFIX = "mcn_"; // makes leaked tokens easy to grep in logs
const ALLOWED_SCOPES = ["channels:sync", "channels:read"] as const;
type Scope = typeof ALLOWED_SCOPES[number];

function hash(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function generateToken(): string {
  // 48 bytes → 64 chars base64url. Plenty of entropy (~2^384).
  return TOKEN_PREFIX + crypto.randomBytes(48).toString("base64url");
}

export const CmsApiKeyService = {
  async create(opts: {
    cms_id: string;
    name: string;
    scopes?: string[];
    created_by?: string | null;
  }): Promise<{ key: CmsApiKey; plaintext: string }> {
    const plaintext = generateToken();
    const row = await queryOne<CmsApiKey>(
      `INSERT INTO cms_api_key (id, cms_id, name, key_hash, key_prefix, scopes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, cms_id, name, key_prefix, scopes, status, created_by,
                 created_at, last_used_at, revoked_at`,
      [
        nanoid("KEY"),
        opts.cms_id,
        opts.name,
        hash(plaintext),
        plaintext.slice(0, 12),
        opts.scopes && opts.scopes.length ? opts.scopes : ["channels:sync"],
        opts.created_by ?? null,
      ],
    );
    if (!row) throw new Error("INSERT cms_api_key returned no row");
    return { key: row, plaintext };
  },

  async listByCms(cms_id: string): Promise<CmsApiKey[]> {
    return queryMany<CmsApiKey>(
      `SELECT id, cms_id, name, key_prefix, scopes, status, created_by,
              created_at, last_used_at, revoked_at
         FROM cms_api_key WHERE cms_id = $1 ORDER BY created_at DESC`,
      [cms_id],
    );
  },

  async revoke(id: string): Promise<CmsApiKey | null> {
    const row = await queryOne<CmsApiKey>(
      `UPDATE cms_api_key
          SET status = 'Revoked', revoked_at = NOW()
        WHERE id = $1 AND status = 'Active'
        RETURNING id, cms_id, name, key_prefix, scopes, status, created_by,
                  created_at, last_used_at, revoked_at`,
      [id],
    );
    return row ?? null;
  },

  /**
   * Resolve a plaintext token to its owning key row, *only* if it is Active.
   * Updates `last_used_at` as a side effect so we can audit dormant keys.
   * Returns null when the token is unknown, revoked, or malformed.
   */
  async verify(plaintext: string): Promise<CmsApiKey | null> {
    if (!plaintext || !plaintext.startsWith(TOKEN_PREFIX)) return null;
    const row = await queryOne<CmsApiKey>(
      `UPDATE cms_api_key
          SET last_used_at = NOW()
        WHERE key_hash = $1 AND status = 'Active'
        RETURNING id, cms_id, name, key_prefix, scopes, status, created_by,
                  created_at, last_used_at, revoked_at`,
      [hash(plaintext)],
    );
    return row ?? null;
  },

  hasScope(key: CmsApiKey, required: Scope): boolean {
    return key.scopes.includes(required);
  },
};
