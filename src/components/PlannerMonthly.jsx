import { useState } from "react";
import { createPortal } from "react-dom";
import { useViewport } from "../hooks/useViewport";

const EVENT_COLORS = ["#FFAAAA", "#FFE599", "#AAD4FF", "#C7382E", "#C8960A", "#1A2A9E"];
const COLS = 6;

function timeToCell(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 6 + Math.floor(m / 10);
}

function timeToEndCell(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return Math.ceil((h * 60 + m) / 10) - 1;
}

function cellToTime(cell) {
  const h = Math.floor(cell / COLS);
  const m = (cell % COLS) * 10;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function cellToTimeEnd(cell) {
  const total = Math.floor(cell / COLS) * 60 + (cell % COLS) * 10 + 10;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function evtTime(evt) {
  const start = evt.startTime ?? (evt.startCell != null ? cellToTime(evt.startCell) : null);
  const end   = evt.endTime   ?? (evt.endCell   != null ? cellToTimeEnd(evt.endCell) : null);
  return start && end ? `${start} – ${end}` : null;
}

export default function PlannerMonthly({ t, pal, dark, lang, calEvents, onCalEventsChange, onDeleteDailyEvent, onEditDailyEvent, onEditCalEvent, recurring, onRecurringChange, onSkipRecurring, spans, onSpansChange, groupEvents = [] }) {
  const pl  = t.planner;
  const ink = pal.ink;
  const acc = pal.accent;
  const bg  = pal.bg;
  const border = dark ? "#2a2920" : "#ddd";
  const { isMobile } = useViewport();

  const today = new Date();
  const [year,         setYear]         = useState(today.getFullYear());
  const [month,        setMonth]        = useState(today.getMonth());
  const [selectedDay,  setSelectedDay]  = useState(null);
  const [subTab,       setSubTab]       = useState("events");

  // New event form
  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState("09:00");
  const [evEnd,   setEvEnd]   = useState("10:00");
  const [evColor, setEvColor] = useState(EVENT_COLORS[0]);

  // Recurring form
  const [rcTitle, setRcTitle] = useState("");
  const [rcDays,  setRcDays]  = useState([]);
  const [rcStart, setRcStart] = useState("09:00");
  const [rcEnd,   setRcEnd]   = useState("10:00");
  const [rcColor, setRcColor] = useState(EVENT_COLORS[0]);

  // Spans (date labels) form
  const [spTitle,  setSpTitle]  = useState("");
  const [spFrom,   setSpFrom]   = useState("");
  const [spTo,     setSpTo]     = useState("");
  const [spColor,  setSpColor]  = useState(EVENT_COLORS[2]); // default light blue

  // Edit event
  const [editEvt,    setEditEvt]    = useState(null); // { evt, dateKey }
  const [editTitle,  setEditTitle]  = useState("");
  const [editColor,  setEditColor]  = useState(EVENT_COLORS[0]);
  const [editMemo,   setEditMemo]   = useState("");
  const [editStart,  setEditStart]  = useState("");
  const [editEnd,    setEditEnd]    = useState("");

  const firstDow     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const totalCells   = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const calCells     = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDow + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  // Local-timezone key (toISOString would use UTC and roll over early)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function dateKey(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  function addCalEvent() {
    if (!evTitle.trim() || !selectedDay) return;
    const key = dateKey(selectedDay);
    const evt = {
      id: Date.now().toString(),
      title: evTitle.trim(),
      startTime: evStart,
      endTime: evEnd,
      color: evColor,
      startCell: timeToCell(evStart),
      endCell: Math.max(timeToCell(evStart), timeToEndCell(evEnd)),
    };
    onCalEventsChange(prev => ({ ...prev, [key]: [...(prev[key] ?? []), evt] }));
    setEvTitle(""); setEvStart("09:00"); setEvEnd("10:00");
  }

  function deleteCalEvent(day, evt) {
    if (evt._daily && onDeleteDailyEvent) {
      onDeleteDailyEvent(evt.id);
    } else {
      const key = dateKey(day);
      onCalEventsChange(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(e => e.id !== evt.id) }));
    }
  }

  function addRecurring() {
    if (!rcTitle.trim() || rcDays.length === 0) return;
    onRecurringChange(prev => [...prev, {
      id: Date.now().toString(),
      title: rcTitle.trim(),
      days: rcDays,
      startTime: rcStart,
      endTime: rcEnd,
      color: rcColor,
      startCell: timeToCell(rcStart),
      endCell: Math.max(timeToCell(rcStart), timeToEndCell(rcEnd)),
    }]);
    setRcTitle(""); setRcDays([]); setRcStart("09:00"); setRcEnd("10:00");
  }

  function deleteRecurring(id) {
    onRecurringChange(prev => prev.filter(r => r.id !== id));
  }

  function toggleDay(d) {
    setRcDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function addSpan() {
    if (!spTitle.trim() || !spFrom || !spTo || spFrom > spTo) return;
    onSpansChange(prev => [...prev, { id: Date.now().toString(), title: spTitle.trim(), color: spColor, startDate: spFrom, endDate: spTo }]);
    setSpTitle(""); setSpFrom(""); setSpTo("");
  }

  function deleteSpan(id) {
    onSpansChange(prev => prev.filter(s => s.id !== id));
  }

  function openEditEvt(evt, dateKey) {
    setEditTitle(evt.title);
    setEditColor(evt.color);
    setEditMemo(evt.memo ?? "");
    setEditStart(evt.startTime ?? "");
    setEditEnd(evt.endTime ?? "");
    setEditEvt({ evt, dateKey });
  }

  function saveEditEvt() {
    if (!editEvt || !editTitle.trim()) return;
    const newStartCell = editStart ? timeToCell(editStart) : editEvt.evt.startCell;
    const rawEndCell   = editEnd   ? timeToEndCell(editEnd) : editEvt.evt.endCell;
    const newEndCell   = Math.max(newStartCell ?? 0, rawEndCell ?? 0);
    const changes = {
      title: editTitle.trim(), color: editColor, memo: editMemo,
      ...(editStart && { startTime: editStart, startCell: newStartCell }),
      ...(editEnd   && { endTime:   editEnd,   endCell:   newEndCell }),
    };
    if (editEvt.evt._daily) {
      onEditDailyEvent?.(editEvt.evt.id, changes);
    } else {
      onEditCalEvent?.(editEvt.dateKey, editEvt.evt.id, changes);
    }
    setEditEvt(null);
  }

  const inputSt = {
    width: "100%", boxSizing: "border-box",
    padding: "7px 10px", fontSize: 12, fontFamily: "inherit",
    border: `1px solid ${dark ? "#444" : "#ccc"}`,
    borderRadius: 6, background: dark ? "#1e1d16" : "#fff",
    color: ink, outline: "none", marginBottom: 8,
  };

  return (
    <>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 260px", gap: 28, alignItems: "start" }}>

      {/* ── Calendar ── */}
      <div>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: ink, fontSize: 20, lineHeight: 1, padding: "0 4px" }}>‹</button>
          <div style={{ fontWeight: 900, fontSize: 15, textTransform: "uppercase", letterSpacing: "-0.01em", flex: 1, textAlign: "center" }}>
            {pl.months[month]} {year}
          </div>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: ink, fontSize: 20, lineHeight: 1, padding: "0 4px" }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {pl.days.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, opacity: 0.38, textTransform: "uppercase", paddingBottom: 4 }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {calCells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key   = dateKey(d);
            const isToday    = key === todayStr;
            const isSelected = d === selectedDay;
            const cellDow    = new Date(key + "T00:00:00").getDay();
            const hasRecurring = recurring.some(r => r.days.includes(cellDow) && !(r.exceptions ?? []).includes(key));
            const hasEvents     = (calEvents[key] ?? []).length > 0 || hasRecurring;
            const hasGroupEvts  = groupEvents.some(ge => ge.date === key || (ge.start_time && ge.end_time && ge.start_time > ge.end_time && (() => { const d = new Date(ge.date + "T00:00:00"); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })() === key));
            const cellSpans     = (spans ?? []).filter(s => s.startDate <= key && key <= s.endDate);
            return (
              <div key={i}
                onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                style={{
                  height: 64, borderRadius: 4, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: isSelected ? acc : isToday ? acc + "22" : "transparent",
                  border: `1px solid ${isSelected ? acc : border}`,
                  transition: "background 0.1s", padding: "2px 2px 3px", boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday ? 900 : 400, color: isSelected ? "#fff" : ink }}>
                  {d}
                </span>
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {hasEvents && <div style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? "#fff" : acc }} />}
                  {hasGroupEvts && <div style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? "#fff" : "#4A90D9", opacity: 0.8 }} />}
                </div>
                {cellSpans.slice(0, 2).map(s => (
                  <div key={s.id} style={{
                    fontSize: 7, fontWeight: 700, padding: "0 3px", marginTop: 2,
                    background: isSelected ? "#ffffff44" : s.color + "cc",
                    color: isSelected ? "#fff" : "#fff",
                    borderRadius: 2, width: "90%", textAlign: "center",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{s.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div>
        {/* Sub-tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, marginBottom: 16 }}>
          {[["events", pl.tabEvents], ["recurring", pl.tabRecurring], ["labels", pl.tabLabels]].map(([key, label]) => (
            <button key={key} onClick={() => setSubTab(key)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontWeight: subTab === key ? 800 : 400, fontSize: 12, padding: "6px 12px",
              color: subTab === key ? acc : ink,
              borderBottom: subTab === key ? `2px solid ${acc}` : "2px solid transparent",
              marginBottom: -1, textTransform: "uppercase", letterSpacing: "0.04em",
            }}>{label}</button>
          ))}
        </div>

        {/* Events sub-tab */}
        {subTab === "events" && !selectedDay && (
          <div style={{ fontSize: 12, opacity: 0.35 }}>{pl.selectDate}</div>
        )}
        {subTab === "events" && selectedDay && (() => {
          const key = dateKey(selectedDay);
          const dayEvents = calEvents[key] ?? [];
          const selectedDow = new Date(key + "T00:00:00").getDay();
          const dayRecurring = recurring
            .filter(r => r.days.includes(selectedDow) && !(r.exceptions ?? []).includes(key))
            .map(r => ({ ...r, _recurring: true, _recurringId: r.id }));
          const allDayEvents = [...dayEvents, ...dayRecurring]
            .sort((a, b) => (a.startCell ?? Infinity) - (b.startCell ?? Infinity));
          const dayGroupEvents = groupEvents.filter(ge => {
            if (ge.date === key) return true;
            if (ge.start_time && ge.end_time && ge.start_time > ge.end_time) {
              const d = new Date(ge.date + "T00:00:00"); d.setDate(d.getDate() + 1);
              const nextKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              return nextKey === key;
            }
            return false;
          }).map(ge => ({ ...ge, _carryOver: ge.date !== key }));
          return (
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 12, textTransform: "uppercase" }}>
                {pl.months[month]} {selectedDay}{lang === "ko" ? "일" : ""}
              </div>

              {allDayEvents.map(evt => (
                <div key={evt._recurring ? `recur_${evt.id}_${key}` : evt.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px", marginBottom: 6,
                  background: dark ? "#1e1d16" : "#f0ede2",
                  borderLeft: `3px ${evt._recurring ? "dashed" : "solid"} ${evt.color}`, borderRadius: 4,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, wordBreak: "keep-all" }}>{evt.title}</div>
                    {evtTime(evt) && <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{evtTime(evt)}</div>}
                    {evt._recurring && <div style={{ fontSize: 10, opacity: 0.35, marginTop: 2 }}>↻ {pl.recurring || "Recurring"}</div>}
                  </div>
                  {evt._recurring ? (
                    <button onClick={() => onSkipRecurring?.(evt._recurringId, key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C7382E", opacity: 0.6, fontSize: 11, padding: "0 2px", lineHeight: 1, fontFamily: "inherit", fontWeight: 700 }}>✕</button>
                  ) : (
                    <>
                      <button onClick={() => openEditEvt(evt, dateKey(selectedDay))} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.45, fontSize: 12, padding: "0 2px", lineHeight: 1 }}>✏</button>
                      <button onClick={() => deleteCalEvent(selectedDay, evt)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.3, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                    </>
                  )}
                </div>
              ))}

              {/* Group events (read-only) */}
              {dayGroupEvents.map(ge => (
                <div key={ge.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px", marginBottom: 6,
                  background: dark ? "#1e1d16" : "#f0ede2",
                  borderLeft: `3px dashed ${ge.color ?? "#4A90D9"}`, borderRadius: 4,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, wordBreak: "keep-all" }}>
                      <span style={{ opacity: 0.5, marginRight: 4 }}>{ge._groupLabel}</span>{ge.title}
                    </div>
                    {ge.start_time && (
                      <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
                        {ge._carryOver ? `↩ – ${ge.end_time}` : ge.end_time ? `${ge.start_time} – ${ge.end_time}` : ge.start_time}
                      </div>
                    )}
                    {ge.memo && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 3 }}>{ge.memo}</div>}
                  </div>
                </div>
              ))}

              {/* Add event form */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${border}` }}>
                <input value={evTitle} onChange={e => setEvTitle(e.target.value)}
                  placeholder={pl.eventTitlePlaceholder} style={inputSt} />
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <input type="time" value={evStart} onChange={e => setEvStart(e.target.value)}
                    style={{ ...inputSt, flex: 1, marginBottom: 0, padding: "6px 8px" }} />
                  <input type="time" value={evEnd} onChange={e => setEvEnd(e.target.value)}
                    style={{ ...inputSt, flex: 1, marginBottom: 0, padding: "6px 8px" }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, marginTop: 8 }}>
                  {EVENT_COLORS.map(c => (
                    <div key={c} onClick={() => setEvColor(c)} style={{
                      width: 20, height: 20, borderRadius: 3, background: c, cursor: "pointer",
                      outline: evColor === c ? `2.5px solid ${ink}` : "none", outlineOffset: 2,
                    }} />
                  ))}
                </div>
                <button onClick={addCalEvent} disabled={!evTitle.trim()} style={{
                  width: "100%", background: acc, color: "#fff", border: "none",
                  borderRadius: 6, padding: "8px", fontSize: 12, fontWeight: 700,
                  cursor: evTitle.trim() ? "pointer" : "not-allowed",
                  opacity: evTitle.trim() ? 1 : 0.4, fontFamily: "inherit",
                }}>{pl.addEvent}</button>
              </div>
            </div>
          );
        })()}

        {/* Recurring sub-tab */}
        {subTab === "recurring" && (
          <div>
            {recurring.map(r => (
              <div key={r.id} style={{
                padding: "8px 10px", borderLeft: `3px solid ${r.color}`,
                background: dark ? "#1e1d16" : "#f0ede2",
                borderRadius: 4, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, wordBreak: "keep-all" }}>{r.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
                    {r.days.map(d => pl.days[d]).join(" · ")} · {r.startTime}–{r.endTime}
                  </div>
                </div>
                <button onClick={() => deleteRecurring(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.3, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}

            <div style={{ paddingTop: recurring.length > 0 ? 14 : 0, borderTop: recurring.length > 0 ? `1px solid ${border}` : "none" }}>
              <input value={rcTitle} onChange={e => setRcTitle(e.target.value)}
                placeholder={pl.recurringTitlePlaceholder} style={inputSt} />

              {/* Day picker */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                {pl.days.map((d, i) => (
                  <button key={i} onClick={() => toggleDay(i)} style={{
                    background: rcDays.includes(i) ? acc : "transparent",
                    color: rcDays.includes(i) ? "#fff" : ink,
                    border: `1px solid ${rcDays.includes(i) ? acc : border}`,
                    borderRadius: 4, padding: "3px 7px", fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 600,
                  }}>{d}</button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input type="time" value={rcStart} onChange={e => setRcStart(e.target.value)}
                  style={{ ...inputSt, flex: 1, marginBottom: 0, padding: "6px 8px" }} />
                <input type="time" value={rcEnd} onChange={e => setRcEnd(e.target.value)}
                  style={{ ...inputSt, flex: 1, marginBottom: 0, padding: "6px 8px" }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, marginTop: 8 }}>
                {EVENT_COLORS.map(c => (
                  <div key={c} onClick={() => setRcColor(c)} style={{
                    width: 20, height: 20, borderRadius: 3, background: c, cursor: "pointer",
                    outline: rcColor === c ? `2.5px solid ${ink}` : "none", outlineOffset: 2,
                  }} />
                ))}
              </div>
              <button onClick={addRecurring} disabled={!rcTitle.trim() || rcDays.length === 0} style={{
                width: "100%", background: acc, color: "#fff", border: "none",
                borderRadius: 6, padding: "8px", fontSize: 12, fontWeight: 700,
                cursor: (rcTitle.trim() && rcDays.length > 0) ? "pointer" : "not-allowed",
                opacity: (rcTitle.trim() && rcDays.length > 0) ? 1 : 0.4, fontFamily: "inherit",
              }}>{pl.addRecurring}</button>
            </div>
          </div>
        )}

        {/* Labels sub-tab */}
        {subTab === "labels" && (
          <div>
            {(spans ?? []).length === 0
              ? <div style={{ fontSize: 12, opacity: 0.35, marginBottom: 14 }}>{pl.noLabels}</div>
              : (spans ?? []).map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 6,
                  borderLeft: `3px solid ${s.color}`, borderRadius: 4,
                  background: dark ? "#1e1d16" : "#f0ede2",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{s.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{s.startDate} – {s.endDate}</div>
                  </div>
                  <button onClick={() => deleteSpan(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.3, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))
            }
            <div style={{ paddingTop: (spans ?? []).length > 0 ? 14 : 0, borderTop: (spans ?? []).length > 0 ? `1px solid ${border}` : "none" }}>
              <input value={spTitle} onChange={e => setSpTitle(e.target.value)}
                placeholder={pl.labelTitlePlaceholder} style={inputSt} />
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 3 }}>{pl.labelFrom}</div>
                  <input type="date" value={spFrom} onChange={e => setSpFrom(e.target.value)}
                    style={{ ...inputSt, marginBottom: 0, padding: "6px 8px" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 3 }}>{pl.labelTo}</div>
                  <input type="date" value={spTo} onChange={e => setSpTo(e.target.value)}
                    style={{ ...inputSt, marginBottom: 0, padding: "6px 8px" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {EVENT_COLORS.map(c => (
                  <div key={c} onClick={() => setSpColor(c)} style={{
                    width: 20, height: 20, borderRadius: 3, background: c, cursor: "pointer",
                    outline: spColor === c ? `2.5px solid ${ink}` : "none", outlineOffset: 2,
                  }} />
                ))}
              </div>
              <button onClick={addSpan} disabled={!spTitle.trim() || !spFrom || !spTo || spFrom > spTo} style={{
                width: "100%", background: acc, color: "#fff", border: "none",
                borderRadius: 6, padding: "8px", fontSize: 12, fontWeight: 700,
                cursor: (spTitle.trim() && spFrom && spTo && spFrom <= spTo) ? "pointer" : "not-allowed",
                opacity: (spTitle.trim() && spFrom && spTo && spFrom <= spTo) ? 1 : 0.4, fontFamily: "inherit",
              }}>{pl.addLabel}</button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Edit event popup */}
      {editEvt && createPortal((
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.45)" }} onClick={() => setEditEvt(null)} />
          <div style={{
            position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            zIndex: 51, width: 300, maxWidth: "90vw",
            background: bg, color: ink, border: `2px solid ${editColor}`,
            borderRadius: 10, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}>
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
              <button onClick={() => setEditEvt(null)} style={{ background: "none", border: `1px solid ${dark ? "#444" : "#ccc"}`, borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: "pointer", color: ink, fontFamily: "inherit" }}>
                {pl.cancel}
              </button>
              <button onClick={saveEditEvt} disabled={!editTitle.trim()} style={{ background: acc, color: "#fff", border: "none", borderRadius: 6, padding: "6px 13px", fontSize: 12, cursor: editTitle.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontFamily: "inherit", opacity: editTitle.trim() ? 1 : 0.4 }}>
                {pl.saveChanges || "Save"}
              </button>
            </div>
          </div>
        </>
      ), document.body)}
    </>
  );
}
