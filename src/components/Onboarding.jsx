import React, { useState } from "react";
import { X, ChevronRight } from "lucide-react";

export default function Onboarding({ t, pal, onClose, play, lang, setLang }) {
  const [i, setI] = useState(0);
  const slides = t.onboarding;
  const last = i === slides.length - 1;
  const go = (d) => { play("D5", "32n"); setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ width: 420, maxWidth: "90vw", background: pal.bg, color: pal.ink, border: `3px solid ${pal.accent3}`, padding: 28, position: "relative" }} className="fade-in">
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setLang?.(l => l === "en" ? "ko" : "en"); play?.("B4", "32n"); }} style={{ background: "none", border: `1px solid ${pal.ink}30`, color: pal.ink, cursor: "pointer", padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
            {lang === "en" ? "KO" : "EN"}
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {slides.map((_, idx) => (
            <div key={idx} style={{ height: 3, flex: 1, background: idx <= i ? pal.accent3 : pal.ink + "22" }} />
          ))}
        </div>
        <h3 style={{ fontWeight: 900, fontSize: 20, textTransform: "uppercase", margin: "0 0 10px" }}>{slides[i].t}</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.85, minHeight: 70 }}>{slides[i].b}</p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <button onClick={() => (i === 0 ? onClose() : go(-1))} style={{ background: "none", border: "none", color: pal.ink, opacity: 0.6, cursor: "pointer", fontSize: 12 }}>
            {i === 0 ? t.skip : t.prev}
          </button>
          <button
            onClick={() => (last ? onClose() : go(1))}
            style={{ background: pal.accent2, color: "#fff", border: "none", padding: "8px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            {last ? t.start : t.next} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
