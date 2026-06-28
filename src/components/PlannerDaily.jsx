import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useViewport } from "../hooks/useViewport";

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

function timeStrToMins(str) {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  return h * 60 + (isNaN(m) ? 0 : m);
}

const MON = { red: "#C7382E", blue: "#2B3DCB", yellow: "#E3B22E" };

// Single event row. Mobile: swipe right = procrastinate, tap = open popup.
// Desktop: click = open popup, right-click = context menu.
function EventRow({ evt, isMobile, editMode, dark, ink, acc, border, pl, onMove, onSkip, onCheck, onTap, onContext }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(null);
  const canProc = editMode && !evt._recurring;
  const canSkip = editMode && !!evt._recurring;
  const THRESH = 80;

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchMove  = (e) => {
    if (startX.current == null) return;
    setDx(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    if (startX.current == null) return;
    if (dx > THRESH && canProc) onMove(evt);
    else if (dx > THRESH && canSkip) onSkip?.(evt);
    else if (Math.abs(dx) < 10) onTap?.(evt); // tap → open popup
    startX.current = null;
    setDx(0);
  };

  const card = (
    <div
      onClick={!isMobile ? () => onTap?.(evt) : undefined}
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "8px 10px",
        background: dark ? "#1e1d16" : "#f0ede2",
        ...(evt.fromCalendar
          ? { border: `2px solid ${evt.color}` }
          : { borderLeft: `3px solid ${evt.color}` }),
        borderRadius: 4,
        transform: isMobile ? `translateX(${dx}px)` : "none",
        transition: startX.current == null ? "transform 0.2s ease" : "none",
        cursor: "pointer",
        opacity: evt.done ? 0.6 : 1,
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: 13, wordBreak: "keep-all",
          textDecoration: evt.done ? "line-through" : "none",
        }}>{evt.title}</div>
        <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
          {evt.startTime ?? cellToTime(evt.startCell)} – {evt.endTime ?? cellToTimeEnd(evt.endCell)}
        </div>
        {evt.memo && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, wordBreak: "keep-all" }}>{evt.memo}</div>}
      </div>
      <input
        type="checkbox"
        checked={!!evt.done}
        onChange={(e) => { e.stopPropagation(); onCheck?.(evt.id); }}
        onClick={(e) => e.stopPropagation()}
        style={{ accentColor: acc, cursor: "pointer", flexShrink: 0, marginTop: 2, width: 15, height: 15 }}
      />
    </div>
  );

  if (!isMobile) {
    return (
      <div
        onContextMenu={(canProc || canSkip) ? (e) => { e.preventDefault(); onContext(evt, e.clientX, e.clientY); } : undefined}
        style={{ marginBottom: 6 }}
      >
        {card}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", marginBottom: 6, overflow: "hidden", borderRadius: 4 }}>
      {(canProc || canSkip) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "flex-start", alignItems: "center", paddingLeft: 14, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <span style={{ color: MON.blue, opacity: dx > 20 ? 1 : 0.3 }}>
            {canSkip ? `✕ ${pl.skipOccurrence || "Skip today"}` : `→ ${pl.moveTomorrow || "Tomorrow"}`}
          </span>
        </div>
      )}
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {card}
      </div>
    </div>
  );
}

