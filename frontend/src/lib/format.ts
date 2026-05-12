/** Compact number formatter: 1,234,567 → 1.23M — also handles string numbers from DB */
export function fmt(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (isNaN(v)) return "—";
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(v) >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)         return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

export function fmtCurrency(amount: number | string | null | undefined, currency = "USD"): string {
  if (amount == null || amount === "") return "—";
  const v = Number(amount);
  if (isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, notation: "compact", maximumFractionDigits: 1,
  }).format(v);
}

export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function fmtDelta(delta: number | null | undefined): { text: string; color: string } {
  if (delta == null) return { text: "—", color: "#5a6075" };
  const isPos = delta >= 0;
  return {
    text: `${isPos ? "+" : ""}${delta.toFixed(1)}%`,
    color: isPos ? "#4ade80" : "#f87171",
  };
}
