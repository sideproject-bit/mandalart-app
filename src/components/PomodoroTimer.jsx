import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { ChevronDown, ChevronUp } from "lucide-react";
import BreathingBlocks from "./BreathingBlocks";

const COLS = 9;
const ROWS = 5;
const TOTAL = COLS * ROWS; // 45 minutes max

const LI_MAX_MS = 24 * 3600 * 1000; // locking-in stopwatch cap: 24h

export default function PomodoroTimer({ t, pal, dark, theme, notifOn, userId }) {
  const p = t.pomodoro;
  const li = p.lockin;

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

  // ── Locking-in (long-focus stopwatch) mode ──
  const [mode, setMode] = useState("timer"); // "timer" | "lockin"
  const [liElapsedMs, setLiElapsedMs] = useState(0);
  const [liRunning, setLiRunning] = useState(false);
  const [liGoalH, setLiGoalH] = useState(1);
  const [liGoalM, setLiGoalM] = useState(0);
  const [liSavedFlash, setLiSavedFlash] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const liGoalFiredRef = useRef(false);
  const recKey = `grida_lockin_${userId ?? "anon"}`;
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(recKey) ?? "[]"); } catch { return []; }
  });

  const liGoalMs = Math.min((liGoalH * 60 + liGoalM) * 60000, LI_MAX_MS);
  const liGoalReached = liGoalMs > 0 && liElapsedMs >= liGoalMs;

  // Stopwatch runs only while the tab is open AND visible/active
  useEffect(() => {
    if (mode !== "lockin" || !liRunning) return;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      if (!document.hidden) setLiElapsedMs((ms) => Math.min(ms + (now - last), LI_MAX_MS));
      last = now;
    };
    const id = setInterval(tick, 1000);
    const resync = () => { last = Date.now(); };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    window.addEventListener("blur", resync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
      window.removeEventListener("blur", resync);
    };
  }, [mode, liRunning]);

  // Stop at the 24h cap
  useEffect(() => { if (liElapsedMs >= LI_MAX_MS) setLiRunning(false); }, [liElapsedMs]);

  // Celebrate when the focus goal is reached (but keep counting)
  useEffect(() => {
    if (liGoalReached && !liGoalFiredRef.current) { liGoalFiredRef.current = true; playChime(); }
    if (!liGoalReached) liGoalFiredRef.current = false;
  }, [liGoalReached]);

  function liReset() { setLiRunning(false); setLiElapsedMs(0); liGoalFiredRef.current = false; }
  function liSave() {
    if (liElapsedMs < 1000) return;
    const rec = { ts: Date.now(), date: new Date().toISOString().slice(0, 10), durationMs: liElapsedMs };
    const next = [rec, ...records];
    setRecords(next);
    try { localStorage.setItem(recKey, JSON.stringify(next)); } catch (_) {}
    setLiSavedFlash(true);
    setTimeout(() => setLiSavedFlash(false), 2000);
  }
  function liDeleteRecord(ts) {
    const next = records.filter((r) => r.ts !== ts);
    setRecords(next);
    try { localStorage.setItem(recKey, JSON.stringify(next)); } catch (_) {}
  }

  const startTsRef = useRef(null);    // timestamp when current run segment started
  const baseMsRef = useRef(0);        // accumulated ms from paused segments
  const rafRef = useRef(null);
  const finishedRef = useRef(false);

  const durationMs = duration * 60 * 1000;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  // Drain starts from bottom-right of filled area, right-to-left per row, bottom-to-top
  const currentCellIdx = duration > 0 && elapsedMinutes < duration
    ? duration - 1 - elapsedMinutes
    : -1;
  // fraction of current cell still filled (1 = full, 0 = empty), drains right side first
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

  function playChime() {
    try {
      const s = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1 },
      }).toDestination();
      s.triggerAttackRelease("C5", "8n");
      setTimeout(() => s.triggerAttackRelease("E5", "8n"), 300);
      setTimeout(() => s.triggerAttackRelease("G5", "4n"), 600);
    } catch (_) {}
  }

  function fireComplete() {
    playChime();

    if (notifOn && typeof Notification !== "undefined" && Notification.permission === "granted") {
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
      <BreathingBlocks accent={accent} theme={theme} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 520, margin: "0 auto", padding: "24px 16px",
        color: ink, fontFamily: "inherit",
      }}>
        {/* Mode toggle: Timer / Locking in */}
        <div style={{ display: "flex", border: `2px solid ${dark ? "#444" : "#1B1A17"}`, marginBottom: 20 }}>
          {[["timer", li.modeTimer], ["lockin", li.modeLockin]].map(([key, label], i) => (
            <button key={key} onClick={() => setMode(key)} style={{
              flex: 1, padding: "9px 4px", cursor: "pointer", fontFamily: "inherit",
              background: mode === key ? accent : "transparent",
              color: mode === key ? "#fff" : ink,
              border: "none", borderLeft: i > 0 ? `2px solid ${dark ? "#444" : "#1B1A17"}` : "none",
              fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em",
              opacity: mode === key ? 1 : 0.7,
            }}>{label}</button>
          ))}
        </div>

      {mode === "lockin" ? (
        <div>
          {/* Archive entry */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setShowArchive(true)} style={{ background: "none", border: `1px solid ${pal.ink}40`, color: ink, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {li.archive}
            </button>
          </div>

          {liElapsedMs === 0 && !liRunning ? (
            /* Goal setup */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, marginBottom: 14 }}>{li.goalLabel}</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input type="number" min={0} max={23} value={liGoalH}
                  onChange={(e) => setLiGoalH(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  style={liNumStyle(dark, ink)} />
                <span style={{ fontWeight: 700 }}>h</span>
                <input type="number" min={0} max={59} value={liGoalM}
                  onChange={(e) => setLiGoalM(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  style={liNumStyle(dark, ink)} />
                <span style={{ fontWeight: 700 }}>m</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>{li.goalSet}</div>
              <button onClick={() => setLiRunning(true)} disabled={liGoalMs === 0}
                style={btnStyle(accent, "#fff", liGoalMs === 0 ? 0.4 : 1)}>
                {li.start}
              </button>
            </div>
          ) : (
            /* Stopwatch */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 2, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                {fmtClock(liElapsedMs)}
              </div>
              {liGoalMs > 0 && (
                <div style={{ fontSize: 13, color: dark ? "#aaa" : "#888", marginTop: 4 }}>
                  {li.elapsed} {fmtDur(liElapsedMs)} {li.of} {fmtDur(liGoalMs)}
                </div>
              )}
              {/* progress bar */}
              {liGoalMs > 0 && (
                <div style={{ height: 6, background: dark ? "#333" : "#ddd", borderRadius: 3, margin: "14px 0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (liElapsedMs / liGoalMs) * 100)}%`, background: accent, transition: "width 0.5s" }} />
                </div>
              )}
              {liGoalReached && (
                <div style={{ background: accent + "22", border: `1px solid ${accent}`, color: ink, padding: "10px 14px", fontSize: 13, fontWeight: 700, margin: "0 0 16px" }}>
                  {li.congrats}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                {liRunning ? (
                  <button onClick={() => setLiRunning(false)} style={btnStyle(dark ? "#444" : "#ccc", ink, 1)}>{li.pause}</button>
                ) : (
                  <button onClick={() => setLiRunning(true)} disabled={liElapsedMs >= LI_MAX_MS} style={btnStyle(accent, "#fff", liElapsedMs >= LI_MAX_MS ? 0.4 : 1)}>{li.resume}</button>
                )}
                <button onClick={liSave} style={btnStyle(liSavedFlash ? "#3CA45C" : pal.accent3, "#1a1a1a", 1)}>{liSavedFlash ? li.saved : li.save}</button>
                <button onClick={liReset} style={btnStyle(dark ? "#333" : "#e0ddd0", ink, 1)}>{li.reset}</button>
              </div>
              <div style={{ fontSize: 11, opacity: 0.45 }}>{li.hint}</div>
            </div>
          )}
        </div>
      ) : (
        <>
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
            // drain from bottom-right: cleared cells are the last elapsedMinutes indices within [0, duration)
            const isEmpty = idx >= duration;
            const isCleared = !isEmpty && idx > currentCellIdx;
            const isCurrent = idx === currentCellIdx && running && !finished && duration > 0;
            const isFilled = !isEmpty && !isCleared && !isCurrent;

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
                    ? `linear-gradient(to right, ${accent} ${currentCellFraction * 100}%, ${clearedBg} ${currentCellFraction * 100}%)`
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
        {!notifOn && !notifGranted && (
          <div style={{
            fontSize: 12, color: dark ? "#aaa" : "#888",
            textAlign: "center", marginBottom: 16,
            cursor: "pointer", textDecoration: "underline",
          }} onClick={requestNotifPermission}>
            {p.notifPermission}
          </div>
        )}
        </>
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

      {/* Locking-in archive modal */}
      {showArchive && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowArchive(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", background: pal.bg, color: ink, border: `2px solid ${accent}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 900, fontSize: 16, textTransform: "uppercase" }}>{li.archiveTitle}</span>
              <button onClick={() => setShowArchive(false)} style={{ background: "none", border: "none", color: ink, cursor: "pointer", fontSize: 13 }}>{li.close}</button>
            </div>
            {records.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.5, padding: "20px 0", textAlign: "center" }}>{li.archiveEmpty}</div>
            ) : (
              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {records.map((r) => (
                  <div key={r.ts} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", background: dark ? "#1e1d16" : "#f0ede2", borderLeft: `3px solid ${accent}` }}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>{r.date}</span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{fmtDur(r.durationMs)}</span>
                    <button onClick={() => liDeleteRecord(r.ts)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.3, fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function liNumStyle(dark, ink) {
  return {
    width: 64, textAlign: "center", padding: "10px 6px", fontSize: 20, fontWeight: 800,
    fontFamily: "inherit", border: `1.5px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 8,
    background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none",
  };
}

function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDur(ms) {
  const total = Math.floor(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
