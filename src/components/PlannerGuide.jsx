import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useViewport } from "../hooks/useViewport";

const STEP_VISUALS = [
  // Step 1: drag on grid
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {Array.from({ length: 18 }).map((_, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        const selected = row === 1 && col >= 1 && col <= 4;
        return (
          <rect key={i}
            x={30 + col * 24} y={12 + row * 24} width={22} height={22}
            fill={selected ? accent + "66" : "#ffffff08"}
            stroke={selected ? accent : "#ffffff18"} strokeWidth={selected ? 1.5 : 1} rx={2}
          />
        );
      })}
      {/* drag arrow */}
      <path d="M54,74 L126,74" fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
      <polygon points="126,70 132,74 126,78" fill={accent} opacity={0.6} />
      <text x={90} y={10} textAnchor="middle" fill={accent} fontSize={8} fontWeight={700} opacity={0.7}>DRAG TO SELECT</text>
    </svg>
  ),
  // Step 2: event popup
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      <rect x={20} y={8} width={140} height={74} rx={6} fill="#ffffff08" stroke={accent} strokeWidth={1.5} />
      <rect x={30} y={20} width={120} height={18} rx={3} fill="#ffffff0d" stroke="#ffffff18" strokeWidth={1} />
      <text x={40} y={33} fill={accent} fontSize={10} opacity={0.8}>Event name</text>
      <rect x={30} y={44} width={14} height={14} rx={3} fill="#FFAAAA" />
      <rect x={48} y={44} width={14} height={14} rx={3} fill="#FFE599" />
      <rect x={66} y={44} width={14} height={14} rx={3} fill="#AAD4FF" />
      <rect x={84} y={44} width={14} height={14} rx={3} fill="#C7382E" stroke={accent} strokeWidth={2} />
      <rect x={102} y={44} width={14} height={14} rx={3} fill="#C8960A" />
      <rect x={120} y={44} width={14} height={14} rx={3} fill="#1A2A9E" />
      <rect x={110} y={65} width={40} height={12} rx={3} fill={accent} />
      <text x={130} y={74} textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700}>ADD</text>
    </svg>
  ),
  // Step 3: todo list
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {[
        { y: 18, done: true,  text: "Morning standup" },
        { y: 42, done: false, text: "Review PR" },
        { y: 66, done: false, text: "Write tests" },
      ].map(({ y, done, text }) => (
        <g key={y}>
          <rect x={20} y={y} width={14} height={14} rx={3}
            fill={done ? accent : "#ffffff08"} stroke={done ? accent : "#ffffff25"} strokeWidth={1} />
          {done && <polyline points={`23,${y+7} ${27},${y+11} ${32},${y+4}`}
            fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
          <text x={42} y={y+10} fill={done ? "#ffffff44" : "#fff"} fontSize={10}
            textDecoration={done ? "line-through" : "none"} opacity={done ? 0.4 : 0.85}>{text}</text>
        </g>
      ))}
    </svg>
  ),
  // Step 4: weekly time grid
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {/* Day headers */}
      {["M","T","W","T","F","S","S"].map((d, i) => (
        <rect key={`h${i}`} x={22 + i * 22} y={6} width={20} height={12} rx={2}
          fill={i === 2 ? accent + "44" : "#ffffff0a"}
          stroke={i === 2 ? accent : "#ffffff18"} strokeWidth={i === 2 ? 1.2 : 0.5} />
      ))}
      {["M","T","W","T","F","S","S"].map((d, i) => (
        <text key={`l${i}`} x={32 + i * 22} y={16} textAnchor="middle"
          fill={i === 2 ? accent : "#fff"} fontSize={7} fontWeight={i === 2 ? 800 : 400} opacity={0.7}>{d}</text>
      ))}
      {/* Hour rows */}
      {[0,1,2,3,4].map(row => (
        Array.from({ length: 7 }).map((_, col) => (
          <rect key={`${row}-${col}`} x={22 + col * 22} y={22 + row * 13} width={20} height={11} rx={1}
            fill="#ffffff06" stroke="#ffffff10" strokeWidth={0.5} />
        ))
      ))}
      {/* Event block on Wednesday */}
      <rect x={23} y={35} width={18} height={23} rx={2} fill={accent + "bb"} />
      <rect x={67} y={22} width={18} height={13} rx={2} fill={"#AAD4FF99"} />
    </svg>
  ),
  // Step 5: monthly calendar with dot
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {Array.from({ length: 35 }).map((_, i) => {
        const col = i % 7, row = Math.floor(i / 7);
        const d = i - 3 + 1;
        const hasEvent = [8, 15, 22].includes(d);
        const isToday  = d === 12;
        return (
          <g key={i}>
            <rect x={14 + col * 22} y={16 + row * 14} width={20} height={12} rx={2}
              fill={isToday ? accent + "33" : "#ffffff06"}
              stroke={isToday ? accent : "#ffffff10"} strokeWidth={isToday ? 1 : 0.5} />
            {d >= 1 && d <= 31 && (
              <text x={24 + col * 22} y={25 + row * 14} textAnchor="middle"
                fill={isToday ? accent : "#fff"} fontSize={7} fontWeight={isToday ? 700 : 400} opacity={d >= 1 ? 0.7 : 0}>
                {d}
              </text>
            )}
            {hasEvent && d >= 1 && (
              <circle cx={24 + col * 22} cy={27 + row * 14} r={1.5} fill={accent} />
            )}
          </g>
        );
      })}
    </svg>
  ),
];

