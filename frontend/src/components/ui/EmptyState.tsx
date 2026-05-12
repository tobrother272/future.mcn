import type { CSSProperties, ReactNode } from "react";
import { C } from "@/styles/theme";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
};

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 24px", gap: 12, textAlign: "center",
      ...style,
    }}>
      {icon && (
        <div style={{ color: C.textMuted, marginBottom: 4 }}>{icon}</div>
      )}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textSub }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 360, lineHeight: 1.5 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
