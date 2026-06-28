import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { X, ChevronUp, ChevronDown, Trash2, Zap } from "lucide-react";
import BreathingBlocks from "./BreathingBlocks";

const COLS = 9;
const ROWS = 5;
const TOTAL = COLS * ROWS; // 45 minutes max

const LI_MAX_MS = 24 * 3600 * 1000; // locking-in stopwatch cap: 24h

export default function PomodoroTimer({ t, pal, dark, theme, notifOn, userId, onNotif }) {
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

  // Wake lock
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const wakeLockRef = useRef(null);
  const toggleWakeLock = async () => {
    if (wakeLockOn) {
      try { await wakeLockRef.current?.release(); } catch (_) {}
      wakeLockRef.current = null;
      setWakeLockOn(false);
    } else {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          wakeLockRef.current.addEventListener("release", () => setWakeLockOn(false));
          setWakeLockOn(true);
        }
      } catch (_) {}
    }
  };
  useEffect(() => () => { wakeLockRef.current?.release().catch(() => {}); }, []);

  // ── Locking-in (long-focus stopwatch) mode ──
  const [mode, setMode] = useState("timer"); // "timer" | "lockin"
  const [liElapsedMs, setLiElapsedMs] = useState(0);
  const [liRunning, setLiRunning] = useState(false);
  const [liGoalH, setLiGoalH] = useState(1);
  const [liGoalM, setLiGoalM] = useState(0);
  const [liSavedFlash, setLiSavedFlash] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const liGoalFiredRef = useRef(false);
  const recKey    = `grida_lockin_${userId ?? "anon"}`;
  const pomRunKey = `grida_pom_run_${userId ?? "anon"}`;
  const liRunKey  = `grida_lockin_run_${userId ?? "anon"}`;
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(recKey) ?? "[]"); } catch { return []; }
  });

  // Restore persisted timer state on mount
  useEffect(() => {
    // Pomodoro countdown
    try {
      const saved = JSON.parse(localStorage.getItem(pomRunKey));
      if (saved?.durationMs > 0) {
        const elapsed = saved.wallStartMs
          ? Math.min(saved.baseMs + (Date.now() - saved.wallStartMs), saved.durationMs)
          : (saved.baseMs ?? 0);
        setDuration(saved.durationMs / 60000);
        setGoal(saved.goal ?? "");
        baseMsRef.current = elapsed;
        setElapsedMs(elapsed);
        if (elapsed >= saved.durationMs) {
          finishedRef.current = true; setFinished(true);
          localStorage.removeItem(pomRunKey);
        } else if (saved.wallStartMs) {
          setRunning(true); // was running when navigated away — auto-resume
        }
      }
    } catch (_) {}

    // Locking-in: always restore as paused
    try {
      const saved = JSON.parse(localStorage.getItem(liRunKey));
      if (saved) {
        const elapsed = saved.wallStartMs
          ? Math.min(saved.baseMs + (Date.now() - saved.wallStartMs), LI_MAX_MS)
          : (saved.baseMs ?? 0);
        if (elapsed > 0) {
          setLiElapsedMs(elapsed);
          liBaseElapsedRef.current = elapsed;
          setLiGoalH(saved.liGoalH ?? 1);
          setLiGoalM(saved.liGoalM ?? 0);
          setMode("lockin");
          // Save as paused so next remount doesn't re-add wall time
          localStorage.setItem(liRunKey, JSON.stringify({ baseMs: elapsed, liGoalH: saved.liGoalH ?? 1, liGoalM: saved.liGoalM ?? 0 }));
        }
      }
    } catch (_) {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const liGoalMs = Math.min((liGoalH * 60 + liGoalM) * 60000, LI_MAX_MS);
  const liGoalReached = liGoalMs > 0 && liElapsedMs >= liGoalMs;

  // Stopwatch: wall-clock based so screen-off / hidden tab doesn't lose time
  const liStartWallRef = useRef(null); // Date.now() when last started/resumed
  const liBaseElapsedRef = useRef(0);  // ms accumulated before last start

  useEffect(() => {
    if (mode !== "lockin" || !liRunning) {
      // Save paused state when stopping
      if (mode === "lockin") {
        const curElapsed = liStartWallRef.current != null
          ? Math.min(liBaseElapsedRef.current + (Date.now() - liStartWallRef.current), LI_MAX_MS)
          : liBaseElapsedRef.current;
        liStartWallRef.current = null;
        if (curElapsed > 0) {
          try { localStorage.setItem(liRunKey, JSON.stringify({ baseMs: curElapsed, liGoalH, liGoalM })); } catch (_) {}
        }
      }
      return;
    }
    liStartWallRef.current = Date.now();
    liBaseElapsedRef.current = liElapsedMs;
    try { localStorage.setItem(liRunKey, JSON.stringify({ wallStartMs: Date.now(), baseMs: liElapsedMs, liGoalH, liGoalM })); } catch (_) {}
    const tick = () => {
      const elapsed = liBaseElapsedRef.current + (Date.now() - liStartWallRef.current);
      setLiElapsedMs(Math.min(elapsed, LI_MAX_MS));
    };
    const id = setInterval(tick, 1000);
    const resync = () => { tick(); };
    document.addEventListener("visibilitychange", resync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", resync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, liRunning, liGoalH, liGoalM]);

  // Stop at the 24h cap
  useEffect(() => { if (liElapsedMs >= LI_MAX_MS) setLiRunning(false); }, [liElapsedMs]);

  // Celebrate when the focus goal is reached (but keep counting)
  useEffect(() => {
    if (liGoalReached && !liGoalFiredRef.current) {
      liGoalFiredRef.current = true;
      playChime();
      onNotif?.({ type: "success", title: li.congrats, body: `${fmtDur(liGoalMs)} ${li.elapsed || ""}`.trim() });
    }
    if (!liGoalReached) liGoalFiredRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liGoalReached]);

  function liReset() {
    setLiRunning(false); setLiElapsedMs(0); liGoalFiredRef.current = false;
    try { localStorage.removeItem(liRunKey); } catch (_) {}
  }
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
    onNotif?.({ type: "success", title: p.notifTitle, body: p.notifBody(goal) });
    try { localStorage.removeItem(pomRunKey); } catch (_) {}
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
    if (running) return; // lock grid while timer is active
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
    baseMsRef.current = 0;
    setRunning(true);
    try { localStorage.setItem(pomRunKey, JSON.stringify({ wallStartMs: Date.now(), baseMs: 0, durationMs, goal })); } catch (_) {}
  }
  function handlePause() {
    const now = performance.now();
    const accumulated = baseMsRef.current + (now - (startTsRef.current ?? now));
    baseMsRef.current = accumulated;
    setRunning(false);
    try { localStorage.setItem(pomRunKey, JSON.stringify({ baseMs: accumulated, durationMs, goal })); } catch (_) {}
  }
  function handleResume() {
    finishedRef.current = false;
    setRunning(true);
    try { localStorage.setItem(pomRunKey, JSON.stringify({ wallStartMs: Date.now(), baseMs: baseMsRef.current, durationMs, goal })); } catch (_) {}
  }
  function handleReset() {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsedMs(0);
    baseMsRef.current = 0;
    finishedRef.current = false;
    setFinished(false);
    try { localStorage.removeItem(pomRunKey); } catch (_) {}
  }

  const dispMin = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const dispSec = String(remainingSeconds % 60).padStart(2, "0");

  const ink = pal.ink;
  const accent = pal.accent;
  const isMon = theme === "mondrian";
  const liAccent = isMon ? "#2B3DCB" : accent; // locking-in uses blue in Mondrian
  const clearedBg = dark ? "#2a2920" : "#e0ddd2";
  const emptyBg = dark ? "#252418" : "#e8e5da";

  // Locking-in time decomposition for the filling-grid visual
  const liTotalSec = Math.floor(liElapsedMs / 1000);
  const liH = Math.floor(liTotalSec / 3600);
  const liM = Math.floor((liTotalSec % 3600) / 60);
  const liS = liTotalSec % 60;

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
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, marginBottom: 16 }}>{li.goalLabel}</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <TimeStepper value={liGoalH} setValue={setLiGoalH} max={23} unit="h" dark={dark} ink={ink} accent={liAccent} />
                <span style={{ fontSize: 28, fontWeight: 900, opacity: 0.3, paddingBottom: 18 }}>:</span>
                <TimeStepper value={liGoalM} setValue={setLiGoalM} max={59} unit="m" dark={dark} ink={ink} accent={liAccent} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>{li.goalSet}</div>
              <button onClick={() => setLiRunning(true)} disabled={liGoalMs === 0}
                style={btnStyle(liAccent, "#fff", liGoalMs === 0 ? 0.4 : 1)}>
                {li.start}
              </button>
            </div>
          ) : (
            /* Stopwatch — filling grid (hours / minutes / seconds) */
            <div>
              <div style={{ textAlign: "center", fontSize: 30, fontWeight: 900, letterSpacing: 1.5, fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>
                {fmtClock(liElapsedMs)}
              </div>
              {liGoalMs > 0 && (
                <div style={{ textAlign: "center", fontSize: 12, color: dark ? "#aaa" : "#888", marginBottom: 16 }}>
                  {li.elapsed} {fmtDur(liElapsedMs)} {li.of} {fmtDur(liGoalMs)}
                </div>
              )}

              {/* Filling block grids */}
              <BlockGrid label={li.unitH || "Hours"} count={24} cols={12} filled={liH} cellH={18} color={liAccent} dark={dark} ink={ink} />
              <BlockGrid label={li.unitM || "Minutes"} count={60} cols={15} filled={liM} cellH={11} color={liAccent} dark={dark} ink={ink} />
              <BlockGrid label={li.unitS || "Seconds"} count={60} cols={20} filled={liS} cellH={7} color={liAccent} dark={dark} ink={ink} />

              {liGoalReached && (
                <div style={{ background: liAccent + "22", border: `1px solid ${liAccent}`, color: ink, padding: "10px 14px", fontSize: 13, fontWeight: 700, margin: "16px 0 0", textAlign: "center" }}>
                  {li.congrats}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "18px 0 12px" }}>
                {liRunning ? (
                  <button onClick={() => setLiRunning(false)} style={btnStyle(liAccent, "#fff", 1)}>{li.pause}</button>
                ) : (
                  <button onClick={() => setLiRunning(true)} disabled={liElapsedMs >= LI_MAX_MS} style={btnStyle(dark ? "#444" : "#ccc", ink, liElapsedMs >= LI_MAX_MS ? 0.4 : 1)}>{li.resume}</button>
                )}
                <button onClick={liSave} style={btnStyle(liSavedFlash ? "#3CA45C" : pal.accent3, "#1a1a1a", 1)}>{liSavedFlash ? li.saved : li.save}</button>
                <button onClick={liReset} style={btnStyle("#C7382E", "#fff", 1)}>{li.reset}</button>
                {"wakeLock" in navigator && (
                  <button onClick={toggleWakeLock} title={wakeLockOn ? (li.wakeLockOff || "Screen wake off") : (li.wakeLockOn || "Keep screen on")}
                    style={{ ...btnStyle(wakeLockOn ? liAccent + "33" : (dark ? "#2a2a2a" : "#f0ede4"), ink, 1), display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", border: wakeLockOn ? `1px solid ${liAccent}` : `1px solid ${ink}33` }}>
                    <Zap size={14} fill={wakeLockOn ? liAccent : "none"} color={wakeLockOn ? liAccent : ink} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, opacity: 0.45, textAlign: "center" }}>{li.hint}</div>
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

        {/* About — opens as a modal */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
          <button
            onClick={() => setShowAbout(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: `1px solid ${pal.ink}40`, cursor: "pointer",
              color: ink, fontSize: 12, fontWeight: 700, padding: "7px 14px", fontFamily: "inherit",
            }}
          >
            {p.about.title}
          </button>
        </div>
      </div>

      {/* About modal */}
      {showAbout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowAbout(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", background: pal.bg, color: ink, border: `2px solid ${accent}`, borderRadius: 10, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <span style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>{p.about.title}</span>
              <button onClick={() => setShowAbout(false)} style={{ background: "none", border: "none", color: ink, cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: dark ? "#bbb" : "#555" }}>
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
          </div>
        </div>
      )}

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
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{fmtClock(r.durationMs)}</span>
                    <button onClick={() => liDeleteRecord(r.ts)} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "#C7382E", opacity: 0.7, display: "flex", padding: 4 }}><Trash2 size={15} /></button>
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

function BlockGrid({ label, count, cols, filled, cellH, color, dark, ink }) {
  const empty = dark ? "#2a2920" : "#e0ddd2";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.55, color: ink }}>{label}</span>
        <span style={{ fontSize: 10, fontVariantNumeric: "tabular-nums", opacity: 0.45, color: ink }}>{filled}/{count}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ height: cellH, background: i < filled ? color : empty, borderRadius: 2, transition: "background 0.25s" }} />
        ))}
      </div>
    </div>
  );
}

