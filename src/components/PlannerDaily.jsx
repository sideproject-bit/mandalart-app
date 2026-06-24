import { useState, useEffect, useRef } from "react";

const CELL_H   = 26;   // px per row
const LABEL_W  = 44;   // px for hour label column
const HEADER_H = 22;   // px for minute header row
const COLS     = 6;
const ROWS     = 24;
const TOTAL    = ROWS * COLS; // 144

const EVENT_COLORS = ["#FFAAAA", "#FFE599", "#AAD4FF", "#C7382E", "#C8960A", "#1A2A9E"];

function cellToTime(idx) {
  const h = Math.floor(idx / COLS);
  const m = (idx % COLS) * 10;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function cellToTimeEnd(idx) {
  const totalMin = Math.floor(idx / COLS) * 60 + (idx % COLS) * 10 + 10;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getCurrentCell() {
  const now = new Date();
  return now.getHours() * COLS + Math.floor(now.getMinutes() / 10);
}

const MON = { red: "#C7382E", blue: "#2B3DCB", yellow: "#E3B22E" };

export default function PlannerDaily({ t, pal, dark, editMode, events, onEventsChange, todos, onTodosChange, theme }) {
  const pl    = t.planner;
  const ink   = pal.ink;
  const acc   = pal.accent;
  const bg    = pal.bg;
  const border = dark ? "#2a2920" : "#e0ddd2";
  const isMon  = theme === "mondrian";

  const [currentCell, setCurrentCell] = useState(getCurrentCell);
  const [selRange,    setSelRange]    = useState(null); // { start, end }
  const [popup,       setPopup]       = useState(null); // { startCell, endCell, x, y }
  const [popTitle,    setPopTitle]    = useState("");
  const [popColor,    setPopColor]    = useState(EVENT_COLORS[0]);
  const [popMemo,     setPopMemo]     = useState("");
  const [todoInput,   setTodoInput]   = useState("");

  const dragRef = useRef({ active: false, start: null, end: null, dragging: false });
  const gridRef = useRef(null);

  // Refresh current cell every 30s
  useEffect(() => {
    const id = setInterval(() => setCurrentCell(getCurrentCell()), 30_000);
    return () => clearInterval(id);
  }, []);


  // --- Drag / pointer logic ---
  function getCellAt(clientX, clientY) {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const relX = clientX - rect.left - LABEL_W;
    const relY = clientY - rect.top  - HEADER_H;
    if (relX < 0 || relY < 0) return null;
    const colW = (rect.width - LABEL_W) / COLS;
    const col  = Math.min(COLS - 1, Math.floor(relX / colW));
    const row  = Math.min(ROWS - 1, Math.floor(relY / CELL_H));
    if (row < 0 || col < 0) return null;
    return row * COLS + col;
  }

  function openPopup(startCell, endCell) {
    setPopup({ startCell, endCell });
    setPopTitle(""); setPopColor(EVENT_COLORS[0]); setPopMemo("");
  }

  function handlePointerDown(e) {
    if (!editMode || e.button !== 0) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, start: cell, end: cell, dragging: false };
    setSelRange({ start: cell, end: cell });
  }

  function handlePointerMove(e) {
    if (!dragRef.current.active) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell === null) return;
    if (cell !== dragRef.current.start) {
      dragRef.current.dragging = true;
      dragRef.current.end = cell;
      setSelRange({ start: Math.min(dragRef.current.start, cell), end: Math.max(dragRef.current.start, cell) });
    }
  }

  function handlePointerUp(e) {
    if (!dragRef.current.active) return;
    const { dragging, start, end } = dragRef.current;
    dragRef.current = { active: false, start: null, end: null, dragging: false };
    setSelRange(null);
    if (dragging) {
      openPopup(Math.min(start, end), Math.max(start, end));
    }
  }

  function handleDoubleClick(e) {
    if (!editMode) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell === null) return;
    openPopup(cell, cell);
  }

  function saveEvent() {
    if (!popup || !popTitle.trim()) return;
    const evt = {
      id: Date.now().toString(),
      title: popTitle.trim(),
      color: popColor,
      memo: popMemo,
      startCell: popup.startCell,
      endCell: popup.endCell,
    };
    onEventsChange(prev => [...prev, evt]);
    setPopup(null);
  }

  function deleteEvent(id) {
    onEventsChange(prev => prev.filter(e => e.id !== id));
  }

  function addTodo(e) {
    e.preventDefault();
    if (!todoInput.trim()) return;
    onTodosChange(prev => [...prev, { id: Date.now().toString(), text: todoInput.trim(), done: false }]);
    setTodoInput("");
  }

  function toggleTodo(id) {
    onTodosChange(prev => prev.map(td => td.id === id ? { ...td, done: !td.done } : td));
  }

  function deleteTodo(id) {
    onTodosChange(prev => prev.filter(td => td.id !== id));
  }

  // Map events to cells for coloring
  const cellEventMap = {};
  for (const evt of events) {
    for (let i = evt.startCell; i <= evt.endCell; i++) {
      if (!cellEventMap[i]) cellEventMap[i] = evt;
    }
  }

  function colHeader(monColor) {
    const bg = isMon ? monColor : acc;
    return {
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
      marginBottom: 8, background: bg, color: isMon && monColor === MON.yellow ? "#1a1a1a" : "#fff",
      padding: "4px 8px", display: "inline-block", borderRadius: 3,
    };
  }

  return (
    <div>
      {/* Date */}
      <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, marginBottom: 18 }}>
        {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>

      {/* 3-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,0.5fr) minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>

        {/* ── Time Block Grid ── */}
        <div>
          <div style={colHeader(MON.red)}>{pl.timeBlocks}</div>
          <div
            ref={gridRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            style={{ touchAction: "none", userSelect: "none", cursor: editMode ? "crosshair" : "default" }}
          >
            {/* Minute header */}
            <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(${COLS}, 1fr)`, height: HEADER_H }}>
              <div />
              {[":00", ":10", ":20", ":30", ":40", ":50"].map(m => (
                <div key={m} style={{ fontSize: 10, textAlign: "center", opacity: 0.35, lineHeight: `${HEADER_H}px`, fontVariantNumeric: "tabular-nums" }}>{m}</div>
              ))}
            </div>

            {/* Hour rows */}
            {Array.from({ length: ROWS }, (_, h) => (
              <div key={h} style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(${COLS}, 1fr)` }}>
                <div style={{
                  fontSize: 11, textAlign: "right", paddingRight: 8,
                  opacity: 0.38, lineHeight: `${CELL_H}px`, fontVariantNumeric: "tabular-nums", fontWeight: 600,
                }}>
                  {String(h).padStart(2, "0")}
                </div>
                {Array.from({ length: COLS }, (_, m) => {
                  const idx = h * COLS + m;
                  const evt = cellEventMap[idx];
                  const inSel = selRange && idx >= selRange.start && idx <= selRange.end;
                  const isCurr = idx === currentCell;
                  return (
                    <div key={idx} style={{
                      height: CELL_H,
                      background: inSel ? acc + "55"
                        : evt ? evt.color + "bb"
                        : "transparent",
                      border: isCurr
                        ? `2px solid ${acc}`
                        : `1px solid ${border}`,
                      boxSizing: "border-box",
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Events ── */}
        <div>
          <div style={colHeader(MON.blue)}>{pl.eventsCol}</div>
          {events.length === 0
            ? <div style={{ fontSize: 12, opacity: 0.3, paddingTop: 4 }}>{pl.noEvents}</div>
            : [...events].sort((a, b) => a.startCell - b.startCell).map(evt => (
              <div key={evt.id} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 10px", marginBottom: 6,
                background: dark ? "#1e1d16" : "#f0ede2",
                borderLeft: `3px solid ${evt.color}`,
                borderRadius: 4,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, wordBreak: "keep-all" }}>{evt.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
                    {cellToTime(evt.startCell)} – {cellToTimeEnd(evt.endCell)}
                  </div>
                  {evt.memo && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, wordBreak: "keep-all" }}>{evt.memo}</div>}
                  {evt.fromCalendar && <div style={{ fontSize: 10, opacity: 0.35, marginTop: 4 }}>📅 {pl.fromCalendar}</div>}
                </div>
                {!evt.fromCalendar && editMode && (
                  <button onClick={() => deleteEvent(evt.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.3, fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                )}
              </div>
            ))
          }
        </div>

        {/* ── To-do ── */}
        <div>
          <div style={colHeader(MON.yellow)}>{pl.todoCol}</div>
          {editMode && (
            <form onSubmit={addTodo} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input
                value={todoInput}
                onChange={e => setTodoInput(e.target.value)}
                placeholder={pl.todoPlaceholder}
                style={{ flex: 1, padding: "7px 10px", fontSize: 12, border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, fontFamily: "inherit", outline: "none" }}
              />
              <button type="submit" style={{ background: isMon ? MON.yellow : acc, color: isMon ? "#1a1a1a" : "#fff", border: "none", borderRadius: 6, padding: "7px 11px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+</button>
            </form>
          )}
          {todos.length === 0
            ? <div style={{ fontSize: 12, opacity: 0.3 }}>{pl.noTodos}</div>
            : todos.map(td => (
              <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${border}` }}>
                <input
                  type="checkbox"
                  checked={td.done}
                  onChange={() => toggleTodo(td.id)}
                  disabled={!editMode}
                  style={{ accentColor: acc, cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 13, textDecoration: td.done ? "line-through" : "none", opacity: td.done ? 0.35 : 1, wordBreak: "keep-all" }}>
                  {td.text}
                </span>
                {editMode && (
                  <button onClick={() => deleteTodo(td.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.25, fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                )}
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Event creation popup ── */}
      {popup && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)" }} onClick={() => setPopup(null)} />
          <div style={{
            position: "fixed",
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 51, width: 300, maxWidth: "90vw",
            background: bg, color: ink,
            border: `2px solid ${acc}`,
            borderRadius: 10, padding: 20,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {cellToTime(popup.startCell)} – {cellToTimeEnd(popup.endCell)}
            </div>
            <input
              autoFocus
              value={popTitle}
              onChange={e => setPopTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveEvent()}
              placeholder={pl.eventTitlePlaceholder}
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {EVENT_COLORS.map(c => (
                <div key={c} onClick={() => setPopColor(c)} style={{
                  width: 22, height: 22, borderRadius: 4, background: c, cursor: "pointer", flexShrink: 0,
                  outline: popColor === c ? `2.5px solid ${ink}` : "none", outlineOffset: 2,
                }} />
              ))}
            </div>
            <textarea
              value={popMemo}
              onChange={e => setPopMemo(e.target.value)}
              placeholder={pl.eventMemoPlaceholder}
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none", resize: "none", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setPopup(null)} style={{ background: "none", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", color: ink, fontFamily: "inherit" }}>
                {pl.cancel}
              </button>
              <button onClick={saveEvent} disabled={!popTitle.trim()} style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: popTitle.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontFamily: "inherit", opacity: popTitle.trim() ? 1 : 0.4 }}>
                {pl.save}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
