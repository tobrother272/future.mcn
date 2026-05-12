import type { CSSProperties, ReactNode } from "react";
import { C, RADIUS, SHADOW } from "@/styles/theme";

type CardProps = {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: string | number;
  className?: string;
};

export function Card({ children, style, onClick, hoverable = false, padding = "16px", className }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.sm,
        padding,
        cursor: onClick || hoverable ? "pointer" : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onMouseEnter={hoverable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.borderLight;
        (e.currentTarget as HTMLDivElement).style.boxShadow = SHADOW.md;
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
        (e.currentTarget as HTMLDivElement).style.boxShadow = SHADOW.sm;
      } : undefined}
    >
      {children}
    </div>
  );
}
