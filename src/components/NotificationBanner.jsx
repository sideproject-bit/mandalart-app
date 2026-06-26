import React from "react";
import { X, Bell } from "lucide-react";

export default function NotificationBanner({ banner, pal, onDismiss }) {
  if (!banner) return null;
  return (
    <>
      <style>{`
        @keyframes notifSlideDown { from { opacity:0; transform:translateY(-100%); } to { opacity:1; transform:none; } }
      `}</style>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: pal.ink, color: pal.bg,
        padding: "14px 16px",
        display: "flex", alignItems: "flex-start", gap: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        animation: "notifSlideDown 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <Bell size={16} color={pal.bg} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{banner.title}</div>
          {banner.body && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>{banner.body}</div>}
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: pal.bg, cursor: "pointer", opacity: 0.6, padding: 2, flexShrink: 0, display: "flex" }}>
          <X size={16} />
        </button>
      </div>
    </>
  );
}
