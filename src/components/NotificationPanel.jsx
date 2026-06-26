import React, { useEffect, useRef } from "react";
import { X, Trash2, BellOff } from "lucide-react";

function timeAgo(ts, lang) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (lang === "ko") {
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    if (h < 24) return `${h}시간 전`;
    return `${d}일 전`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function NotifItem({ n, pal, lang, onDelete, onRead }) {
  const touchX = useRef(null);
  const [offsetX, setOffsetX] = React.useState(0);
  const [swiping, setSwiping] = React.useState(false);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; setSwiping(true); };
  const onTouchMove = (e) => {
    if (touchX.current === null) return;
    const dx = e.touches[0].clientX - touchX.current;
    if (dx < 0) setOffsetX(Math.max(dx, -80));
  };
  const onTouchEnd = () => {
    if (offsetX < -60) { onDelete(n.id); }
    else setOffsetX(0);
    setSwiping(false);
    touchX.current = null;
  };

  const bg = n.read
    ? (pal.ink === "#1B1A17" ? "#f0ece0" : "#1e1e1e")
    : pal.bg;
  const opacity = n.read ? 0.55 : 1;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Delete reveal */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 64, background: "#C7382E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Trash2 size={18} color="#fff" />
      </div>
      {/* Notification row */}
      <div
        onClick={() => !n.read && onRead(n.id)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: bg, opacity,
          padding: "12px 14px",
          borderBottom: `1px solid ${pal.ink}14`,
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.2s ease",
          cursor: n.read ? "default" : "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: pal.ink, marginBottom: 3 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: pal.ink, opacity: 0.7, lineHeight: 1.5 }}>{n.body}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 10, opacity: 0.4, color: pal.ink, whiteSpace: "nowrap" }}>{timeAgo(n.ts, lang)}</span>
            {!n.read && <span style={{ width: 7, height: 7, background: "#C7382E", borderRadius: "50%", display: "block" }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationPanel({ pal, lang, t, notifications, unreadCount, onClose, onMarkAllRead, onDelete, onRead, onClearAll }) {
  const txt = t.notifPanel || {};

  useEffect(() => { onMarkAllRead(); }, []);  // mark all read on open

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", background: pal.bg, color: pal.ink }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: `1px solid ${pal.ink}22` }}>
        <span style={{ fontWeight: 900, fontSize: 17, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          {txt.title || (lang === "ko" ? "알림" : "Notifications")}
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {notifications.length > 0 && (
            <button onClick={onClearAll} style={{ background: "none", border: "none", color: pal.ink, opacity: 0.45, cursor: "pointer", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              {txt.clearAll || (lang === "ko" ? "전체 삭제" : "Clear all")}
            </button>
          )}
          <button onClick={onClose} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, height: "60%", opacity: 0.35 }}>
            <BellOff size={36} color={pal.ink} />
            <span style={{ fontSize: 13 }}>{txt.empty || (lang === "ko" ? "알림이 없어요" : "No notifications")}</span>
          </div>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} n={n} pal={pal} lang={lang} onDelete={onDelete} onRead={onRead} />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${pal.ink}14`, fontSize: 11, opacity: 0.35, textAlign: "center" }}>
          {txt.swipeHint || (lang === "ko" ? "← 스와이프로 삭제" : "← Swipe to delete")}
        </div>
      )}
    </div>
  );
}
