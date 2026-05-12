import { C } from "@/styles/theme";

type Status = "Active" | "Inactive" | "Pending" | "Suspended" | "Critical" | "Warning" | "Healthy" | string;

const statusColors: Record<string, string> = {
  Active:    C.green,
  Healthy:   C.green,
  On: C.green,
  Monetized: C.green,
  Inactive:  C.textMuted,
  Pending:   C.amber,
  Warning:   C.amber,
  Suspended: C.orange,
  Critical:  C.red,
  Off: C.red,
  Demonetized: C.red,
  Terminated:  C.textMuted,
};

export function StatusDot({ status, label }: { status: Status; label?: string }) {
  const color = statusColors[status] ?? C.textMuted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: color,
        boxShadow: `0 0 6px ${color}80`, flexShrink: 0,
      }} />
      {label !== undefined ? (
        <span style={{ fontSize: 12, color }}>{label ?? status}</span>
      ) : (
        <span style={{ fontSize: 12, color }}>{status}</span>
      )}
    </span>
  );
}
