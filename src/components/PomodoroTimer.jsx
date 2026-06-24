import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { ChevronDown, ChevronUp } from "lucide-react";
import BreathingBlocks from "./BreathingBlocks";

const COLS = 9;
const ROWS = 5;
const TOTAL = COLS * ROWS; // 45 minutes max

export default function PomodoroTimer({ t, pal, dark }) {
  const p = t.pomodoro;

  const [duration, setDuration] = useState(0);       // minutes
  const [elapsedMs, setElapsedMs] = useState(0);     // ms, for smooth animation
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [goal, setGoal] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== "undefined" ? Notification.permission === "granted" : false
  );

  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  const startTsRef = useRef(null);    // timestamp when current run segment started
  const baseMsRef = useRef(0);        // accumulated ms from paused segments
  const rafRef = useRef(null);
  const finishedRef = useRef(false);

  const durationMs = duration * 60 * 1000;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  // current active cell fraction remaining (1 = full, 0 = empty)
  const currentCellFraction = duration > 0 && elapsedMinutes < duration
    ? 1 - (elapsedMs % 60000) / 60000
    : 0;

  // rAF loop
  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    startTsRef.current = performance.now();

    const tick = (now) => {
      const total = baseMsRef.current + (now - startTsRef.current);
      const capped = Math.min(total, durationMs);
      setElapsedMs(capped);

      if (capped >= durationMs && !finishedRef.current) {
        finishedRef.current = true;
        setRunning(false);
        setFinished(true);
        fireComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, durationMs]);

  function fireComplete() {
    try {
      const s = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1 },
      }).toDestination();
      s.triggerAttackRelease("C5", "8n");
      setTimeout(() => s.triggerAttackRelease("E5", "8n"), 300);
      setTimeout(() => s.triggerAttackRelease("G5", "4n"), 600);
    } catch (_) {}

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(p.notifTitle, { body: p.notifBody(goal) });
    }
  }

  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((r) => setNotifGranted(r === "granted"));
  }

  // Drag
  function getCellFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const idx = el?.dataset?.cellIdx;
    return idx != null ? parseInt(idx) : null;
  }

  function handleCellPointerDown(idx) {
    dragStart.current = idx;
    setDragging(true);
    setDuration(idx + 1);
    setElapsedMs(0);
    baseMsRef.current = 0;
    finishedRef.current = false;
    setFinished(false);
    setRunning(false);
  }

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const cell = getCellFromEvent(e);
    if (cell != null) {
      const newDur = Math.max(dragStart.current ?? 0, cell) + 1;
      setDuration(newDur);
      setElapsedMs(0);
      baseMsRef.current = 0;
      finishedRef.current = false;
      setFinished(false);
    }
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  function handleStart() {
    if (duration === 0) return;
    finishedRef.current = false;
    setFinished(false);
    setRunning(true);
  }
  function handlePause() {
    baseMsRef.current += performance.now() - (startTsRef.current ?? performance.now());
    setRunning(false);
  }
  function handleResume() {
    finishedRef.current = false;
    setRunning(true);
  }
  function handleReset() {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsedMs(0);
    baseMsRef.current = 0;
    finishedRef.current = false;
    setFinished(false);
  }

  const dispMin = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const dispSec = String(remainingSeconds % 60).padStart(2, "0");

  const ink = pal.ink;
  const accent = pal.accent;
  const clearedBg = dark ? "#2a2920" : "#e0ddd2";
  const emptyBg = dark ? "#252418" : "#e8e5da";

  return (
    <div style={{ position: "relative", minHeight: "80vh", overflow: "hidden" }}>
      {/* Breathing background */}
      <BreathingBlocks accent={accent} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 520, margin: "0 auto", padding: "24px 16px",
        color: ink, fontFamily: "inherit",
      }}>
        {/* Goal input */}
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={p.goalPlaceholder}
          disabled={running}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px", fontSize: 15, fontFamily: "inherit",
            borderRadius: 8, border: `1.5px solid ${dark ? "#444" : "#ccc"}`,
            background: dark ? "#1e1d16cc" : "#ffffffcc",
            color: ink, outline: "none", marginBottom: 20,
            opacity: running ? 0.6 : 1,
          }}
        />

        {/* Timer display */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          {finished ? (
            <div style={{ fontSize: 28, fontWeight: 700, color: accent }}>{p.done}</div>
          ) : (
            <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>
              {dispMin}:{dispSec}
            </div>
          )}
          {duration > 0 && !finished && (
            <div style={{ fontSize: 13, color: dark ? "#aaa" : "#888", marginTop: 2 }}>
              {p.minutesLeft(Math.ceil(remainingMs / 60000))}
            </div>
          )}
        </div>

        {/* 5×9 grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 4,
          userSelect: "none",
          marginBottom: 20,
          touchAction: "none",
        }}>
          {Array.from({ length: TOTAL }).map((_, idx) => {
            const isCleared = idx < elapsedMinutes;
            const isCurrent = idx === elapsedMinutes && running && !finished && duration > 0 && idx < duration;
            const isFilled = idx < duration && !isCleared && !isCurrent;
            const isEmpty = idx >= duration;

            let cellBg;
            if (isEmpty) cellBg = emptyBg;
            else if (isCleared) cellBg = clearedBg;
            else if (isFilled) cellBg = accent;
            else cellBg = emptyBg; // current cell outer bg

            return (
              <div
                key={idx}
                data-cell-idx={idx}
                onPointerDown={() => handleCellPointerDown(idx)}
                style={{
                  height: 32,
                  borderRadius: 4,
                  background: isCurrent
                    ? `linear-gradient(to left, ${accent} ${currentCellFraction * 100}%, ${clearedBg} ${currentCellFraction * 100}%)`
                    : cellBg,
                  cursor: running ? "default" : "pointer",
                  border: (isFilled || isCurrent) ? "none" : `1px solid ${dark ? "#333" : "#d0cdc0"}`,
                  transition: isCurrent ? "none" : "background 0.15s",
                }}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {!running && !finished && (
            <button
              onClick={elapsedMs > 0 ? handleResume : handleStart}
              disabled={duration === 0}
              style={btnStyle(accent, "#fff", duration === 0 ? 0.4 : 1)}
            >
              {elapsedMs > 0 ? p.resume : p.start}
            </button>
          )}
          {running && (
            <button onClick={handlePause} style={btnStyle(dark ? "#444" : "#ccc", ink, 1)}>
              {p.pause}
            </button>
          )}
          {(elapsedMs > 0 || finished) && (
            <button onClick={handleReset} style={btnStyle(dark ? "#333" : "#e0ddd0", ink, 1)}>
              {p.reset}
            </button>
          )}
        </div>

        {/* Notification prompt */}
        {!notifGranted && (
          <div style={{
            fontSize: 12, color: dark ? "#aaa" : "#888",
            textAlign: "center", marginBottom: 16,
            cursor: "pointer", textDecoration: "underline",
          }} onClick={requestNotifPermission}>
            {p.notifPermission}
          </div>
        )}

        {/* About toggle */}
        <button
          onClick={() => setShowAbout(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: dark ? "#aaa" : "#888", fontSize: 13, padding: 0,
            margin: "0 auto", fontFamily: "inherit",
          }}
        >
          {p.about.title}
          {showAbout ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showAbout && (
          <div style={{
            marginTop: 16, fontSize: 13, lineHeight: 1.7,
            color: dark ? "#bbb" : "#555",
            borderTop: `1px solid ${dark ? "#333" : "#ddd"}`,
            paddingTop: 16,
          }}>
            {p.about.body.map((para, i) => (
              <p key={i} style={{ margin: "0 0 12px" }}>{para}</p>
            ))}
            <div style={{ fontWeight: 700, marginBottom: 6, color: ink }}>{p.about.tipsTitle}</div>
            <ul style={{ margin: "0 0 16px", paddingLeft: 18 }}>
              {p.about.tips.map((tip, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
              ))}
            </ul>
            <div style={{
              background: dark ? "#2a2418" : "#fff8ee",
              border: `1px solid ${dark ? "#5a4020" : "#f0d080"}`,
              borderRadius: 8, padding: "10px 14px", fontSize: 12,
            }}>
              <span style={{ fontWeight: 700 }}>{p.about.warningTitle}: </span>
              {p.about.warning}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg, color, opacity) {
  return {
    background: bg, color, opacity,
    border: "none", borderRadius: 8,
    padding: "10px 24px", fontSize: 14, fontWeight: 600,
    cursor: opacity < 1 ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}
