import type { CSSProperties, ReactNode } from "react";
import { C } from "@/styles/theme";

type FieldProps = {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: CSSProperties;
};

export function Field({ label, children, error, hint, required, style }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <label style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: C.textMuted }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
    </div>
  );
}
