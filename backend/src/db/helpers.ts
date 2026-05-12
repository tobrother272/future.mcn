/**
 * Lightweight DB helper utilities — raw pg pool queries.
 * Keeps the codebase simple without a full ORM.
 */
import { pool } from "./pool.js";
import type { QueryResult, QueryResultRow } from "pg";

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const res = await pool.query<T>(sql, params);
  return res.rows[0] ?? null;
}

export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query<T>(sql, params);
  return res.rows;
}

/** Build WHERE clause from filter map. Returns { sql, params, offset } */
export function buildWhere(
  filters: Record<string, unknown>,
  startOffset = 1
): { where: string; params: unknown[]; nextOffset: number } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let idx = startOffset;

  for (const [key, val] of Object.entries(filters)) {
    if (val === undefined || val === null || val === "") continue;
    if (key === "search") {
      // Full-text search against name
      parts.push(`name ILIKE $${idx}`);
      params.push(`%${String(val)}%`);
    } else {
      parts.push(`${key} = $${idx}`);
      params.push(val);
    }
    idx++;
  }

  return {
    where: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    params,
    nextOffset: idx,
  };
}

/** Generic pagination helper */
export function buildPagination(
  page = 1,
  limit = 50,
  nextOffset: number,
  sortBy = "created_at",
  sortDir: "asc" | "desc" = "desc",
  allowedSortCols: string[] = []
): { sql: string; params: unknown[] } {
  const safeSort = allowedSortCols.includes(sortBy) ? sortBy : "created_at";
  const safeDir = sortDir === "asc" ? "ASC" : "DESC";
  const offset = (Math.max(1, page) - 1) * Math.min(500, limit);
  const pageLimit = Math.min(500, limit);
  return {
    sql: `ORDER BY ${safeSort} ${safeDir} LIMIT $${nextOffset} OFFSET $${nextOffset + 1}`,
    params: [pageLimit, offset],
  };
}
