import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { C, RADIUS } from "@/styles/theme";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, style, children, ...props }, ref) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && (
          <label style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>{label}</label>
        )}
        <select
          ref={ref}
          {...props}
          style={{
            width: "100%",
            background: C.bgInput,
            border: `1px solid ${error ? C.red : C.border}`,
            borderRadius: RADIUS.md,
            color: C.text,
            fontSize: 13,
            padding: "7px 10px",
            outline: "none",
            cursor: "pointer",
            appearance: "auto",
            ...style,
          }}
        >
          {children}
        </select>
        {error && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";