// Mobile-only extra steps: scroll rail + procrastinate/delete swipe
const MOBILE_VISUALS = [
  // Scroll rail
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      {Array.from({ length: 18 }).map((_, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        return (
          <rect key={i} x={14 + col * 22} y={12 + row * 24} width={20} height={22}
            fill="#ffffff08" stroke="#ffffff18" strokeWidth={1} rx={2} />
        );
      })}
      {/* rail */}
      <rect x={150} y={12} width={18} height={70} rx={3} fill={accent + "22"} stroke={accent} strokeWidth={1.2} />
      <text x={159} y={50} textAnchor="middle" fill={accent} fontSize={7} fontWeight={700} writingMode="tb" opacity={0.9}>SCROLL</text>
      <path d="M159,20 l-3,4 h6 z" fill={accent} />
      <path d="M159,74 l-3,-4 h6 z" fill={accent} />
    </svg>
  ),
  // Procrastinate / delete swipe
  ({ accent }) => (
    <svg width={180} height={90} viewBox="0 0 180 90">
      <rect x={30} y={20} width={120} height={22} rx={4} fill="#ffffff0d" stroke="#2B3DCB" strokeWidth={1.2} />
      <path d="M44,31 l64,0" stroke="#2B3DCB" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
      <polygon points="108,27 114,31 108,35" fill="#2B3DCB" opacity={0.8} />
      <text x={120} y={34} fill="#2B3DCB" fontSize={7} fontWeight={700}>TMRW</text>
      <rect x={30} y={50} width={120} height={22} rx={4} fill="#ffffff0d" stroke="#C7382E" strokeWidth={1.2} />
      <path d="M134,61 l-44,0" stroke="#C7382E" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7} />
      <polygon points="90,57 84,61 90,65" fill="#C7382E" opacity={0.8} />
      <text x={78} y={64} textAnchor="end" fill="#C7382E" fontSize={7} fontWeight={700}>DELETE</text>
    </svg>
  ),
];

export default function PlannerGuide({ t, pal, onClose, onDontShow }) {
  const [step,     setStep]     = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const { isMobile } = useViewport();
  const pg    = t.plannerGuide;
  const steps   = isMobile ? [...pg.steps, ...(pg.mobileSteps ?? [])] : pg.steps;
  const visuals = isMobile ? [...STEP_VISUALS, ...MOBILE_VISUALS] : STEP_VISUALS;
  const isLast = step === steps.length - 1;
  const Visual = visuals[step];

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
            {pg.dontShow}
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
              {isLast ? pg.close : "Next"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
