import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const STEP_VISUALS = [
  // Step 1: highlight center of center block in 3x3
  ({ accent }) => (
    <svg width={108} height={108} viewBox="0 0 108 108">
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const isCenter = i === 4;
        return (
          <rect key={i}
            x={col * 36 + 1} y={row * 36 + 1} width={34} height={34}
            fill={isCenter ? accent : "#ffffff0a"}
            stroke={isCenter ? accent : "#ffffff15"} strokeWidth={1}
          />
        );
      })}
      <text x={54} y={60} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>GOAL</text>
    </svg>
  ),
  // Step 2: 8 surrounding cells highlighted
  ({ accent }) => (
    <svg width={108} height={108} viewBox="0 0 108 108">
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const isSurround = i !== 4;
        const isCenter = i === 4;
        return (
          <rect key={i}
            x={col * 36 + 1} y={row * 36 + 1} width={34} height={34}
            fill={isCenter ? "#ffffff18" : isSurround ? accent + "cc" : "#ffffff0a"}
            stroke={isSurround ? accent : "#ffffff15"} strokeWidth={1}
          />
        );
      })}
      {[0,1,2,3,5,6,7,8].map(i => {
        const col = i % 3, row = Math.floor(i / 3);
        return <text key={`t${i}`} x={col * 36 + 18} y={row * 36 + 22} textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700}>SUB</text>;
      })}
    </svg>
  ),
  // Step 3: full 9x9 mini grid
  ({ accent }) => (
    <svg width={108} height={108} viewBox="0 0 108 108">
      {Array.from({ length: 81 }).map((_, i) => {
        const col = i % 9, row = Math.floor(i / 9);
        const bRow = Math.floor(row / 3), bCol = Math.floor(col / 3);
        const isBlockCenter = (row % 3 === 1) && (col % 3 === 1);
        const isMainCenter = row === 4 && col === 4;
        return (
          <rect key={i}
            x={col * 12 + (bCol * 0)} y={row * 12 + (bRow * 0)} width={11} height={11}
            fill={isMainCenter ? accent : isBlockCenter ? accent + "66" : "#ffffff0d"}
            stroke="#00000066" strokeWidth={0.5}
          />
        );
      })}
    </svg>
  ),
  // Step 4: checkmark / "done" state
  ({ accent }) => (
    <svg width={108} height={108} viewBox="0 0 108 108">
      <rect width={108} height={108} fill={accent + "18"} />
      <polyline
        points="18,56 44,80 90,30"
        fill="none" stroke={accent} strokeWidth={10}
        strokeLinecap="square" strokeLinejoin="miter"
      />
    </svg>
  ),
  // Step 5: full grid vs focus view
  ({ accent }) => (
    <svg width={108} height={108} viewBox="0 0 108 108">
      {/* Left: minimap 3x3 */}
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const isFocused = i === 4;
        return (
          <rect key={i}
            x={4 + col * 15} y={32 + row * 15} width={13} height={13}
            fill={isFocused ? accent : accent + "28"}
            stroke={isFocused ? accent : "#ffffff20"} strokeWidth={1}
          />
        );
      })}
      <text x={26} y={24} textAnchor="middle" fill={accent} fontSize={7} fontWeight={700} opacity={0.8}>MINIMAP</text>
      {/* Divider */}
      <line x1={52} y1={20} x2={52} y2={88} stroke="#ffffff18" strokeWidth={1} />
      {/* Right: large focused block 3x3 */}
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const isCenter = i === 4;
        return (
          <rect key={i}
            x={58 + col * 16} y={28 + row * 16} width={14} height={14}
            fill={isCenter ? accent + "66" : "#ffffff0d"}
            stroke="#ffffff22" strokeWidth={1}
          />
        );
      })}
      <text x={82} y={20} textAnchor="middle" fill="#fff" fontSize={7} fontWeight={700} opacity={0.6}>FOCUS</text>
    </svg>
  ),
  // Step 6: detail cells with completion check
  ({ accent }) => (
    <svg width={108} height={108} viewBox="0 0 108 108">
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const isCenter = i === 4;
        const isDone = [0, 2, 5, 6].includes(i);
        return (
          <g key={i}>
            <rect
              x={col * 36 + 1} y={row * 36 + 1} width={34} height={34}
              fill={isCenter ? accent : isDone ? accent + "38" : "#ffffff0a"}
              stroke={isCenter ? accent : isDone ? accent + "70" : "#ffffff15"} strokeWidth={1}
            />
            {isDone && (
              <polyline
                points={`${col*36+23},${row*36+20} ${col*36+27},${row*36+26} ${col*36+33},${row*36+14}`}
                fill="none" stroke={accent} strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  ),
];

export default function GridTutorial({ t, pal, onClose, onDontShow }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const steps = t.gridTutorial.steps;
  const isLast = step === steps.length - 1;
  const Visual = STEP_VISUALS[step];

  const handleClose = () => {
    if (dontShow) onDontShow();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 60,
    }}>
      <div
        className="fade-in"
        style={{
          width: 440, maxWidth: "92vw",
          background: pal.bg, color: pal.ink,
          border: `3px solid ${pal.accent}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 3, padding: "16px 16px 0" }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 3, flex: 1,
              background: i <= step ? pal.accent : pal.ink + "22",
              transition: "background 0.3s ease",
            }} />
          ))}
        </div>

        <button
          onClick={handleClose}
          style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: pal.ink, opacity: 0.5, cursor: "pointer" }}
        >
          <X size={16} />
        </button>

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
          <p style={{
            fontSize: 13.5, lineHeight: 1.65,
            opacity: 0.8, margin: 0, minHeight: 52,
          }}>
            {steps[step].b}
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px 22px" }}>
          {/* Don't show again */}
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
            {t.gridTutorial.dontShow}
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => step > 0 && setStep(s => s - 1)}
              style={{
                background: "none", border: "none",
                color: pal.ink, opacity: step === 0 ? 0.2 : 0.55,
                cursor: step === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 4, fontSize: 12,
              }}
              disabled={step === 0}
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
              {isLast ? t.gridTutorial.close : "Next"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
