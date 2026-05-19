/**
 * Unified channel search: name, UC (yt_id), topic name, views, revenue.
 * Queries using this must JOIN: LEFT JOIN topic t ON c.topic_id = t.id
 */
export function appendChannelSearchFilter(
  search: string | undefined,
  idx: number,
  params: unknown[],
): { sql: string; nextIdx: number } {
  const raw = search?.trim();
  if (!raw) return { sql: "", nextIdx: idx };

  const pattern = `%${raw}%`;
  const parts: string[] = [
    `c.name ILIKE $${idx}`,
    `COALESCE(c.yt_id, '') ILIKE $${idx}`,
    `COALESCE(t.name, '') ILIKE $${idx}`,
    `COALESCE(c.monthly_views::text, '') ILIKE $${idx}`,
    `COALESCE(c.total_views::text, '') ILIKE $${idx}`,
    `COALESCE(c.monthly_revenue::text, '') ILIKE $${idx}`,
    `COALESCE(c.last_revenue::text, '') ILIKE $${idx}`,
  ];
  params.push(pattern);
  let nextIdx = idx + 1;

  const num = parseChannelSearchNumber(raw);
  if (num !== null) {
    parts.push(`c.monthly_views = $${nextIdx}`);
    parts.push(`c.total_views = $${nextIdx}`);
    parts.push(`c.monthly_revenue = $${nextIdx}`);
    parts.push(`c.last_revenue = $${nextIdx}`);
    params.push(num);
    nextIdx++;
  }

  return { sql: `(${parts.join(" OR ")})`, nextIdx };
}

function parseChannelSearchNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
