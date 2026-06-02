export type PeriodKey = "7" | "28" | "90" | "180" | "365" | "lifetime" | "this_month" | "last_month";

export interface PeriodOption {
  key: PeriodKey;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "7",          label: "7 ngày" },
  { key: "28",         label: "28 ngày" },
  { key: "90",         label: "90 ngày" },
  { key: "180",        label: "180 ngày" },
  { key: "365",        label: "365 ngày" },
  { key: "lifetime",   label: "Toàn thời gian" },
  { key: "this_month", label: "Tháng này" },
  { key: "last_month", label: "Tháng trước" },
];

export interface PeriodParams {
  days?: number;
  from?: string;
  to?: string;
  period?: string;
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayInputDate(): string {
  return toDateInputValue(new Date());
}

export function periodToParams(key: PeriodKey): PeriodParams {
  const today = new Date();
  if (key === "lifetime") {
    return { period: "lifetime" };
  }
  if (key === "this_month") {
    const from = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
    const to = toDateInputValue(today);
    return { from, to };
  }
  if (key === "last_month") {
    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthEnd = new Date(firstOfThisMonth.getTime() - 86400_000);
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    return {
      from: toDateInputValue(lastMonthStart),
      to:   toDateInputValue(lastMonthEnd),
    };
  }
  return { days: Number(key) };
}
