import type { ButtonHTMLAttributes, ReactNode } from "react";
import { C, RADIUS } from "@/styles/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size    = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

const variantStyles: Record<Variant, string> = {
  primary:   `background:${C.blue};color:#fff;`,
  secondary: `background:${C.bgCard};color:${C.text};border:1px solid ${C.border};`,
  ghost:     `background:transparent;color:${C.textSub};`,
  danger:    `background:${C.red};color:#fff;`,
  success:   `background:${C.green};color:#0f1117;`,
};

const sizeStyles: Record<Size, string> = {
  sm: `padding:4px 10px;font-size:11px;gap:4px;`,
  md: `padding:7px 14px;font-size:13px;gap:6px;`,
  lg: `padding:10px 20px;font-size:14px;gap:8px;`,
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle = [
    "display:inline-flex;align-items:center;justify-content:center;",
    `border-radius:${RADIUS.md};border:none;font-weight:500;transition:opacity 0.15s;`,
    "cursor:pointer;white-space:nowrap;",
    variantStyles[variant],
    sizeStyles[size],
    disabled || loading ? "opacity:0.5;cursor:not-allowed;" : "opacity:1;",
  ].join("");

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{ ...(style as React.CSSProperties) }}
      data-variant={variant}
      data-size={size}
    >
      <style>{`
        [data-variant="${variant}"][data-size="${size}"] { ${baseStyle} }
        [data-variant="${variant}"][data-size="${size}"]:hover:not(:disabled) { filter: brightness(1.1); }
        [data-variant="${variant}"][data-size="${size}"]:active:not(:disabled) { filter: brightness(0.95); }
      `}</style>
      {loading ? <SpinnerIcon size={size === "sm" ? 12 : 14} /> : icon}
      {children}
    </button>
  );
}

function SpinnerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: "spin 1s linear infinite", transformOrigin: "center" }} />
    </svg>
  );
}
