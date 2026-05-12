// ── Design tokens — giữ nguyên palette từ v5.1 ──────────────
export const C = {
  // Background
  bg:       "#0f1117",
  bgCard:   "#1a1d27",
  bgHover:  "#1e2132",
  bgInput:  "#12151e",
  border:   "#2a2d3e",
  borderLight: "#353850",

  // Text
  text:     "#e2e5f1",
  textSub:  "#8890a8",
  textMuted:"#5a6075",

  // Brand / Accent
  blue:     "#4f8ef7",
  blueLight:"#6ea8fe",
  purple:   "#a78bfa",
  cyan:     "#22d3ee",
  teal:     "#2dd4bf",
  green:    "#4ade80",
  amber:    "#fbbf24",
  orange:   "#fb923c",
  red:      "#f87171",
  pink:     "#f472b6",

  // Semantic
  success:  "#4ade80",
  warning:  "#fbbf24",
  error:    "#f87171",
  info:     "#4f8ef7",
} as const;

export const FONT_HEADING = "'Fraunces', Georgia, serif";
export const FONT_MONO    = "'JetBrains Mono', 'Fira Code', monospace";
export const FONT_BODY    = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const RADIUS = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export const SHADOW = {
  sm:  "0 1px 3px rgba(0,0,0,0.4)",
  md:  "0 4px 12px rgba(0,0,0,0.5)",
  lg:  "0 8px 24px rgba(0,0,0,0.6)",
  glow: (color: string) => `0 0 20px ${color}40`,
} as const;
