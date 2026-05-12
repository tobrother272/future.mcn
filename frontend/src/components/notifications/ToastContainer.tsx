import { useNotificationStore } from "@/stores/notificationStore";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const iconMap = {
  success: <CheckCircle size={15} />,
  error:   <XCircle size={15} />,
  warning: <AlertTriangle size={15} />,
  info:    <Info size={15} />,
};

const colorMap = {
  success: C.green,
  error:   C.red,
  warning: C.amber,
  info:    C.blue,
};

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: C.bgCard,
            border: `1px solid ${colorMap[t.type]}40`,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOW.lg,
            padding: "12px 16px",
            minWidth: 280, maxWidth: 400,
            display: "flex", alignItems: "flex-start", gap: 10,
            pointerEvents: "auto",
            animation: "slideIn 0.2s ease",
          }}
        >
          <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
          <span style={{ color: colorMap[t.type], flexShrink: 0, marginTop: 1 }}>{iconMap[t.type]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.title}</div>
            {t.message && <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{t.message}</div>}
          </div>
          <button onClick={() => removeToast(t.id)}
            style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 2 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
