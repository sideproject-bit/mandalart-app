import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const EVENT_COLORS = ["#FFAAAA", "#FFE599", "#AAD4FF", "#C7382E", "#C8960A", "#1A2A9E"];

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SharedEventForm({ pal, dark, onSave, onClose, t, error }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localToday());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [memo, setMemo] = useState("");
  const [showMemo, setShowMemo] = useState(false);
  const [saving, setSaving] = useState(false);
  const ink = pal.ink;
  const bg = pal.bg;
  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px",
    fontSize: 12, fontFamily: "inherit",
    border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6,
    background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none",
  };

  const handleSave = async () => {
    if (!title.trim() || !date || saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), date, startTime, endTime, color, memo });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        zIndex: 101, width: 320, maxWidth: "calc(100vw - 28px)",
        background: bg, color: ink, border: `2px solid ${color}`, borderRadius: 10, padding: 20,
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t?.social?.addEvent ?? "Add Event"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.5, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder={t?.social?.eventTitlePlaceholder ?? "Event title"}
          autoFocus
          style={{ ...inputStyle, marginBottom: 8 }}
        />

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8 }}
        />

        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            style={{ flex: 1, padding: "7px 8px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none" }}
          />
          <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>–</span>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            style={{ flex: 1, padding: "7px 8px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none" }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {EVENT_COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: 4, background: c, cursor: "pointer", flexShrink: 0,
              outline: color === c ? `2.5px solid ${ink}` : "none", outlineOffset: 2,
            }} />
          ))}
        </div>

        <div style={{ marginBottom: showMemo ? 8 : 0 }}>
          <button
            onClick={() => setShowMemo(v => !v)}
            style={{ background: "none", border: `1px solid ${ink}22`, color: ink, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 4 }}
          >
            {showMemo ? "▲ Memo" : "+ Memo"}
          </button>
        </div>
        {showMemo && (
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Memo…"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", marginBottom: 4 }}
          />
        )}

        {error && (
          <div style={{ fontSize: 11, color: "#C7382E", marginTop: 10, lineHeight: 1.5 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${ink}33`, color: ink, padding: "7px 14px", fontSize: 11, cursor: "pointer", borderRadius: 6 }}>
            {t?.social?.cancel ?? "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !date || saving}
            style={{
              background: title.trim() && date ? color : ink + "20",
              color: title.trim() && date ? "#fff" : ink,
              border: "none", padding: "7px 16px", fontSize: 11, fontWeight: 700,
              cursor: title.trim() && date && !saving ? "pointer" : "not-allowed",
              borderRadius: 6, opacity: title.trim() && date ? 1 : 0.5,
            }}
          >
            {saving ? "…" : (t?.social?.saveEvent ?? "Save")}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
