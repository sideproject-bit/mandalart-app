import React, { useState, useEffect } from "react";
import { Globe, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const SLIDE_ACCENT = ["#2B3DCB", "#C7382E", "#E3B22E", "#2B3DCB", "#C7382E"];

const SLIDES = {
  en: [
    {
      label: "00",
      title: ["One goal.", "Eight paths.", "Sixty-four steps."],
      body: "Mandalart is a 9×9 goal-setting framework built around a single central goal — a method used by Shohei Ohtani at age 16.",
      visual: "intro",
    },
    {
      label: "01",
      title: ["Start with", "the center."],
      body: "Place your main goal at the center of the grid. This one cell is the seed — every other cell exists to serve it.",
      visual: "center",
    },
    {
      label: "02",
      title: ["Branch into", "8 sub-goals."],
      body: "The 8 surrounding cells become sub-goals — different angles, dimensions, and areas of your main ambition.",
      visual: "branch",
    },
    {
      label: "03",
      title: ["64 concrete", "actions."],
      body: "Each sub-goal expands into 8 daily action items. 8 paths × 8 steps = 64 habits that compound into real progress.",
      visual: "steps",
    },
    {
      label: "04",
      title: ["Write it", "as done."],
      body: "Phrase every entry in the present tense, as if already achieved. It changes how you think — and how you act.",
      visual: "done",
    },
  ],
  ko: [
    {
      label: "00",
      title: ["하나의 목표.", "여덟 갈래.", "예순네 걸음."],
      body: "만다라트는 하나의 핵심 목표를 중심으로 한 9×9 목표 설정 프레임워크예요. 오타니 쇼헤이가 16살에 사용한 방법으로 유명해졌어요.",
      visual: "intro",
    },
    {
      label: "01",
      title: ["중앙에서", "시작하세요."],
      body: "9×9 그리드의 정중앙에 메인 목표를 적어요. 이 하나의 칸이 씨앗 — 나머지 모든 칸은 여기서 자라납니다.",
      visual: "center",
    },
    {
      label: "02",
      title: ["8개의", "하위 목표로."],
      body: "주변 8칸이 각각 하위 목표가 돼요. 같은 꿈을 다른 방향과 차원으로 바라보는 8개의 관점이에요.",
      visual: "branch",
    },
    {
      label: "03",
      title: ["64가지", "구체적인 행동."],
      body: "각 하위 목표가 8개의 실행 항목으로 펼쳐져요. 8 × 8 = 64가지 일상 습관이 쌓여 실제 변화가 됩니다.",
      visual: "steps",
    },
    {
      label: "04",
      title: ["이미 이룬", "것처럼."],
      body: "모든 항목을 현재형으로 — 이미 달성한 것처럼 적어보세요. 적힌 문장이 생각과 행동 모두를 바꿔요.",
      visual: "done",
    },
  ],
};

// ── SVG Visuals ──────────────────────────────────────────
const C = { red: "#C7382E", blue: "#2B3DCB", yellow: "#E3B22E", cream: "#F0EBE0" };
const CELL = 36, GAP = 4;
const pos = (i) => ({ x: (i % 3) * (CELL + GAP), y: Math.floor(i / 3) * (CELL + GAP) });

function GridVisual({ type }) {
  const size = 3 * CELL + 2 * GAP;

  if (type === "intro") {
    const fills = [C.red, C.cream, C.blue, C.cream, C.yellow, C.cream, C.blue, C.cream, C.red];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {fills.map((f, i) => { const p = pos(i); return <rect key={i} x={p.x} y={p.y} width={CELL} height={CELL} fill={f} />; })}
      </svg>
    );
  }

  if (type === "center") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: 9 }).map((_, i) => {
          const p = pos(i), isC = i === 4;
          return <rect key={i} x={p.x} y={p.y} width={CELL} height={CELL} fill={isC ? C.yellow : "#ffffff18"} />;
        })}
        {/* Spotlight ring */}
        <rect x={pos(4).x - 3} y={pos(4).y - 3} width={CELL + 6} height={CELL + 6} fill="none" stroke={C.yellow} strokeWidth={2.5} />
      </svg>
    );
  }

  if (type === "branch") {
    const cx = pos(4).x + CELL / 2, cy = pos(4).y + CELL / 2;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0,1,2,3,5,6,7,8].map(i => {
          const p = pos(i), tx = p.x + CELL / 2, ty = p.y + CELL / 2;
          return <line key={i} x1={cx} y1={cy} x2={tx} y2={ty} stroke={C.yellow} strokeWidth={1.5} strokeDasharray="3,2" opacity={0.75} />;
        })}
        {Array.from({ length: 9 }).map((_, i) => {
          const p = pos(i), isC = i === 4;
          return <rect key={i} x={p.x} y={p.y} width={CELL} height={CELL} fill={isC ? C.red : "#2B3DCB55"} />;
        })}
        {[0,1,2,3,5,6,7,8].map(i => {
          const p = pos(i);
          return <rect key={`h${i}`} x={p.x + 8} y={p.y + 8} width={CELL - 16} height={CELL - 16} fill={C.yellow} opacity={0.7} />;
        })}
      </svg>
    );
  }

  if (type === "steps") {
    const MINI = 10, MGAP = 2;
    const blockColors = [C.red, C.yellow, C.blue, C.yellow, C.red, C.blue, C.blue, C.cream, C.yellow];
    const total = 9 * MINI + 8 * MGAP + 2 * (MGAP * 2); // approximate
    const s9 = 9 * MINI + 10 * MGAP;
    return (
      <svg width={s9} height={s9} viewBox={`0 0 ${s9} ${s9}`}>
        {Array.from({ length: 81 }).map((_, i) => {
          const col = i % 9, row = Math.floor(i / 9);
          const bIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          const isCenter = row === 4 && col === 4;
          return <rect key={i}
            x={col * (MINI + MGAP)} y={row * (MINI + MGAP)}
            width={MINI} height={MINI}
            fill={isCenter ? C.yellow : blockColors[bIdx] + "80"}
          />;
        })}
      </svg>
    );
  }

  if (type === "done") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={C.cream + "18"} />
        <polyline
          points={`${size * 0.18},${size * 0.52} ${size * 0.42},${size * 0.74} ${size * 0.82},${size * 0.3}`}
          fill="none" stroke={C.yellow} strokeWidth={10} strokeLinecap="square" strokeLinejoin="miter"
        />
      </svg>
    );
  }

  return null;
}