// To-do item. Mobile: swipe left = delete. Desktop: × button.
function TodoItem({ td, isMobile, editMode, dark, ink, acc, border, pl, onToggle, onDelete }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(null);
  const THRESH = 80;

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchMove  = (e) => {
    if (startX.current == null) return;
    setDx(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    if (startX.current == null) return;
    if (dx < -THRESH) onDelete(td.id);
    startX.current = null;
    setDx(0);
  };

  const item = (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
      borderBottom: `1px solid ${border}`,
      background: dark ? "#1e1d16" : "#f0ede2",
      transform: isMobile ? `translateX(${dx}px)` : "none",
      transition: startX.current == null ? "transform 0.2s ease" : "none",
    }}>
      <input
        type="checkbox"
        checked={td.done}
        onChange={() => onToggle(td.id)}
        style={{ accentColor: acc, cursor: "pointer", flexShrink: 0 }}
      />
      <span style={{ flex: 1, fontSize: 13, textDecoration: td.done ? "line-through" : "none", opacity: td.done ? 0.35 : 1, wordBreak: "keep-all" }}>
        {td.text}
      </span>
      {editMode && !isMobile && (
        <button onClick={() => onDelete(td.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.25, fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
      )}
    </div>
  );

  if (!isMobile) return <div style={{ marginBottom: 0 }}>{item}</div>;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "flex-end", paddingRight: 14,
        fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
        color: MON.red, opacity: dx < -20 ? 1 : 0.3,
      }}>
        {pl.delete || "Delete"} ✕
      </div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {item}
      </div>
    </div>
  );
}

function timeToCell(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * COLS + Math.floor(m / 10);
}

// endTime → last occupied cell index (e.g. "10:28" → cell 62 = 10:20~10:30)
function timeToEndCell(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return Math.ceil((h * 60 + m) / 10) - 1;
}

