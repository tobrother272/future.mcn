import { useEffect, type ReactNode } from "react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number | string;
  footer?: ReactNode;
  /** Cho phép click ra ngoài để đóng modal. Mặc định true. */
  closeOnOverlay?: boolean;
};

export function Modal({ open, onClose, title, children, width = 600, footer, closeOnOverlay = true }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={closeOnOverlay ? onClose : undefined}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          boxShadow: SHADOW.lg,
          width, maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {title && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{title}</h3>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            padding: "12px 20px",
            borderTop: `1px solid ${C.border}`,
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
