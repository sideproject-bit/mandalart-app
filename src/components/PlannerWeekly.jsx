import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useViewport } from "../hooks/useViewport";

const COLS_DAY    = 6;    // 10-min slots per hour (compatible with PlannerDaily)
const HOURS       = 24;
const CELL_H      = 22;   // px per hour row
const PX_PER_CELL = CELL_H / COLS_DAY; // px per 10-min slot (~3.67px)
const LABEL_W   = 32;   // px for time-label column
const DAY_MIN_W = 56;   // min px per day column (mobile horizontal scroll)

const MON = { red: "#C7382E", blue: "#2B3DCB", yellow: "#E3B22E" };

function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekMonday(d) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtShort(d, lang) {
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
}

function fmtDow(d, lang) {
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { weekday: "short" });
}

function cellToTime(cell) {
  const h = Math.floor(cell / COLS_DAY);
  const m = (cell % COLS_DAY) * 10;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function cellToTimeEnd(cell) {
  const total = Math.floor(cell / COLS_DAY) * 60 + (cell % COLS_DAY) * 10 + 10;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const EVENT_COLORS = ["#FFAAAA", "#FFE599", "#AAD4FF", "#C7382E", "#C8960A", "#1A2A9E"];

function timeToCell(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * COLS_DAY + Math.floor(m / 10);
}

function timeToEndCell(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return Math.ceil((h * 60 + m) / 10) - 1;
}

function prevDayKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return localKey(d);
}

export default function PlannerWeekly({ t, pal, dark, calEvents, recurring, onEditDailyEvent, onEditCalEvent, onMoveEvent, spans, theme, lang, groupEvents = [] }) {
  const pl  = t.planner;
  const wk  = pl.weekly ?? {};
  const { isMobile } = useViewport();
  const isMon = theme === "mondrian";
  const ink   = pal.ink;
  const acc   = pal.accent;
  const bg    = pal.bg;
  const border = dark ? "#2a2920" : "#e0ddd2";

  const [weekStart, setWeekStart] = useState(() => getWeekMonday(new Date()));
  const [viewEvt,  setViewEvt]  = useState(null); // { event, dateKey }
  const [isEditingView, setIsEditingView] = useState(false);
  const [editTitle,   setEditTitle]   = useState("");
  const [editColor,   setEditColor]   = useState(EVENT_COLORS[0]);
  const [editMemo,    setEditMemo]    = useState("");
  const [editStart,   setEditStart]   = useState("");
  const [editEnd,     setEditEnd]     = useState("");

  // Drag-to-move / resize state
  const gridRef     = useRef(null);  // the time-grid flex container
  const dragRef     = useRef(null);  // drag state (mutations don't re-render)
  const [dragGhost, setDragGhost]   = useState(null);  // { evt, dateKey, startCell, endCell }
  const [draggingId, setDraggingId] = useState(null);  // id of event being dragged (for dimming)

  const days    = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayKeys = days.map(localKey);
  const today   = localKey(new Date());
  const totalH  = HOURS * CELL_H;

  function openEditEvt(evt) {
    setEditTitle(evt.title);
    setEditColor(evt.color);
    setEditMemo(evt.memo ?? "");
    setEditStart(evt.startTime ?? cellToTime(evt.startCell));
    setEditEnd(evt.endTime ?? cellToTimeEnd(evt.endCell));
    setIsEditingView(true);
  }

  function saveEditEvt() {
    if (!viewEvt || !editTitle.trim()) return;
    const newStartCell = editStart ? timeToCell(editStart) : viewEvt.event.startCell;
    const rawEndCell   = editEnd   ? timeToEndCell(editEnd) : viewEvt.event.endCell;
    const newEndCell   = Math.max(newStartCell, rawEndCell);
    const changes = {
      title: editTitle.trim(), color: editColor, memo: editMemo,
      startTime: editStart || viewEvt.event.startTime,
      endTime:   editEnd   || viewEvt.event.endTime,
      startCell: newStartCell, endCell: newEndCell,
    };
    if (viewEvt.event._daily) {
      onEditDailyEvent?.(viewEvt.event.id, changes);
    } else {
      onEditCalEvent?.(viewEvt.dateKey, viewEvt.event.id, changes);
    }
    setViewEvt(null);
    setIsEditingView(false);
  }

  // ── Drag handlers ──
  function startMoveDrag(evt, dateKey, e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    gridRef.current?.setPointerCapture(e.pointerId);
    const colWidth = gridRef.current
      ? (gridRef.current.scrollWidth - LABEL_W) / 7
      : 80;
    dragRef.current = {
      type: "move", evt, dateKey,
      origStartCell: evt.startCell, origEndCell: evt.endCell,
      origDayIdx: dayKeys.indexOf(dateKey),
      startY: e.clientY, startX: e.clientX, colWidth,
      curStartCell: null, curEndCell: null, curDayIdx: null,
    };
    setDraggingId(evt.id);
  }

  function startResizeDrag(evt, dateKey, e) {
    e.stopPropagation();
    gridRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: "resize", evt, dateKey,
      origStartCell: evt.startCell, origEndCell: evt.endCell,
      origDayIdx: dayKeys.indexOf(dateKey),
      startY: e.clientY, startX: e.clientX, colWidth: 0,
      curStartCell: null, curEndCell: null, curDayIdx: null,
    };
    setDraggingId(evt.id);
  }

  function onDragMove(e) {
    const dr = dragRef.current;
    if (!dr) return;
    const deltaY    = e.clientY - dr.startY;
    const deltaCell = Math.round(deltaY / PX_PER_CELL);

    if (dr.type === "move") {
      const duration    = dr.origEndCell - dr.origStartCell;
      const maxStart    = HOURS * COLS_DAY - 1 - duration;
      const newStart    = Math.max(0, Math.min(maxStart, dr.origStartCell + deltaCell));
      const newEnd      = newStart + duration;
      const deltaDays   = Math.round((e.clientX - dr.startX) / dr.colWidth);
      const newDayIdx   = Math.max(0, Math.min(6, dr.origDayIdx + deltaDays));
      if (dr.curStartCell !== newStart || dr.curDayIdx !== newDayIdx) {
        dr.curStartCell = newStart; dr.curEndCell = newEnd; dr.curDayIdx = newDayIdx;
        dr.moved = true;
        setDragGhost({ evt: dr.evt, dateKey: dayKeys[newDayIdx], startCell: newStart, endCell: newEnd });
      }
    } else {
      const newEnd = Math.max(dr.origStartCell, Math.min(HOURS * COLS_DAY - 1, dr.origEndCell + deltaCell));
      if (dr.curEndCell !== newEnd) {
        dr.curEndCell = newEnd;
        dr.moved = true;
        setDragGhost({ evt: dr.evt, dateKey: dr.dateKey, startCell: dr.origStartCell, endCell: newEnd });
      }
    }
  }

  function onDragEnd() {
    const dr = dragRef.current;
    if (!dr) return;
    const moved = dr.moved;
    dragRef.current = null;
    setDraggingId(null);
    setDragGhost(null);
    if (!moved) return;
    const startCell  = dr.curStartCell ?? dr.origStartCell;
    const endCell    = dr.curEndCell   ?? dr.origEndCell;
    const newDayIdx  = dr.curDayIdx    ?? dr.origDayIdx;
    const newDateKey = dayKeys[newDayIdx];
    if (startCell === dr.origStartCell && endCell === dr.origEndCell && newDateKey === dr.dateKey) return;
    onMoveEvent?.(dr.evt, dr.dateKey, newDateKey, {
      startCell, endCell,
      startTime: cellToTime(startCell),
      endTime:   cellToTimeEnd(endCell),
    });
  }

  function getEventsForDay(day, dateKey) {
    const dow  = day.getDay();
    const cal  = (calEvents[dateKey] ?? [])
      .map(e => {
        // Fallback: derive startCell/endCell from startTime/endTime if missing
        const startCell = e.startCell ?? (e.startTime ? timeToCell(e.startTime) : null);
        const endCell   = e.endCell   ?? (e.endTime   ? Math.max(startCell ?? 0, timeToEndCell(e.endTime)) : startCell);
        return { ...e, _dateKey: dateKey, startCell, endCell };
      })
      .filter(e => e.startCell != null);
    const recur = recurring
      .filter(r => r.days.includes(dow))
      .map(r => ({ ...r, id: `recur_${r.id}_${dateKey}`, fromCalendar: true, _dateKey: dateKey }))
      .filter(r => r.startCell != null);
    return [...cal, ...recur];
  }


  const weekLabel = `${fmtShort(weekStart, lang)} – ${fmtShort(addDays(weekStart, 6), lang)}`;
  const todayAccent = MON.yellow; // today column always yellow

  return (
    <div style={{ color: ink, fontFamily: "inherit" }}>
      {/* Week navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          style={{ background: "none", border: `1px solid ${ink}33`, color: ink, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={15} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 13, flex: 1, textAlign: "center", letterSpacing: "-0.01em" }}>{weekLabel}</span>
        <button onClick={() => setWeekStart(d => addDays(d, 7))}
          style={{ background: "none", border: `1px solid ${ink}33`, color: ink, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronRight size={15} />
        </button>
        <button onClick={() => setWeekStart(getWeekMonday(new Date()))}
          style={{ background: "none", border: `1px solid ${ink}33`, color: ink, cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "5px 8px", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0, whiteSpace: "nowrap" }}>
          {wk.today || (lang === "ko" ? "이번 주" : "This week")}
        </button>
      </div>

      {/* Scrollable grid wrapper */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: LABEL_W + DAY_MIN_W * 7 }}>

          {/* Day-of-week headers */}
          <div style={{ display: "flex", borderBottom: `2px solid ${ink}22`, marginLeft: LABEL_W, paddingLeft: 0 }}>
            {days.map((day, i) => {
              const isToday = dayKeys[i] === today;
              const daySpans = (spans ?? []).filter(s => s.startDate <= dayKeys[i] && dayKeys[i] <= s.endDate);
              return (
                <div key={i} style={{
                  flex: 1, minWidth: DAY_MIN_W,
                  padding: "5px 2px 4px",
                  textAlign: "center",
                  background: isToday ? todayAccent : "transparent",
                  borderLeft: i > 0 ? `1px solid ${border}` : "none",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: isToday ? "#1a1a1a" : ink, opacity: isToday ? 1 : 0.45, letterSpacing: "0.06em" }}>
                    {fmtDow(day, lang)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: isToday ? "#1a1a1a" : ink, lineHeight: 1.2 }}>
                    {day.getDate()}
                  </div>
                  {daySpans.map(s => (
                    <div key={s.id} style={{
                      fontSize: 7, fontWeight: 700, padding: "1px 3px", marginTop: 2,
                      background: s.color, color: "#fff", borderRadius: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{s.title}</div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div ref={gridRef} style={{ display: "flex", position: "relative" }}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >

            {/* Hour labels */}
            <div style={{ width: LABEL_W, flexShrink: 0, height: totalH, position: "relative" }}>
              {Array.from({ length: HOURS }, (_, h) => (
                <div key={h} style={{
                  position: "absolute", top: h * CELL_H, left: 0, right: 0, height: CELL_H,
                  fontSize: 9, fontWeight: 600, textAlign: "right", paddingRight: 4,
                  opacity: 0.35, lineHeight: `${CELL_H}px`, fontVariantNumeric: "tabular-nums",
                  borderBottom: `1px solid ${border}`,
                  color: ink,
                }}>
                  {h % 2 === 0 ? String(h).padStart(2, "0") : ""}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, di) => {
              const dateKey = dayKeys[di];
              const evts = getEventsForDay(day, dateKey);
              const isToday = dateKey === today;

              return (
                <div key={di} style={{
                  flex: 1, minWidth: DAY_MIN_W, height: totalH, position: "relative",
                  borderLeft: `1px solid ${border}`,
                  background: isToday ? (dark ? `${todayAccent}10` : `${todayAccent}08`) : "transparent",
                }}>
                  {/* Hour grid lines */}
                  {Array.from({ length: HOURS }, (_, h) => (
                    <div key={h}
                      style={{
                        position: "absolute", top: h * CELL_H, left: 0, right: 0, height: CELL_H,
                        borderBottom: `1px solid ${h % 2 === 1 ? border : border + "88"}`,
                        zIndex: 0,
                      }}
                    />
                  ))}

                  {/* Determine group events for this day to decide lane widths */}
                  {(() => {
                    const dayGroupEvts = [
                      ...groupEvents.filter(ge => ge.date === dateKey && ge.start_time).map(ge => ({ ge, carryOver: false })),
                      ...groupEvents.filter(ge => {
                        if (!ge.start_time || !ge.end_time || ge.start_time <= ge.end_time) return false;
                        return ge.date === prevDayKey(dateKey);
                      }).map(ge => ({ ge, carryOver: true })),
                    ];
                    const hasGroup = dayGroupEvts.length > 0;
                    // When group events exist: personal=left 58%, group=right 40%
                    const personalRight = hasGroup ? "42%" : 1;
                    const groupLeft     = "60%";

                    return (
                      <>
                        {/* Personal/calendar events */}
                        {evts.filter(e => e.startCell != null).map(evt => {
                          const isDragging = draggingId === evt.id;
                          const startH = Math.floor(evt.startCell / COLS_DAY);
                          const endH   = Math.min(HOURS - 1, Math.max(startH, Math.floor((evt.endCell - 1) / COLS_DAY)));
                          const topPx  = startH * CELL_H + 1;
                          const htPx   = Math.max(CELL_H - 2, (endH - startH + 1) * CELL_H - 2);
                          return (
                            <div key={evt.id}
                              onPointerDown={(e) => startMoveDrag(evt, dateKey, e)}
                              onClick={(e) => { if (!dragRef.current) { e.stopPropagation(); setViewEvt({ event: evt, dateKey }); } }}
                              style={{
                                position: "absolute", top: topPx, left: 1, right: personalRight, height: htPx,
                                background: evt.color + (isDragging ? "44" : "cc"),
                                borderLeft: `2px solid ${evt.color}`,
                                borderRadius: 2, padding: "1px 3px 0",
                                overflow: "hidden", zIndex: 1,
                                cursor: isDragging ? "grabbing" : "grab",
                                touchAction: "none", userSelect: "none",
                              }}
                            >
                              <div style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3, color: dark ? "#fff" : "#111", overflow: "hidden" }}>
                                {evt.title}
                              </div>
                              {htPx > CELL_H && (
                                <div style={{ fontSize: 8, opacity: 0.7, color: dark ? "#fff" : "#111" }}>
                                  {cellToTime(evt.startCell)}
                                </div>
                              )}
                              {/* Resize handle */}
                              <div
                                onPointerDown={(e) => { e.stopPropagation(); startResizeDrag(evt, dateKey, e); }}
                                style={{
                                  position: "absolute", bottom: 0, left: 0, right: 0, height: 6,
                                  cursor: "ns-resize",
                                  background: `${evt.color}55`,
                                  borderTop: `1px solid ${evt.color}99`,
                                }}
                              />
                            </div>
                          );
                        })}

                        {/* Drag ghost */}
                        {dragGhost && dragGhost.dateKey === dateKey && (() => {
                          const g = dragGhost;
                          const startH = Math.floor(g.startCell / COLS_DAY);
                          const endH   = Math.min(HOURS - 1, Math.max(startH, Math.floor((g.endCell - 1) / COLS_DAY)));
                          const topPx  = startH * CELL_H + 1;
                          const htPx   = Math.max(CELL_H - 2, (endH - startH + 1) * CELL_H - 2);
                          return (
                            <div style={{
                              position: "absolute", top: topPx, left: 1, right: personalRight, height: htPx,
                              background: g.evt.color + "88",
                              border: `2px dashed ${g.evt.color}`,
                              borderRadius: 2, padding: "1px 3px",
                              overflow: "hidden", zIndex: 3,
                              pointerEvents: "none",
                            }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: dark ? "#fff" : "#111" }}>{g.evt.title}</div>
                              {htPx > CELL_H && (
                                <div style={{ fontSize: 8, opacity: 0.7, color: dark ? "#fff" : "#111" }}>{cellToTime(g.startCell)} – {cellToTimeEnd(g.endCell)}</div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Group events (read-only, right lane) */}
                        {dayGroupEvts.map(({ ge, carryOver }) => {
                          const isCross = ge.start_time && ge.end_time && ge.start_time > ge.end_time;
                          const sc = timeToCell(ge.start_time);
                          const ec = ge.end_time ? timeToCell(ge.end_time) : sc;
                          if (sc == null) return null;
                          let startH, endH;
                          if (carryOver) {
                            startH = 0;
                            endH = Math.max(0, Math.floor((ec - 1) / COLS_DAY));
                          } else if (isCross) {
                            startH = Math.floor(sc / COLS_DAY);
                            endH = HOURS - 1;
                          } else {
                            startH = Math.floor(sc / COLS_DAY);
                            endH = Math.min(HOURS - 1, Math.max(startH, Math.floor((ec - 1) / COLS_DAY)));
                          }
                          const topPx = startH * CELL_H + 1;
                          const htPx  = Math.max(CELL_H - 2, (endH - startH + 1) * CELL_H - 2);
                          const blockColor = ge.color ?? "#4A90D9";
                          return (
                            <div key={`${ge.id}_${carryOver ? "co" : "s"}`} style={{
                              position: "absolute", top: topPx, left: groupLeft, right: 1, height: htPx,
                              background: blockColor + "99",
                              borderLeft: `2px dashed ${blockColor}`,
                              borderRadius: 2, padding: "1px 3px",
                              overflow: "hidden", zIndex: 1,
                            }}>
                              <div style={{ fontSize: 8, opacity: 0.55, lineHeight: 1.2, color: dark ? "#fff" : "#111" }}>{ge._groupLabel}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3, color: dark ? "#fff" : "#111", overflow: "hidden" }}>
                                {ge.title}{carryOver ? " ↩" : isCross ? " →" : ""}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event detail popup */}
      {viewEvt && createPortal((
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)" }} onClick={() => { setViewEvt(null); setIsEditingView(false); }} />
          <div style={{
            position: "fixed",
            left: isMobile ? 14 : "50%", right: isMobile ? 14 : "auto",
            top: isMobile ? 16 : "50%",
            transform: isMobile ? "none" : "translate(-50%, -50%)",
            zIndex: 51, width: isMobile ? "auto" : 300,
            background: bg, color: ink,
            border: `2px solid ${isEditingView ? editColor : viewEvt.event.color}`, borderRadius: 10, padding: 20,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}>
            {isEditingView ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {viewEvt.dateKey}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
                  <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none" }} />
                  <span style={{ opacity: 0.4, fontSize: 11 }}>–</span>
                  <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, background: dark ? "#1e1d16" : "#fff", color: ink, outline: "none" }} />
                </div>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEditEvt()}
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
                  <button onClick={saveEditEvt} disabled={!editTitle.trim()} style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: editTitle.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontFamily: "inherit", opacity: editTitle.trim() ? 1 : 0.4 }}>
                    {pl.saveChanges || "Save"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: viewEvt.event.color, flexShrink: 0 }} />
                  <div style={{ fontWeight: 800, fontSize: 15, wordBreak: "keep-all" }}>{viewEvt.event.title}</div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 6 }}>
                  {viewEvt.dateKey} · {cellToTime(viewEvt.event.startCell)} – {cellToTimeEnd(viewEvt.event.endCell)}
                </div>
                {viewEvt.event.memo && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8, wordBreak: "keep-all", whiteSpace: "pre-wrap", marginBottom: 8 }}>
                    {viewEvt.event.memo}
                  </div>
                )}
                {viewEvt.event.fromCalendar && (
                  <div style={{ fontSize: 10, opacity: 0.35, marginBottom: 8 }}>📅 {pl.fromCalendar}</div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                  {!viewEvt.event.id.startsWith("recur_") && (
                    <button onClick={() => openEditEvt(viewEvt.event)}
                      style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                      {pl.edit || "Edit"}
                    </button>
                  )}
                  <button onClick={() => setViewEvt(null)}
                    style={{ background: "none", border: `1px solid ${dark ? "#444" : "#ccc"}`, color: ink, borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                    {pl.cancel}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ), document.body)}
    </div>
  );
}
