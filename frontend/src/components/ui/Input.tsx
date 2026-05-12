import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { C, RADIUS } from "@/styles/theme";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, style, ...props }, ref) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {label && (
          <label style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>{label}</label>
        )}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {icon && (
            <span style={{
              position: "absolute", left: 10, color: C.textMuted,
              display: "flex", alignItems: "center",
            }}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            {...props}
            style={{
              width: "100%",
              background: C.bgInput,
              border: `1px solid ${error ? C.red : C.border}`,
              borderRadius: RADIUS.md,
              color: C.text,
              fontSize: 13,
              padding: icon ? "7px 10px 7px 32px" : "7px 10px",
              outline: "none",
              transition: "border-color 0.15s",
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error ? C.red : C.blue;
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? C.red : C.border;
              props.onBlur?.(e);
            }}
          />
        </div>
        {error && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
