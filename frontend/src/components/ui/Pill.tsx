import type { CSSProperties, ReactNode } from "react";
import { C } from "@/styles/theme";

type PillColor = "blue" | "green" | "red" | "amber" | "purple" | "cyan" | "gray" | "teal" | "orange";

type PillProps = {
  children: ReactNode;
  color?: PillColor;
  dot?: boolean;
  style?: CSSProperties;
};

const colorMap: Record<PillColor, { bg: string; text: string; dot: string }> = {
  blue:   { bg: `${C.blue}20`,   text: C.blueLight, dot: C.blue },
  green:  { bg: `${C.green}20`,  text: C.green,     dot: C.green },
  red:    { bg: `${C.red}20`,    text: C.red,        dot: C.red },
  amber:  { bg: `${C.amber}20`,  text: C.amber,     dot: C.amber },
  purple: { bg: `${C.purple}20`, text: C.purple,    dot: C.purple },
  cyan:   { bg: `${C.cyan}20`,   text: C.cyan,      dot: C.cyan },
  teal:   { bg: `${C.teal}20`,   text: C.teal,      dot: C.teal },
  orange: { bg: `${C.orange}20`, text: C.orange,    dot: C.orange },
  gray:   { bg: `${C.bgHover}`,  text: C.textSub,   dot: C.textMuted },
};

export function Pill({ children, color = "gray", dot = false, style }: PillProps) {
  const colors = colorMap[color];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.03em",
        background: colors.bg,
        color: colors.text,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: colors.dot, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
