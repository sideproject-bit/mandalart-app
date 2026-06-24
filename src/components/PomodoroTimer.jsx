import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { ChevronDown, ChevronUp } from "lucide-react";

const COLS = 9;
const ROWS = 5;
const TOTAL = COLS * ROWS; // 45 cells = 45 minutes max

function cellIndex(row, col) {
  return row * COLS + col;
}

export default function PomodoroTimer({ t, pal, dark }) {
  const p = t.pomodoro;

  // duration in minutes (0 = not set)
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [goal, setGoal] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== "undefined" ? Notification.permission === "granted" : false
  );

  // drag state
  const [dragging, setDragging] = useState(false);
  const [dragEnd, setDragEnd] = useState(null);

  const intervalRef = useRef(null);
  const synth = useRef(null);

  // pending drag start cell
  const dragStart = useRef(null);

  const elapsedMinutes = Math.floor(elapsed / 60);
  const remainingMinutes = Math.max(0, duration - elapsedMinutes);
  const remainingSeconds = Math.max(0, duration * 60 - elapsed);

  // cells filled = duration; cells cleared = elapsed minutes
  function cellState(idx) {
    if (duration === 0) return "empty";
    if (idx >= duration) return "empty";
    // cells clear left-to-right as time passes
    const clearedCells = Math.floor(elapsed / 60);
    if (idx < clearedCells) return "cleared";
    return "filled";
  }

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= duration * 60) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setFinished(true);
            fireComplete();
            return duration * 60;
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, duration]);

  function fireComplete() {
    // Sound
    try {
      const s = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1 } }).toDestination();
      s.triggerAttackRelease("C5", "8n");
      setTimeout(() => s.triggerAttackRelease("E5", "8n"), 300);
      setTimeout(() => s.triggerAttackRelease("G5", "4n"), 600);
    } catch (_) {}

    // Notification
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(p.notifTitle, { body: p.notifBody(goal) });
    }
  }

  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((r) => {
      setNotifGranted(r === "granted");
    });
  }

  // Drag handlers
  function getCellFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return null;
    const idx = el.dataset?.cellIdx;
    return idx != null ? parseInt(idx) : null;
  }

  function handleCellPointerDown(idx) {
    dragStart.current = idx;
    setDragging(true);
    setDragEnd(idx);
    setDuration(idx + 1);
    setElapsed(0);
    setFinished(false);
  }

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const cell = getCellFromEvent(e);
    if (cell != null) {
      setDragEnd(cell);
      const newDuration = Math.max(dragStart.current, cell) + 1;
      setDuration(newDuration);
      setElapsed(0);
      setFinished(false);
    }
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  function handleStart() {
    if (duration === 0) return;
    setRunning(true);
    setFinished(false);
  }
  function handlePause() { setRunning(false); }
  function handleResume() { setRunning(true); }
  function handleReset() {
    setRunning(false);
    setElapsed(0);
    setFinished(false);
  }

  const ink = pal.ink;
  const bg = pal.bg;
  const accent = pal.accent;

  // display timer
  const dispMin = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const dispSec = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px", color: ink, fontFamily: "inherit" }}>
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
          background: dark ? "#1e1d16" : "#fff",
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
            {p.minutesLeft(remainingMinutes)}
          </div>
        )}
      </div>

      {/* 5×9 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 4,
          userSelect: "none",
          marginBottom: 20,
          touchAction: "none",
        }}
      >
        {Array.from({ length: TOTAL }).map((_, idx) => {
          const state = cellState(idx);
          let cellBg;
          if (state === "filled") cellBg = accent;
          else if (state === "cleared") cellBg = dark ? "#2a2920" : "#e0ddd2";
          else cellBg = dark ? "#252418" : "#e8e5da";

          return (
            <div
              key={idx}
              data-cell-idx={idx}
              onPointerDown={() => handleCellPointerDown(idx)}
              style={{
                height: 32,
                borderRadius: 4,
                background: cellBg,
                cursor: running ? "default" : "pointer",
                transition: "background 0.12s",
                border: state === "filled" ? "none" : `1px solid ${dark ? "#333" : "#d0cdc0"}`,
              }}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {!running && !finished && (
          <button
            onClick={elapsed > 0 ? handleResume : handleStart}
            disabled={duration === 0}
            style={btnStyle(accent, "#fff", duration === 0 ? 0.4 : 1)}
          >
            {elapsed > 0 ? p.resume : p.start}
          </button>
        )}
        {running && (
          <button onClick={handlePause} style={btnStyle(dark ? "#444" : "#ccc", ink, 1)}>
            {p.pause}
          </button>
        )}
        {(elapsed > 0 || finished) && (
          <button onClick={handleReset} style={btnStyle(dark ? "#333" : "#e0ddd0", ink, 1)}>
            {p.reset}
          </button>
        )}
      </div>

      {/* Notification permission */}
      {!notifGranted && (
        <div style={{
          fontSize: 12, color: dark ? "#aaa" : "#888",
          textAlign: "center", marginBottom: 16, cursor: "pointer",
          textDecoration: "underline",
        }} onClick={requestNotifPermission}>
          {p.notifPermission}
        </div>
      )}

      {/* About section toggle */}
      <button
        onClick={() => setShowAbout((v) => !v)}
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
