import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const STEP_VISUALS = [
  // Step 1: drag across grid to set time
  ({ accent }) => (
    <svg width={160} height={80} viewBox="0 0 160 80">
      {Array.from({ length: 9 }).map((_, i) => {
        const filled = i <= 5;
        return (
          <rect key={i}
            x={i * 17 + 2} y={24} width={14} height={32}
            fill={filled ? accent : "#ffffff0d"}
            stroke={filled ? accent + "aa" : "#ffffff18"} strokeWidth={1}
            rx={2}
          />
        );
      })}
      {/* drag arrow */}
      <path d="M8,68 Q70,78 100,68" fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
      <polygon points="100,64 106,68 100,72" fill={accent} opacity={0.6} />
      <text x={80} y={18} textAnchor="middle" fill={accent} fontSize={9} fontWeight={700} opacity={0.8}>DRAG TO SET</text>
    </svg>
  ),
  // Step 2: goal input
  ({ accent }) => (
    <svg width={160} height={80} viewBox="0 0 160 80">
      <rect x={8} y={26} width={144} height={28} rx={4}
        fill="#ffffff08" stroke={accent} strokeWidth={1.5} />
      <text x={20} y={45} fill={accent} fontSize={11} fontWeight={600} opacity={0.9}>Write a report draft</text>
      {/* cursor blink */}
      <rect x={136} y={32} width={1.5} height={16} fill={accent} opacity={0.8} />
      <text x={80} y={16} textAnchor="middle" fill="#fff" fontSize={9} opacity={0.45}>WHAT ARE YOU FOCUSING ON?</text>
    </svg>
  ),
  // Step 3: cells draining
  ({ accent }) => (
    <svg width={160} height={80} viewBox="0 0 160 80">
      {Array.from({ length: 9 }).map((_, i) => {
        const cleared = i < 3;
        const current = i === 3;
        const filled = i > 3 && i <= 7;
        let fill;
        if (cleared) fill = "#ffffff0d";
        else if (current) fill = accent + "55"; // half-drained
        else if (filled) fill = accent;
        else fill = "#ffffff0d";
        return (
          <rect key={i}
            x={i * 17 + 2} y={24} width={14} height={32}
            fill={fill}
            stroke={filled || current ? accent + "88" : "#ffffff18"} strokeWidth={1}
            rx={2}
          />
        );
      })}
      {/* half-drain clip overlay for current cell */}
      <rect x={3} y={24} width={7} height={32} fill="#ffffff0d" rx={2} />
      <text x={80} y={18} textAnchor="middle" fill={accent} fontSize={9} fontWeight={700} opacity={0.7}>REAL-TIME</text>
      {/* time label */}
      <text x={80} y={70} textAnchor="middle" fill="#fff" fontSize={10} opacity={0.5} fontWeight={700}>04:23</text>
    </svg>
  ),
  // Step 4: done — checkmark
  ({ accent }) => (
    <svg width={160} height={80} viewBox="0 0 160 80">
      <rect x={20} y={12} width={120} height={56} rx={6} fill={accent + "18"} />
      <polyline
        points="40,44 66,62 120,24"
        fill="none" stroke={accent} strokeWidth={8}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  ),
];

export default function PomodoroGuide({ t, pal, onClose, onDontShow }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const pg = t.pomodoroGuide;
  const steps = pg.steps;
  const isLast = step === steps.length - 1;
  const Visual = STEP_VISUALS[step];

  const handleClose = () => {
    if (dontShow) onDontShow();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 60,
    }}>
      <div className="fade-in" style={{
        width: 420, maxWidth: "92vw",
        background: pal.bg, color: pal.ink,
        border: `3px solid ${pal.accent}`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Progress + close */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 12px 0" }}>
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                height: 3, flex: 1,
                background: i <= step ? pal.accent : pal.ink + "22",
                transition: "background 0.3s ease",
              }} />
            ))}
          </div>
          <button onClick={handleClose} style={{
            flexShrink: 0, background: "none", border: "none",
            color: pal.ink, opacity: 0.5, cursor: "pointer", padding: 2, display: "flex",
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Visual */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "28px 0 20px",
          background: pal.accent2 + "18",
          borderBottom: `1px solid ${pal.ink}12`,
        }}>
          <Visual accent={pal.accent} />
        </div>

        {/* Text */}
        <div style={{ padding: "22px 24px 0" }}>
          <h3 style={{
            fontWeight: 900, fontSize: 16,
            textTransform: "uppercase", letterSpacing: "-0.01em",
            margin: "0 0 10px", color: pal.ink,
          }}>
            {steps[step].t}
          </h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, opacity: 0.8, margin: 0, minHeight: 52 }}>
            {steps[step].b}
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px 22px" }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, opacity: 0.45, cursor: "pointer", marginBottom: 16,
          }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              style={{ accentColor: pal.accent, cursor: "pointer" }}
            />
            {pg.dontShow}
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => step > 0 && setStep(s => s - 1)}
              disabled={step === 0}
              style={{
                background: "none", border: "none",
                color: pal.ink, opacity: step === 0 ? 0.2 : 0.55,
                cursor: step === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 4, fontSize: 12,
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={isLast ? handleClose : () => setStep(s => s + 1)}
              style={{
                background: pal.accent, color: "#fff", border: "none",
                padding: "9px 20px", fontWeight: 800, fontSize: 12,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}
            >
              {isLast ? pg.close : "Next"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
