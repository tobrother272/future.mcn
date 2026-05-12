/**
 * migrate-from-blob.ts
 * Chuyển dữ liệu từ JSON blob (store table key "app-state") sang relational tables.
 * Chạy: npx tsx src/db/migrate-from-blob.ts
 * Idempotent: ON CONFLICT DO UPDATE → an toàn khi chạy nhiều lần.
 */

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://meridian:meridian@localhost:5432/meridian",
});

// ── Types from old blob ──────────────────────────────────────
interface BlobChannel {
  id?: string;
  ytId?: string;
  name?: string;
  cms?: string;
  partner?: string;
  topic?: string;
  topicId?: string;
  dept?: string;
  category?: string;
  country?: string;
  subscribers?: number;
  monthlyViews?: number;
  monthlyRevenue?: number;
  monetization?: string;
  health?: string;
  strikes?: number;
  syncStatus?: string;
  status?: string;
  joinedDate?: string;
  watchTimeHours?: number;
  engagedViews?: number;
}

interface BlobPartner {
  id?: string;
  name?: string;
  type?: string;
  tier?: string;
  revShare?: number;
  email?: string;
  country?: string;
  status?: string;
  dept?: string;
}

interface BlobContract {
  id?: string;
  partnerId?: string;
  partnerName?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  status?: string;
  revShare?: number;
  paymentTerms?: string;
  monthlyMinimum?: number;
  terms?: string;
}

interface BlobViolation {
  id?: string;
  channelId?: string;
  channel?: string;
  cms?: string;
  type?: string;
  severity?: string;
  status?: string;
  videoTitle?: string;
  videoUrl?: string;
  date?: string;
  resolvedDate?: string;
  notes?: string;
}

interface BlobUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  status?: string;
}

interface AppBlob {
  channels?: BlobChannel[];
  partners?: BlobPartner[];
  contracts?: BlobContract[];
  violations?: BlobViolation[];
  users?: BlobUser[];
  cmsList?: Array<{ id: string; name: string; currency: string }>;
  partnerSharing?: Array<Record<string, unknown>>;
  adsenseActivities?: Array<Record<string, unknown>>;
}

// ── Helpers ──────────────────────────────────────────────────
function sanitizeStatus(val: string | undefined, allowed: string[], fallback: string): string {
  return allowed.includes(val ?? "") ? (val as string) : fallback;
}

