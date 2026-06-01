import { useState } from "react";
import { Mail, MailOpen, Trash2, CheckCheck, Youtube, TrendingUp, TrendingDown, Bell, Inbox } from "lucide-react";
import { C } from "@/styles/theme";
import { Button } from "@/components/ui";
import {
  useInboxList, useMarkRead, useMarkAllRead, useDeleteInbox,
  type InboxMessage, type InboxChannel,
} from "@/api/inbox.api";
import { useNavigate } from "react-router-dom";

type Tab = "all" | "turned_on" | "turned_off";

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "all",        label: "Tất cả thư",           icon: <Inbox size={14} />,       color: C.blue  },
  { id: "turned_on",  label: "Kênh bật kiếm tiền",   icon: <TrendingUp size={14} />,  color: "#4ade80" },
  { id: "turned_off", label: "Kênh tắt kiếm tiền",   icon: <TrendingDown size={14} />, color: "#f87171" },
];

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ChannelList({ channels, color, label, icon }: {
  channels: InboxChannel[];
  color: string;
  label: string;
  icon: React.ReactNode;
}) {
  if (!channels.length) return null;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color, display: "flex" }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label} ({channels.length})
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {channels.map((ch) => (
          <a
            key={ch.id}
            href={`https://www.youtube.com/channel/${ch.yt_id}`}
            target="_blank" rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 7,
              background: `${color}10`, border: `1px solid ${color}30`,
              textDecoration: "none",
            }}
          >
            <Youtube size={12} color={C.red} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ch.name}
            </span>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace", flexShrink: 0 }}>
              {ch.yt_id?.slice(0, 12)}…
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function MessageCard({ msg }: { msg: InboxMessage }) {
  const markRead    = useMarkRead();
  const deleteInbox = useDeleteInbox();
  const navigate    = useNavigate();
  const [expanded, setExpanded] = useState(!msg.is_read);

  const turnedOn  = (msg.body.turned_on  ?? []) as InboxChannel[];
  const turnedOff = (msg.body.turned_off ?? []) as InboxChannel[];
  const isMonoChange = msg.type === "monetization_change";

  const handleClick = () => {
    setExpanded((p) => !p);
    if (!msg.is_read) markRead.mutate(msg.id);
  };

  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${msg.is_read ? C.border : C.blue}`,
      borderRadius: 10,
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header */}
      <div onClick={handleClick}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: msg.is_read ? `${C.textMuted}18` : `${C.blue}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {msg.is_read ? <MailOpen size={15} color={C.textMuted} /> : <Mail size={15} color={C.blue} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!msg.is_read && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, fontWeight: msg.is_read ? 500 : 700, color: C.text }}>
              {msg.title}
            </span>
            {/* Mini badges */}
            {turnedOn.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${C.green}20`, color: C.green }}>
                +{turnedOn.length} BKT
              </span>
            )}
            {turnedOff.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${C.red}20`, color: C.red }}>
                -{turnedOff.length} BKT
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>{fmtDate(msg.created_at)}</span>
            {msg.cms_id && (
              <span
                onClick={(e) => { e.stopPropagation(); navigate(`/cms/${msg.cms_id}`); }}
                style={{ fontSize: 11, color: C.blue, cursor: "pointer", textDecoration: "underline" }}
              >
                {msg.cms_id}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {!msg.is_read && (
            <button title="Đã đọc"
              onClick={(e) => { e.stopPropagation(); markRead.mutate(msg.id); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: "3px 6px", borderRadius: 5 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.blue)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
            ><MailOpen size={14} /></button>
          )}
          <button title="Xóa"
            onClick={(e) => { e.stopPropagation(); deleteInbox.mutate(msg.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: "3px 6px", borderRadius: 5 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
          ><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Body */}
      {expanded && isMonoChange && (turnedOn.length > 0 || turnedOff.length > 0) && (
        <div style={{
          padding: "12px 16px 16px",
          borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 16, flexWrap: "wrap",
        }}>
          <ChannelList channels={turnedOn}  color={C.green} label="Kênh bật kiếm tiền"  icon={<TrendingUp  size={14} />} />
          <ChannelList channels={turnedOff} color={C.red}   label="Kênh tắt kiếm tiền"  icon={<TrendingDown size={14} />} />
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading } = useInboxList({ page, limit });
  const markAllRead = useMarkAllRead();

  const allItems = data?.items ?? [];

  // Client-side tab filter
  const items = activeTab === "all"
    ? allItems
    : activeTab === "turned_on"
      ? allItems.filter((m) => (m.body.turned_on as InboxChannel[] | undefined)?.length)
      : allItems.filter((m) => (m.body.turned_off as InboxChannel[] | undefined)?.length);

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const unreadAll     = allItems.filter((m) => !m.is_read).length;
  const unreadOn      = allItems.filter((m) => !m.is_read && (m.body.turned_on  as InboxChannel[] | undefined)?.length).length;
  const unreadOff     = allItems.filter((m) => !m.is_read && (m.body.turned_off as InboxChannel[] | undefined)?.length).length;

  const unreadByTab: Record<Tab, number> = { all: unreadAll, turned_on: unreadOn, turned_off: unreadOff };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={20} color={C.blue} /> Hộp thư
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
            Thông báo thay đổi trạng thái kiếm tiền kênh
          </p>
        </div>
        {unreadAll > 0 && (
          <Button variant="ghost" size="sm" icon={<CheckCheck size={14} />}
            loading={markAllRead.isPending}
            onClick={() => void markAllRead.mutateAsync()}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {/* Gmail-style tabs */}
      <div style={{
        display: "flex", borderBottom: `2px solid ${C.border}`,
        marginBottom: 20, gap: 0,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const unread   = unreadByTab[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 20px",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: isActive ? `2px solid ${tab.color}` : "2px solid transparent",
                marginBottom: -2,
                color: isActive ? tab.color : C.textMuted,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = C.textMuted; }}
            >
              <span style={{ display: "flex", color: "inherit" }}>{tab.icon}</span>
              {tab.label}
              {unread > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                  padding: "0 5px", borderRadius: 99,
                  background: isActive ? tab.color : C.textMuted,
                  color: "#0d0f1a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>Đang tải...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
          <Bell size={36} color={C.textMuted} style={{ marginBottom: 12, opacity: 0.4, display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14 }}>Không có thư nào</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((msg) => <MessageCard key={msg.id} msg={msg} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>{page} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