// ── Main Component ─────────────────────────────────────
export default function WelcomeScreen({ play, onFinish }) {
  const [lang, setLang] = useState("en");
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);

  const slides = SLIDES[lang];
  const cur = slides[slide];
  const accent = SLIDE_ACCENT[slide];
  const isLast = slide === slides.length - 1;

  const FADE_MS = 600;

  const transition = (fn) => {
    setVisible(false);
    setTimeout(() => { fn(); setVisible(true); }, FADE_MS);
  };

  const goNext = () => {
    if (isLast) { setVisible(false); setTimeout(onFinish, FADE_MS); return; }
    transition(() => setSlide(s => s + 1));
    play?.("D5", "64n");
  };

  const goPrev = () => {
    if (slide === 0) return;
    transition(() => setSlide(s => s - 1));
    play?.("B4", "64n");
  };

  const skip = () => { setVisible(false); setTimeout(onFinish, FADE_MS); };

  const toggleLang = () => {
    transition(() => setLang(l => l === "en" ? "ko" : "en"));
    play?.("E5", "64n");
  };

  const A = (delay, anim = "wsFadeUp") =>
    ({ animation: `${anim} 1s cubic-bezier(0.22,1,0.36,1) ${delay}s both` });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0d0d0d",
      display: "flex", flexDirection: "column",
      fontFamily: "Helvetica, Arial, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes wsFadeUp   { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:none; } }
        @keyframes wsSlideLeft { from { opacity:0; transform:translateX(-72px); } to { opacity:1; transform:none; } }
        @keyframes wsSlideRight { from { opacity:0; transform:translateX(48px); } to { opacity:1; transform:none; } }
        @keyframes wsPopIn    { from { opacity:0; transform:scale(0.55); } to { opacity:1; transform:scale(1); } }
        @keyframes wsSlideUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Header bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 28px", background: "#111",
        borderBottom: "4px solid #000", flexShrink: 0,
        ...A(0, "wsFadeUp"),
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>
            GRIDA
          </span>
          <span style={{ fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>.app</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={toggleLang}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #ffffff25", color: "#F2EDE190", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            <Globe size={12} /> {lang === "en" ? "한국어" : "English"}
          </button>
          <button
            onClick={skip}
            style={{ background: "none", border: "none", color: "#F2EDE140", fontSize: 11, cursor: "pointer", padding: "5px 8px" }}
          >
            {lang === "en" ? "Skip →" : "건너뛰기 →"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "minmax(220px, 38%) 1fr",
        minHeight: 0,
      }}>
        {/* Left: Mondrian visual panel */}
        <div style={{
          background: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 32, position: "relative",
          transition: "background 0.5s ease",
          borderRight: "4px solid #000",
          ...A(0.12, "wsSlideLeft"),
        }}>
          {/* Corner black block */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 48, height: 48, background: "#000",
            ...A(0.38, "wsPopIn"),
          }} />
          {/* Corner color block */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: 32, height: 32,
            background: accent === "#E3B22E" ? "#C7382E" : accent === "#C7382E" ? "#E3B22E" : "#E3B22E",
            ...A(0.48, "wsPopIn"),
          }} />

          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.92)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            ...A(0.6, "wsPopIn"),
          }}>
            <GridVisual type={cur.visual} />
          </div>
        </div>

        {/* Right: Text content */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "clamp(28px, 5vw, 64px)",
          background: "#111",
          position: "relative",
          ...A(0.28, "wsSlideRight"),
        }}>
          {/* Slide number watermark */}
          <div style={{
            position: "absolute", top: 24, right: 28,
            fontWeight: 900, fontSize: 48, color: accent + "18",
            letterSpacing: "-0.05em", lineHeight: 1,
            transition: "color 0.4s ease",
            userSelect: "none",
          }}>
            {cur.label}
          </div>

          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            {/* Accent stripe */}
            <div style={{ width: 40, height: 4, background: accent, marginBottom: 24, transition: "background 0.4s ease" }} />

            {/* Title */}
            <h1 style={{
              fontWeight: 900, margin: "0 0 20px",
              fontSize: "clamp(28px, 4vw, 52px)",
              lineHeight: 1.05, letterSpacing: "-0.03em",
              color: "#F2EDE1", textTransform: "uppercase",
            }}>
              {cur.title.map((line, i) => (
                <span key={i} style={{ display: "block" }}>{line}</span>
              ))}
            </h1>

            {/* Body */}
            <p style={{
              fontSize: "clamp(13px, 1.4vw, 16px)",
              lineHeight: 1.75, color: "#F2EDE1",
              opacity: 0.7, margin: "0 0 40px",
              maxWidth: 420,
            }}>
              {cur.body}
            </p>

            {/* Navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={goPrev}
                disabled={slide === 0}
                style={{
                  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "none", border: "1px solid #ffffff20",
                  color: slide === 0 ? "#ffffff18" : "#F2EDE1",
                  cursor: slide === 0 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => transition(() => { setSlide(i); play?.("D5", "64n"); })}
                    style={{
                      width: i === slide ? 20 : 6,
                      height: 6,
                      background: i === slide ? accent : "#ffffff30",
                      border: "none", cursor: "pointer", padding: 0,
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: accent, border: "none",
                  color: accent === "#E3B22E" ? "#0d0d0d" : "#fff",
                  padding: "10px 20px", fontWeight: 800,
                  fontSize: 12, cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  transition: "background 0.4s ease",
                }}
              >
                {isLast
                  ? (lang === "en" ? "Get started" : "시작하기")
                  : (lang === "en" ? "Next" : "다음")
                }
                {isLast ? <ArrowRight size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Mondrian strip — staggered per segment */}
      <div style={{ display: "flex", height: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, background: "#C7382E", ...A(0.55, "wsSlideUp") }} />
        <div style={{ width: 4, background: "#000", ...A(0.6, "wsSlideUp") }} />
        <div style={{ flex: 2, background: "#2B3DCB", ...A(0.65, "wsSlideUp") }} />
        <div style={{ width: 4, background: "#000", ...A(0.7, "wsSlideUp") }} />
        <div style={{ flex: 1, background: "#E3B22E", ...A(0.75, "wsSlideUp") }} />
      </div>
    </div>
  );
}
