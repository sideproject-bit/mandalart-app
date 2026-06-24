import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const STEP_VISUALS = [
  // Step 1: create & manage — list of mandalarts with + button
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {[20, 42, 64].map((y, i) => (
        <rect key={y} x={20} y={y} width={110} height={16} rx={3}
          fill={i === 0 ? accent + "33" : "#ffffff08"} stroke={i === 0 ? accent : "#ffffff18"} strokeWidth={i === 0 ? 1.5 : 1} />
      ))}
      <text x={30} y={32} fill={accent} fontSize={9} fontWeight={700} opacity={0.85}>My 2024 Goals</text>
      <text x={30} y={54} fill="#fff" fontSize={9} opacity={0.45}>Career plan</text>
      <text x={30} y={76} fill="#fff" fontSize={9} opacity={0.45}>Health & fitness</text>
      <rect x={148} y={20} width={16} height={16} rx={3} fill={accent} />
      <text x={156} y={31} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>+</text>
    </svg>
  ),
  // Step 2: fill the grid — 9×9 miniature grid
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {Array.from({ length: 81 }).map((_, i) => {
        const col = i % 9, row = Math.floor(i / 9);
        const isCenter = col === 4 && row === 4;
        const isSubGoal = !isCenter && (col === 4 || row === 4) && col >= 3 && col <= 5 && row >= 3 && row <= 5;
        const isSub = (col === 4 && (row === 3 || row === 5)) || (row === 4 && (col === 3 || col === 5));
        const filled = Math.random() > 0.55;
        return (
          <rect key={i} x={16 + col * 17} y={4 + row * 9} width={15} height={7} rx={1}
            fill={isCenter ? accent : isSub ? accent + "55" : filled ? accent + "22" : "#ffffff08"}
            stroke={isCenter ? accent : "#ffffff12"} strokeWidth={isCenter ? 1 : 0.5}
          />
        );
      })}
    </svg>
  ),
  // Step 3: check & progress — shows focus-view 3×3 block with completed cells
  ({ accent }) => {
    const S = 22, G = 4;
    const done = [0, 1, 3, 4, 6]; // cells completed out of 8 (excluding center)
    const cells = Array.from({ length: 9 });
    const ox = 180 / 2 - (3 * S + 2 * G) / 2;
    const oy = 90 / 2 - (3 * S + 2 * G) / 2;
    return (
      <svg width={180} height={90} viewBox="0 0 180 90">
        {cells.map((_, i) => {
          const col = i % 3, row = Math.floor(i / 3);
          const x = ox + col * (S + G), y = oy + row * (S + G);
          const isCenter = i === 4;
          const isDone = done.includes(i);
          return (
            <g key={i}>
              <rect x={x} y={y} width={S} height={S} rx={2}
                fill={isCenter ? accent : isDone ? accent + "33" : "#ffffff0a"}
                stroke={isCenter ? accent : isDone ? accent + "88" : "#ffffff20"}
                strokeWidth={isCenter ? 1.5 : 1}
              />
              {isDone && !isCenter && (
                <polyline
                  points={`${x+5},${y+S/2} ${x+S/2-2},${y+S-6} ${x+S-5},${y+5}`}
                  fill="none" stroke={accent} strokeWidth={1.8}
                  strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              {isCenter && (
                <text x={x + S/2} y={y + S/2 + 4} textAnchor="middle"
                  fill="#fff" fontSize={9} fontWeight={800} opacity={0.9}>GOAL</text>
              )}
            </g>
          );
        })}
        {/* progress badge */}
        <rect x={138} y={8} width={34} height={16} rx={8}
          fill={accent} />
        <text x={155} y={20} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={800}>5 / 8</text>
      </svg>
    );
  },
  // Step 4: share with friends — two user icons connected
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {/* Person A */}
      <circle cx={50} cy={30} r={12} fill={accent + "33"} stroke={accent} strokeWidth={1.5} />
      <text x={50} y={35} textAnchor="middle" fill={accent} fontSize={12}>👤</text>
      <rect x={20} y={50} width={60} height={28} rx={3} fill={accent + "22"} stroke={accent + "55"} strokeWidth={1} />
      <text x={50} y={61} textAnchor="middle" fill={accent} fontSize={7} fontWeight={700}>MY MANDALART</text>
      <text x={50} y={72} textAnchor="middle" fill="#fff" fontSize={6} opacity={0.6}>Public ✓</text>
      {/* Arrow */}
      <path d="M83,60 L100,60" stroke={accent} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
      <polygon points="100,56 106,60 100,64" fill={accent} opacity={0.7} />
      {/* Person B */}
      <circle cx={130} cy={30} r={12} fill="#ffffff14" stroke="#ffffff40" strokeWidth={1} />
      <text x={130} y={35} textAnchor="middle" fill="#fff" fontSize={12} opacity={0.6}>👤</text>
      <rect x={100} y={50} width={60} height={28} rx={3} fill="#ffffff08" stroke="#ffffff18" strokeWidth={1} />
      <text x={130} y={61} textAnchor="middle" fill="#fff" fontSize={7} opacity={0.5}>VIEW ONLY</text>
      <text x={130} y={72} textAnchor="middle" fill={accent} fontSize={6} opacity={0.6}>Friend code 🔗</text>
    </svg>
  ),
];

export default function MandalartGuide({ t, pal, onClose, onDontShow }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const mg = t.mandalartGuide;
  const steps = mg.steps;
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
                transition: "background 0.3s",
              }} />
            ))}
          </div>
          <button onClick={handleClose} style={{ flexShrink: 0, background: "none", border: "none", color: pal.ink, opacity: 0.5, cursor: "pointer", padding: 2, display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        {/* Visual */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "28px 0 20px",
          background: "#1e1e1e",
          borderBottom: `1px solid ${pal.ink}12`,
        }}>
          <Visual accent={pal.accent} />
        </div>

        {/* Text */}
        <div style={{ padding: "22px 24px 0" }}>
          <h3 style={{ fontWeight: 900, fontSize: 16, textTransform: "uppercase", letterSpacing: "-0.01em", margin: "0 0 10px", color: pal.ink }}>
            {steps[step].t}
          </h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, opacity: 0.8, margin: 0, minHeight: 52, wordBreak: "keep-all" }}>
            {steps[step].b}
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px 22px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.45, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)}
              style={{ accentColor: pal.accent, cursor: "pointer" }} />
            {mg.dontShow}
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => step > 0 && setStep(s => s - 1)} disabled={step === 0} style={{
              background: "none", border: "none", color: pal.ink,
              opacity: step === 0 ? 0.2 : 0.55, cursor: step === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 4, fontSize: 12,
            }}>
              <ChevronLeft size={14} /> Prev
            </button>
            <button onClick={isLast ? handleClose : () => setStep(s => s + 1)} style={{
              background: pal.accent, color: "#fff", border: "none",
              padding: "9px 20px", fontWeight: 800, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {isLast ? mg.close : "Next"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