function TimeStepper({ value, setValue, max, unit, dark, ink, accent }) {
  const inc = () => setValue((v) => (v >= max ? 0 : v + 1));
  const dec = () => setValue((v) => (v <= 0 ? max : v - 1));
  const arrowBtn = {
    background: "none", border: "none", cursor: "pointer", color: accent,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 2,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <button onClick={inc} aria-label="up" style={arrowBtn}><ChevronUp size={22} /></button>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        value={String(value).padStart(2, "0")}
        onChange={e => {
          const raw = e.target.value.replace(/\D/g, "");
          const n = parseInt(raw, 10);
          if (!isNaN(n)) setValue(Math.max(0, Math.min(max, n)));
          else if (raw === "") setValue(0);
        }}
        onBlur={e => {
          const n = parseInt(e.target.value, 10);
          setValue(isNaN(n) ? 0 : Math.max(0, Math.min(max, n)));
        }}
        style={{
          width: 72, textAlign: "center", padding: "8px 0", margin: "2px 0",
          fontSize: 30, fontWeight: 900, fontVariantNumeric: "tabular-nums",
          border: `1.5px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 8,
          background: dark ? "#1e1d16" : "#fff", color: ink, lineHeight: 1,
          outline: "none", fontFamily: "inherit", boxSizing: "border-box",
        }}
      />
      <button onClick={dec} aria-label="down" style={arrowBtn}><ChevronDown size={22} /></button>
      <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, marginTop: 2 }}>{unit}</span>
    </div>
  );
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