function safeDate(val: string | undefined): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ── Main migration ────────────────────────────────────────────
async function run() {
  const client = await pool.connect();
  try {
    // 1. Load blob from store table
    const { rows } = await client.query<{ value: AppBlob }>(
      `SELECT value FROM store WHERE key = 'app-state' LIMIT 1`
    );
    if (rows.length === 0 || !rows[0]) {
      console.log("No app-state blob found in store. Nothing to migrate.");
      return;
    }
    const blob: AppBlob = rows[0].value;
    console.log("Blob loaded:", {
      channels: blob.channels?.length ?? 0,
      partners: blob.partners?.length ?? 0,
      contracts: blob.contracts?.length ?? 0,
      violations: blob.violations?.length ?? 0,
    });

    await client.query("BEGIN");

    // 2. Migrate CMS list
    if (blob.cmsList?.length) {
      for (const cms of blob.cmsList) {
        await client.query(
          `INSERT INTO cms (id, name, currency, status)
           VALUES ($1, $2, $3, 'Active')
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, currency = EXCLUDED.currency`,
          [cms.id, cms.name, cms.currency || "USD"]
        );
      }
      console.log(`✓ CMS: ${blob.cmsList.length}`);
    }

    // 3. Migrate Partners
    const partnerIdByName = new Map<string, string>();
    if (blob.partners?.length) {
      for (const p of blob.partners) {
        const id = p.id ?? `P_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const name = (p.name ?? "").trim();
        if (!name) continue;
        await client.query(
          `INSERT INTO partner (id, name, email, type, tier, rev_share, dept, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE
             SET name = EXCLUDED.name, type = EXCLUDED.type, tier = EXCLUDED.tier,
                 rev_share = EXCLUDED.rev_share, status = EXCLUDED.status, updated_at = NOW()`,
          [
            id, name, p.email ?? null,
            sanitizeStatus(p.type, ["OWNED","PRODUCTION","AFFILIATE"], "AFFILIATE"),
            sanitizeStatus(p.tier, ["Premium","Standard","Basic"], "Standard"),
            p.revShare ?? 70,
            p.dept ?? null,
            sanitizeStatus(p.status, ["Active","Suspended","Terminated"], "Active"),
          ]
        );
        partnerIdByName.set(name.toLowerCase(), id);
      }
      console.log(`✓ Partners: ${blob.partners.length}`);
    }

    // 4. Migrate Channels
    const channelIdMap = new Map<string, string>(); // old id → new id
    if (blob.channels?.length) {
      // Build CMS name → id map
      const { rows: cmsRows } = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM cms`
      );
      const cmsByName = new Map(cmsRows.map(r => [r.name.toLowerCase(), r.id]));

      for (const ch of blob.channels) {
        const id = ch.id ?? `C_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const name = (ch.name ?? "").trim();
        if (!name) continue;

        const cmsId = ch.cms ? (cmsByName.get(ch.cms.toLowerCase()) ?? null) : null;
        const partnerId = ch.partner ? (partnerIdByName.get(ch.partner.toLowerCase()) ?? null) : null;

        await client.query(
          `INSERT INTO channel (
             id, cms_id, partner_id, yt_id, name, country, status, monetization, health,
             strikes, subscribers, monthly_views, monthly_revenue, metadata, created_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (id) DO UPDATE
             SET cms_id = EXCLUDED.cms_id, partner_id = EXCLUDED.partner_id,
                 yt_id = EXCLUDED.yt_id, name = EXCLUDED.name,
                 monthly_views = EXCLUDED.monthly_views, monthly_revenue = EXCLUDED.monthly_revenue,
                 metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            id, cmsId, partnerId,
            ch.ytId?.trim() || null,
            name,
            ch.country ?? "VN",
            sanitizeStatus(ch.status, ["Active","Pending","Suspended","Terminated"], "Active"),
            sanitizeStatus(ch.monetization, ["On","Off"], "Off"),
            sanitizeStatus(ch.health, ["Healthy","Warning","Critical"], "Healthy"),
            ch.strikes ?? 0,
            ch.subscribers ?? 0,
            ch.monthlyViews ?? 0,
            ch.monthlyRevenue ?? 0,
            JSON.stringify({
              watchTimeHours: ch.watchTimeHours ?? null,
              engagedViews: ch.engagedViews ?? null,
              dept: ch.dept ?? null,
              topic: ch.topic ?? null,
              joinedDate: ch.joinedDate ?? null,
            }),
            ch.joinedDate ? new Date(ch.joinedDate) : new Date(),
          ]
        );
        channelIdMap.set(ch.id ?? id, id);
      }
      console.log(`✓ Channels: ${blob.channels.length}`);
    }

    // 5. Migrate Contracts
    if (blob.contracts?.length) {
      for (const ct of blob.contracts) {
        const id = ct.id ?? `CT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const partnerId = ct.partnerId ?? (ct.partnerName
          ? partnerIdByName.get(ct.partnerName.toLowerCase())
          : null);
        if (!partnerId) continue;

        const startDate = safeDate(ct.startDate) ?? new Date().toISOString().slice(0, 10);
        await client.query(
          `INSERT INTO contract (id, partner_id, contract_name, type, start_date, end_date, signed_date,
             status, rev_share, payment_terms, monthly_minimum)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE
             SET status = EXCLUDED.status, rev_share = EXCLUDED.rev_share,
                 end_date = EXCLUDED.end_date, updated_at = NOW()`,
          [
            id, partnerId,
            ct.id ?? id,
            sanitizeStatus(ct.type, ["OWNED","PRODUCTION","AFFILIATE"], "AFFILIATE"),
            startDate,
            safeDate(ct.endDate),
            safeDate(ct.signedDate),
            sanitizeStatus(ct.status, ["Draft","Active","Expired","Terminated"], "Active"),
            ct.revShare ?? null,
            ct.paymentTerms ?? "Net 30",
            ct.monthlyMinimum ?? 0,
          ]
        );
      }
      console.log(`✓ Contracts: ${blob.contracts.length}`);
    }

    // 6. Migrate Violations
    // After migration 013 the legacy columns (type, video_title, video_url,
    // notes, resolved_date, metadata, channel_name, channel_url) were dropped.
    // We map blob fields onto the canonical columns: videoTitle → name,
    // notes → content, severity is kept, resolvedDate goes into
    // `violation_resolution` (skipped here — done by API after the fact).
    if (blob.violations?.length) {
      for (const v of blob.violations) {
        const id = v.id ?? `V_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const channelId = v.channelId ? channelIdMap.get(v.channelId) ?? v.channelId : null;
        const name = (v.videoTitle && v.videoTitle.trim()) || v.type || "Vi phạm không có tên";
        await client.query(
          `INSERT INTO violation
             (id, channel_id, name, severity, status, content, detected_date, video_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO NOTHING`,
          [
            id, channelId,
            name,
            sanitizeStatus(v.severity, ["Low","Medium","High","Critical"], "Medium"),
            sanitizeStatus(v.status, ["Active","Resolved","Appealed","Dismissed"], "Active"),
            v.notes ?? "",
            safeDate(v.date),
            v.videoUrl ?? null,
          ]
        );
      }
      console.log(`✓ Violations: ${blob.violations.length}`);
    }

    // 7. Migrate Internal Users
    if (blob.users?.length) {
      for (const u of blob.users) {
        if (!u.email || !u.id) continue;
        const validRoles = ["SUPER_ADMIN","ADMIN","QC_REVIEWER","CHANNEL_CREATOR",
          "CONTENT_MANAGER","FINANCE_MANAGER","COMPLIANCE_MANAGER","VIEWER"];
        const role = validRoles.includes(u.role ?? "") ? u.role! : "VIEWER";
        await client.query(
          `INSERT INTO account (id, account_type, email, full_name, password_hash, role, status)
           VALUES ($1,'internal',$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO UPDATE
             SET email = EXCLUDED.email, role = EXCLUDED.role, status = EXCLUDED.status`,
          [
            u.id, u.email, u.name ?? u.email,
            "$2b$12$placeholder_hash_not_valid",   // must reset password after migration
            role,
            sanitizeStatus(u.status, ["Active","Suspended"], "Active"),
          ]
        );
      }
      console.log(`✓ Users: ${blob.users.length}`);
    }

    await client.query("COMMIT");
    console.log("\n✅ Migration completed successfully!");
    console.log("⚠️  All migrated users have placeholder password hashes.");
    console.log("   Run password reset flow before going live.");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