export default function PlannerDaily({ t, pal, dark, editMode, events, onEventsChange, onEditEvent, onEditCalEvent, onDeleteCalEvent, todos, onTodosChange, onMoveToTomorrow, onSkipRecurring, spans, theme, lang, groupEvents = [], onDeleteGroupEvent, onEditGroupEvent }) {
  const pl    = t.planner;
  const ink   = pal.ink;
  const acc   = pal.accent;
  const bg    = pal.bg;
  const border = dark ? "#2a2920" : "#e0ddd2";
  const isMon  = theme === "mondrian";
  const { isMobile } = useViewport();
  const labelW = isMobile ? 24 : LABEL_W; // narrower hour-label column on mobile (push blocks left)

  const [currentCell, setCurrentCell] = useState(getCurrentCell);
  const [selRange,    setSelRange]    = useState(null); // { start, end }
  const [popup,       setPopup]       = useState(null); // { startCell, endCell, x, y }
  const [popTitle,    setPopTitle]    = useState("");
  const [popColor,    setPopColor]    = useState(EVENT_COLORS[0]);
  const [popMemo,     setPopMemo]     = useState("");
  const [todoInput,   setTodoInput]   = useState("");
  const [section,     setSection]     = useState("time"); // mobile segment: time | events | todo
  const [viewEvent,   setViewEvent]   = useState(null); // tapped a filled block → show its details
  const [isEditingView, setIsEditingView] = useState(false); // editing mode inside viewEvent popup
  const [editTitle,   setEditTitle]   = useState("");
  const [editColor,   setEditColor]   = useState(EVENT_COLORS[0]);
  const [editMemo,    setEditMemo]    = useState("");
  const [editStart,   setEditStart]   = useState("");
  const [editEnd,     setEditEnd]     = useState("");
  const [ctxMenu,     setCtxMenu]     = useState(null); // desktop right-click menu { evt, x, y }
  const [groupDone,   setGroupDone]   = useState({}); // local done state for group events { [id]: bool }

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
    const relX = clientX - rect.left - labelW;
    const relY = clientY - rect.top  - HEADER_H;
    if (relX < 0 || relY < 0) return null;
    const colW = (rect.width - labelW) / COLS;
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
    if (e.button !== 0) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, start: cell, end: cell, dragging: false };
    if (editMode) setSelRange({ start: cell, end: cell }); // selection only matters in edit mode
  }

  function handlePointerMove(e) {
    if (!dragRef.current.active || !editMode) return; // no range-select in view mode
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
      // Only create over a fully empty range; otherwise show the existing event
      const lo = Math.min(start, end), hi = Math.max(start, end);
      let existing = null;
      for (let i = lo; i <= hi; i++) { if (cellEventMap[i]) { existing = cellEventMap[i]; break; } }
      if (existing) setViewEvent(existing);
      else openPopup(lo, hi);
    } else if (start !== null) {
      const evt = cellEventMap[start];
      if (evt) {
        // Tapping a filled block shows its details (no overwrite)
        setViewEvent(evt);
      } else if (e.pointerType === "touch" && editMode) {
        // Touch has no double-click — a single tap on an empty cell creates an event
        openPopup(start, start);
      }
    }
  }

  function handleDoubleClick(e) {
    if (!editMode) return;
    const cell = getCellAt(e.clientX, e.clientY);
    if (cell === null) return;
    const evt = cellEventMap[cell];
    if (evt) setViewEvent(evt);
    else openPopup(cell, cell);
  }

  function skipOccurrence(evt) {
    onSkipRecurring?.(evt._recurringId, evt._dateKey);
    setViewEvent(null);
    setCtxMenu(null);
  }

  function moveToTomorrow(evt) {
    onMoveToTomorrow?.({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      title: evt.title,
      color: evt.color,
      memo: evt.memo ?? "",
      startTime: cellToTime(evt.startCell),
      endTime: cellToTimeEnd(evt.endCell),
      startCell: evt.startCell,
      endCell: evt.endCell,
    });
    deleteEvent(evt);
    setViewEvent(null);
    setCtxMenu(null);
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
      startTime: cellToTime(popup.startCell),
      endTime: cellToTimeEnd(popup.endCell),
    };
    onEventsChange(prev => [...prev, evt]);
    setPopup(null);
  }

  function openEditView(evt) {
    setEditTitle(evt.title);
    setEditColor(evt.color);
    setEditMemo(evt.memo ?? "");
    setEditStart(evt.startTime ?? cellToTime(evt.startCell));
    setEditEnd(evt.endTime ?? cellToTimeEnd(evt.endCell));
    setIsEditingView(true);
  }

  function saveEditView() {
    if (!viewEvent || !editTitle.trim()) return;
    const newStartCell = editStart ? timeToCell(editStart) : viewEvent.startCell;
    const rawEndCell   = editEnd   ? timeToEndCell(editEnd) : viewEvent.endCell;
    const newEndCell   = Math.max(newStartCell, rawEndCell);
    const changes = {
      title: editTitle.trim(), color: editColor, memo: editMemo,
      startTime: editStart || viewEvent.startTime,
      endTime:   editEnd   || viewEvent.endTime,
      startCell: newStartCell,
      endCell:   newEndCell,
    };
    if (viewEvent._isGroupEvent) {
      onEditGroupEvent?.(viewEvent.id, changes);
    } else if (viewEvent.fromCalendar) {
      onEditCalEvent?.(viewEvent._dateKey, viewEvent.id, changes);
    } else {
      onEditEvent?.(viewEvent.id, changes);
    }
    setViewEvent(null);
    setIsEditingView(false);
  }

  function deleteEvent(evt) {
    if (evt._isGroupEvent) {
      onDeleteGroupEvent?.(evt.id);
    } else if (evt.fromCalendar) {
      onDeleteCalEvent?.(evt._dateKey, evt.id);
    } else {
      onEventsChange(prev => prev.filter(e => e.id !== evt.id));
    }
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

  // Separate drag/daily events, monthly calendar events, and recurring events
  const blockEvents    = events.filter(e => !e.fromCalendar);
  const calendarEvents = events.filter(e =>  e.fromCalendar && !e._recurring);
  const recurEvents    = events.filter(e =>  e._recurring);

  // Time-block cells: daily drag events only (first-come wins)
  const cellEventMap = {};
  for (const evt of blockEvents) {
    for (let i = evt.startCell; i <= evt.endCell; i++) {
      if (!cellEventMap[i]) cellEventMap[i] = evt;
    }
  }
  // Calendar event cells: inset ring overlay
  const calCellMap = {};
  for (const evt of calendarEvents) {
    for (let i = evt.startCell; i <= evt.endCell; i++) {
      if (!calCellMap[i]) calCellMap[i] = evt;
    }
  }
  // Recurring event cells: separate inset ring so they're never hidden by calendar events
  const recurCellMap = {};
  for (const evt of recurEvents) {
    for (let i = evt.startCell; i <= evt.endCell; i++) {
      if (!recurCellMap[i]) recurCellMap[i] = evt;
    }
  }

  // Map group events to cells (supports cross-midnight carry-over)
  const groupCellMap = {};
  for (const ge of groupEvents) {
    const sc = timeToCell(ge.start_time);
    if (sc == null) continue;
    const rawEc = ge.end_time ? timeToCell(ge.end_time) : sc;
    let startC, endC;
    if (ge._carryOver) {
      startC = 0;
      endC = rawEc ?? sc;
    } else if (ge.start_time && ge.end_time && ge.start_time > ge.end_time) {
      startC = sc;
      endC = TOTAL - 1;
    } else {
      startC = sc;
      endC = rawEc ?? sc;
    }
    for (let i = startC; i <= endC; i++) {
      if (!groupCellMap[i]) groupCellMap[i] = ge;
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

  // ── Section bodies (shared by desktop columns + mobile segments) ──
  const timeBody = (
    <div
      ref={gridRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: "none", userSelect: "none", cursor: editMode ? "crosshair" : "default", position: "relative" }}
    >
      {/* Minute header */}
      <div style={{ display: "grid", gridTemplateColumns: `${labelW}px repeat(${COLS}, 1fr)`, height: HEADER_H }}>
        <div />
        {[":00", ":10", ":20", ":30", ":40", ":50"].map(m => (
          <div key={m} style={{ fontSize: 10, textAlign: "center", opacity: 0.35, lineHeight: `${HEADER_H}px`, fontVariantNumeric: "tabular-nums" }}>{m}</div>
        ))}
      </div>

      {/* Event outline overlays — one border rect per event, larger events on top */}
      {(() => {
        const overlayEvts = [...blockEvents, ...calendarEvents]
          .sort((a, b) => (b.endCell - b.startCell) - (a.endCell - a.startCell));
        return overlayEvts.map((evt, i) => {
          const startRow = Math.floor(evt.startCell / COLS);
          const endRow   = Math.floor(evt.endCell   / COLS);
          return (
            <div key={`ov-${evt.id}`} style={{
              position: "absolute",
              top: HEADER_H + startRow * CELL_H,
              left: labelW,
              right: 0,
              height: (endRow - startRow + 1) * CELL_H,
              border: `2px solid ${evt.color}`,
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: overlayEvts.length - i,
            }} />
          );
        });
      })()}

      {/* Hour rows — partial-fill cell rendering */}
      {Array.from({ length: ROWS }, (_, h) => (
        <div key={h} style={{ display: "grid", gridTemplateColumns: `${labelW}px repeat(${COLS}, 1fr)` }}>
          <div style={{
            fontSize: 11,
            textAlign: isMobile ? "left" : "right",
            paddingRight: isMobile ? 4 : 8,
            opacity: 0.38, lineHeight: `${CELL_H}px`, fontVariantNumeric: "tabular-nums", fontWeight: 600,
          }}>
            {String(h).padStart(2, "0")}
          </div>
          {Array.from({ length: COLS }, (_, m) => {
            const idx    = h * COLS + m;
            const evt    = cellEventMap[idx];
            const cEvt   = calCellMap[idx];
            const rEvt   = recurCellMap[idx];
            const gEvt   = groupCellMap[idx];
            const inSel  = selRange && idx >= selRange.start && idx <= selRange.end;
            const isCurr = idx === currentCell;

            // Compute partial fill as left/width % (time flows left→right within each cell)
            function fillFor(e) {
              if (!e) return null;
              const sM = timeStrToMins(e.startTime) ?? (e.startCell * 10);
              const eM = timeStrToMins(e.endTime)   ?? ((e.endCell + 1) * 10);
              const cs = idx * 10, ce = (idx + 1) * 10;
              const left  = (Math.max(sM, cs) - cs) / 10 * 100;
              const width = (Math.min(eM, ce) - Math.max(sM, cs)) / 10 * 100;
              return width > 0 ? { left: `${left}%`, width: `${width}%` } : null;
            }

            const bFill = !inSel ? fillFor(evt)  : null;
            const cFill = !inSel && !evt ? fillFor(cEvt)  : null;
            const rFill = !inSel && !evt && !cEvt ? fillFor(rEvt) : null;
            const groupColor = gEvt?.color ?? "#4A90D9";

            return (
              <div key={idx} style={{
                height: CELL_H, position: "relative",
                background: inSel ? acc + "55" : "transparent",
                border: isCurr ? `2px solid ${acc}` : `1px solid ${border}`,
                boxSizing: "border-box", overflow: "hidden",
              }}>
                {bFill && <div style={{ position: "absolute", top: 0, bottom: 0, left: bFill.left, width: bFill.width, background: evt.color + "bb" }} />}
                {cFill && <div style={{ position: "absolute", top: 0, bottom: 0, left: cFill.left, width: cFill.width, background: cEvt.color + "bb" }} />}
                {rFill && <div style={{ position: "absolute", top: 0, bottom: 0, left: rFill.left, width: rFill.width, background: rEvt.color + "44", borderLeft: `2px dashed ${rEvt.color}` }} />}
                {gEvt && !inSel && <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 3, background: groupColor, opacity: 0.7 }} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const ownEvents = events.filter(e => !e.fromCalendar);
  const doneEventsCount = ownEvents.filter(e => e.done).length;
  const totalEventsCount = ownEvents.length;
  const eventsPct = totalEventsCount === 0 ? 0 : Math.round((doneEventsCount / totalEventsCount) * 100);

  const eventsBody = (
    <>
      {totalEventsCount > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.55, marginBottom: 3, color: ink }}>
            <span>{doneEventsCount}/{totalEventsCount}</span>
            <span style={{ fontWeight: 700 }}>{eventsPct}%</span>
          </div>
          <div style={{ height: 4, background: ink + "18", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${eventsPct}%`, background: isMon ? MON.red : acc, borderRadius: 2, transition: "width 0.4s" }} />
          </div>
        </div>
      )}
      {events.length === 0 && groupEvents.length === 0
        ? <div style={{ fontSize: 12, opacity: 0.3, paddingTop: 4 }}>{pl.noEvents}</div>
        : [...events].sort((a, b) => a.startCell - b.startCell).map(evt => (
          <EventRow
            key={evt.id} evt={evt}
            isMobile={isMobile} editMode={editMode} dark={dark} ink={ink} acc={acc} border={border} pl={pl}
            onMove={moveToTomorrow}
            onSkip={skipOccurrence}
            onCheck={(id) => {
              if (evt.fromCalendar) onEditCalEvent?.(evt._dateKey, id, { done: !evt.done });
              else onEditEvent?.(id, { done: !evt.done });
            }}
            onTap={(ev) => setViewEvent(ev)}
            onContext={(ev, x, y) => setCtxMenu({ evt: ev, x, y })}
          />
        ))
      }
      {groupEvents.map(ge => (
        <div key={ge.id} style={{
          display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", marginBottom: 6,
          background: dark ? "#1e1d16" : "#f0ede2",
          border: `2px solid ${ge.color ?? "#4A90D9"}`,
          borderRadius: 4, opacity: groupDone[ge.id] ? 0.6 : 0.9,
          cursor: ge._isAdmin ? "pointer" : "default",
        }}
          onClick={ge._isAdmin ? () => {
            const sc = timeToCell(ge.start_time) ?? 0;
            const ec = ge.end_time ? timeToEndCell(ge.end_time) : sc;
            setViewEvent({
              ...ge,
              _isGroupEvent: true,
              fromCalendar: false,
              startTime: ge.start_time ?? "",
              endTime: ge.end_time ?? "",
              startCell: sc,
              endCell: ec,
              done: groupDone[ge.id] ?? false,
            });
          } : undefined}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 13, wordBreak: "keep-all",
              textDecoration: groupDone[ge.id] ? "line-through" : "none",
            }}>
              <span style={{ opacity: 0.55, marginRight: 4 }}>{ge._groupLabel}</span>{ge.title}
            </div>
            {ge.start_time && (
              <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
                {ge.start_time}{ge.end_time ? ` – ${ge.end_time}` : ""}
                {ge._carryOver && <span style={{ marginLeft: 6, opacity: 0.6 }}>↩</span>}
              </div>
            )}
            {ge.memo && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>{ge.memo}</div>}
          </div>
          <input
            type="checkbox"
            checked={!!groupDone[ge.id]}
            onChange={(e) => { e.stopPropagation(); setGroupDone(prev => ({ ...prev, [ge.id]: !prev[ge.id] })); }}
            onClick={(e) => e.stopPropagation()}
            style={{ accentColor: ge.color ?? acc, cursor: "pointer", flexShrink: 0, marginTop: 2, width: 15, height: 15 }}
          />
        </div>
      ))}
    </>
  );

  const doneTodosCount = todos.filter(td => td.done).length;
  const totalTodosCount = todos.length;
  const todosPct = totalTodosCount === 0 ? 0 : Math.round((doneTodosCount / totalTodosCount) * 100);

  const todoBody = (
    <>
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
      {totalTodosCount > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.55, marginBottom: 3, color: ink }}>
            <span>{doneTodosCount}/{totalTodosCount}</span>
            <span style={{ fontWeight: 700 }}>{todosPct}%</span>
          </div>
          <div style={{ height: 4, background: ink + "18", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${todosPct}%`, background: isMon ? MON.yellow : acc, borderRadius: 2, transition: "width 0.4s" }} />
          </div>
        </div>
      )}
      {todos.length === 0
        ? <div style={{ fontSize: 12, opacity: 0.3 }}>{pl.noTodos}</div>
        : todos.map(td => (
          <TodoItem
            key={td.id} td={td}
            isMobile={isMobile} editMode={editMode} dark={dark} ink={ink} acc={acc} border={border} pl={pl}
            onToggle={toggleTodo} onDelete={deleteTodo}
          />
        ))
      }
    </>
  );

  // Mobile segmented control: Timeline (red) / Events (blue) / To-do (yellow)
  const SEGMENTS = [
    ["time",   pl.timeBlocks, MON.red],
    ["events", pl.eventsCol,  MON.blue],
    ["todo",   pl.todoCol,    MON.yellow],
  ];

  return (
    <div>
      {/* Date — larger and color-accented on mobile (dark→yellow, light→blue) */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{
          fontSize: isMobile ? 22 : 13,
          fontWeight: isMobile ? 900 : 700,
          letterSpacing: isMobile ? "-0.01em" : "normal",
          color: isMobile ? (dark ? "#E3B22E" : "#2B3DCB") : ink,
          opacity: isMobile ? 1 : 0.5,
        }}>
          {new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
        <div style={{ fontSize: 11, opacity: 0.3, fontStyle: "italic" }}>{pl.resetNote}</div>
      </div>

      {/* Active date labels (spans) for today */}
      {(() => {
        const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })();
        const active = (spans ?? []).filter(s => s.startDate <= todayStr && todayStr <= s.endDate);
        if (!active.length) return null;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {active.map(s => (
              <div key={s.id} style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px",
                background: s.color + "28", border: `1px solid ${s.color}77`,
                color: ink, borderRadius: 3,
              }}>{s.title}</div>
            ))}
          </div>
        );
      })()}

      {isMobile ? (
        /* ── Mobile: Mondrian segmented control, one section at a time ── */
        <>
          <div style={{ display: "flex", border: "2px solid #1B1A17", marginBottom: 18 }}>
            {SEGMENTS.map(([key, label, monColor], i) => {
              const active = section === key;
              const segBg = isMon ? monColor : acc;
              return (
                <button key={key} onClick={() => setSection(key)} style={{
                  flex: 1, padding: "10px 4px", cursor: "pointer", fontFamily: "inherit",
                  background: active ? segBg : (dark ? "#1e1d16" : "#f4f0e4"),
                  color: active ? (isMon && monColor === MON.yellow ? "#1a1a1a" : "#fff") : ink,
                  border: "none",
                  borderLeft: i > 0 ? "2px solid #1B1A17" : "none",
                  fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
                  opacity: active ? 1 : 0.7, transition: "background 0.15s, color 0.15s",
                }}>{label}</button>
              );
            })}
          </div>
          {section === "time" && (
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 18 }}>{timeBody}</div>
              {/* Scroll rail — drag here to scroll (grid itself captures drag for selection) */}
              <div style={{
                width: 26, alignSelf: "stretch",
                touchAction: "pan-y",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                background: dark ? "#ffffff0a" : "#0000000a",
                border: `1px solid ${border}`,
                color: ink, opacity: 0.4, fontSize: 13, userSelect: "none",
              }}>
                <span>⌃</span>
                <span style={{ writingMode: "vertical-rl", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>scroll</span>
                <span>⌄</span>
              </div>
            </div>
          )}
          {section === "events" && eventsBody}
          {section === "todo"   && todoBody}
        </>
      ) : (
        /* ── Desktop: 3-column layout ── */
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,0.5fr) minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
          <div>
            <div style={colHeader(MON.red)}>{pl.timeBlocks}</div>
            {timeBody}
          </div>
          <div>
            <div style={colHeader(MON.blue)}>{pl.eventsCol}</div>
            {eventsBody}
          </div>
          <div>
            <div style={colHeader(MON.yellow)}>{pl.todoCol}</div>
            {todoBody}
          </div>
        </div>
      )}

      {/* ── Event creation popup ── */}
      {popup && createPortal((
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)" }} onClick={() => setPopup(null)} />
          <div style={{
            position: "fixed",
            left: isMobile ? 14 : "50%",
            right: isMobile ? 14 : "auto",
            top: isMobile ? 16 : "50%",
            transform: isMobile ? "none" : "translate(-50%, -50%)",
            zIndex: 51, width: isMobile ? "auto" : 300, maxWidth: isMobile ? "none" : "90vw",
            background: bg, color: ink,
            border: `2px solid ${acc}`,
            borderRadius: 10, padding: 20,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {cellToTime(popup.startCell)} – {cellToTimeEnd(popup.endCell)}
            </div>
            <input
              value={popTitle}
              onChange={e => setPopTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveEvent()}
              placeholder={pl.eventTitlePlaceholder}
              name="grida-event-title"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-form-type="other"
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
      ), document.body)}

      {/* ── Event detail (tapped a filled block) ── */}
      {viewEvent && createPortal((
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)" }} onClick={() => { setViewEvent(null); setIsEditingView(false); }} />
          <div style={{
            position: "fixed",
            left: isMobile ? 14 : "50%",
            right: isMobile ? 14 : "auto",
            top: isMobile ? 16 : "50%",
            transform: isMobile ? "none" : "translate(-50%, -50%)",
            zIndex: 51, width: isMobile ? "auto" : 300, maxWidth: isMobile ? "none" : "90vw",
            background: bg, color: ink, border: `2px solid ${isEditingView ? editColor : viewEvent.color}`,
            borderRadius: 10, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}>
            {isEditingView ? (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none" }} />
                  <span style={{ lineHeight: "32px", opacity: 0.4, fontSize: 12 }}>–</span>
                  <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none" }} />
                </div>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEditView()}
                  autoFocus
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {EVENT_COLORS.map(c => (
                    <div key={c} onClick={() => setEditColor(c)} style={{ width: 22, height: 22, borderRadius: 4, background: c, cursor: "pointer", flexShrink: 0, outline: editColor === c ? `2.5px solid ${ink}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
                <textarea
                  value={editMemo}
                  onChange={e => setEditMemo(e.target.value)}
                  placeholder={pl.eventMemoPlaceholder}
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none", resize: "none", marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setIsEditingView(false)} style={{ background: "none", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", color: ink, fontFamily: "inherit" }}>
                    {pl.cancel}
                  </button>
                  <button onClick={saveEditView} disabled={!editTitle.trim()} style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: editTitle.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontFamily: "inherit", opacity: editTitle.trim() ? 1 : 0.4 }}>
                    {pl.saveChanges || "Save"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: viewEvent.color, flexShrink: 0 }} />
                  <div style={{ fontWeight: 800, fontSize: 15, wordBreak: "keep-all", textDecoration: viewEvent.done ? "line-through" : "none", opacity: viewEvent.done ? 0.6 : 1 }}>{viewEvent.title}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: viewEvent.memo ? 10 : 0 }}>
                  {viewEvent.startTime ?? cellToTime(viewEvent.startCell)} – {viewEvent.endTime ?? cellToTimeEnd(viewEvent.endCell)}
                </div>
                {viewEvent.memo && <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8, wordBreak: "keep-all", whiteSpace: "pre-wrap" }}>{viewEvent.memo}</div>}
                {viewEvent.fromCalendar && <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>📅 {pl.fromCalendar}</div>}
                {editMode && viewEvent._recurring && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    <button onClick={() => skipOccurrence(viewEvent)} style={{ background: "none", border: `1px solid ${MON.red}`, color: MON.red, borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                      ✕ {pl.skipOccurrence || "Skip today"}
                    </button>
                  </div>
                )}
                {(editMode || viewEvent._isGroupEvent) && !viewEvent._recurring && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    <button onClick={() => { deleteEvent(viewEvent); setViewEvent(null); }} style={{ background: "none", border: `1px solid ${MON.red}`, color: MON.red, borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                      {pl.delete || "Delete"}
                    </button>
                    {!viewEvent._isGroupEvent && (
                      <button onClick={() => moveToTomorrow(viewEvent)} style={{ background: MON.blue, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                        → {pl.moveTomorrow || "Tomorrow"}
                      </button>
                    )}
                    <button onClick={() => openEditView(viewEvent)} style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                      {pl.edit || "Edit"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ), document.body)}

      {/* ── Desktop right-click context menu ── */}
      {ctxMenu && createPortal((
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 52 }} onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
          <div style={{
            position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 53,
            background: bg, color: ink, border: `1px solid ${ink}33`,
            borderRadius: 6, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", minWidth: 150,
          }}>
            {ctxMenu.evt._recurring ? (
              <button onClick={() => skipOccurrence(ctxMenu.evt)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: MON.red, fontSize: 12, padding: "8px 10px", fontFamily: "inherit" }}>
                ✕ {pl.skipOccurrence || "Skip today"}
              </button>
            ) : (
              <>
                <button onClick={() => moveToTomorrow(ctxMenu.evt)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: ink, fontSize: 12, padding: "8px 10px", fontFamily: "inherit" }}>
                  → {pl.moveTomorrow || "Move to tomorrow"}
                </button>
                <button onClick={() => { deleteEvent(ctxMenu.evt); setCtxMenu(null); }} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: MON.red, fontSize: 12, padding: "8px 10px", fontFamily: "inherit" }}>
                  {pl.delete || "Delete"}
                </button>
              </>
            )}
          </div>
        </>
      ), document.body)}
    </div>
  );
}
