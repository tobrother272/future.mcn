import { google } from "googleapis";
import { env } from "../lib/env.js";
import { queryMany } from "../db/helpers.js";

const HEADER_ROW = [
  "YouTube Channel ID",
  "Channel Name",
  "Status",
  "Monetization",
  "Partner",
  "Topic",
  "CMS",
  "Content Owner",
];

type ChannelExportRow = {
  yt_id: string;
  name: string;
  status: string;
  monetization: string;
  partner_name: string | null;
  topic_name: string | null;
  cms_name: string | null;
  content_owner: string | null;
  subscribers: number | null;
  monthly_views: number | null;
  last_revenue: number | null;
  created_at: Date;
};

function getAuth() {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY chưa được cấu hình");
  }
  // .env stores \n as literal backslash-n; convert back to real newlines
  const privateKey = rawKey.replace(/\\n/g, "\n");

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function fetchAllChannels(): Promise<ChannelExportRow[]> {
  return queryMany<ChannelExportRow>(`
    SELECT
      c.yt_id,
      c.name,
      COALESCE(c.status, 'unknown')       AS status,
      COALESCE(c.monetization, 'unknown') AS monetization,
      p.name  AS partner_name,
      t.name  AS topic_name,
      cm.name AS cms_name,
      c.content_owner,
      c.subscribers,
      c.monthly_views,
      c.last_revenue,
      c.created_at
    FROM channel c
    LEFT JOIN partner p ON c.partner_id = p.id
    LEFT JOIN topic   t ON c.topic_id   = t.id
    LEFT JOIN cms    cm ON c.cms_id     = cm.id
    ORDER BY c.name ASC
  `);
}

function toRow(ch: ChannelExportRow): string[] {
  return [
    ch.yt_id,
    ch.name,
    ch.status ?? "",
    ch.monetization ?? "",
    ch.partner_name ?? "",
    ch.topic_name ?? "",
    ch.cms_name ?? "",
    ch.content_owner ?? "",
  ];
}

export async function exportChannelsToSheet(): Promise<{ written: number }> {
  const sheetId = env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID chưa được cấu hình");

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Lấy tên tab đầu tiên của sheet (không hardcode "Sheet1")
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const firstSheet = meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";

  const channels = await fetchAllChannels();

  // De-duplicate by yt_id (mỗi kênh chỉ xuất 1 lần)
  const seen = new Set<string>();
  const unique = channels.filter((ch) => {
    if (seen.has(ch.yt_id)) return false;
    seen.add(ch.yt_id);
    return true;
  });

  // Timestamp dòng cuối — giờ Việt Nam (UTC+7)
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tsLabel = `Cập nhật lúc ${pad(vnTime.getUTCHours())}:${pad(vnTime.getUTCMinutes())} ${pad(vnTime.getUTCDate())}/${pad(vnTime.getUTCMonth() + 1)}/${vnTime.getUTCFullYear()}`;

  const values = [HEADER_ROW, ...unique.map(toRow), [], [tsLabel]];

  // Clear toàn bộ sheet trước khi ghi
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: firstSheet,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${firstSheet}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return { written: unique.length };
}
