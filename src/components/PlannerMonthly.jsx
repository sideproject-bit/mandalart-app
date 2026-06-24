import { useState } from "react";

const EVENT_COLORS = ["#C7382E", "#2B3DCB", "#E3B22E", "#1F7A4D", "#9B59B6", "#E86E50"];

function timeToCell(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 6 + Math.floor(m / 10);
}

export default function PlannerMonthly({ t, pal, dark, calEvents, onCalEventsChange, recurring, onRecurringChange }) {
  const pl  = t.planner;
  const ink = pal.ink;
  const acc = pal.accent;
  const bg  = pal.bg;
  const border = dark ? "#2a2920" : "#ddd";

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

  const firstDow     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const totalCells   = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const calCells     = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDow + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const todayStr = today.toISOString().slice(0, 10);

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
      endCell: Math.max(timeToCell(evStart), timeToCell(evEnd) - 1),
    };
    onCalEventsChange(prev => ({ ...prev, [key]: [...(prev[key] ?? []), evt] }));
    setEvTitle(""); setEvStart("09:00"); setEvEnd("10:00");
  }

  function deleteCalEvent(day, id) {
    const key = dateKey(day);
    onCalEventsChange(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(e => e.id !== id) }));
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
      endCell: Math.max(timeToCell(rcStart), timeToCell(rcEnd) - 1),
    }]);
    setRcTitle(""); setRcDays([]); setRcStart("09:00"); setRcEnd("10:00");
  }

  function deleteRecurring(id) {
    onRecurringChange(prev => prev.filter(r => r.id !== id));
  }

  function toggleDay(d) {
    setRcDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  const inputSt = {
    width: "100%", boxSizing: "border-box",
    padding: "7px 10px", fontSize: 12, fontFamily: "inherit",
    border: `1px solid ${dark ? "#444" : "#ccc"}`,
    borderRadius: 6, background: dark ? "#1e1d16" : "#fff",
    color: ink, outline: "none", marginBottom: 8,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>

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
            const hasEvents  = (calEvents[key] ?? []).length > 0;
            return (
              <div key={i}
                onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                style={{
                  height: 46, borderRadius: 4, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: isSelected ? acc : isToday ? acc + "22" : "transparent",
                  border: `1px solid ${isSelected ? acc : border}`,
                  transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday ? 900 : 400, color: isSelected ? "#fff" : ink }}>
                  {d}
                </span>
                {hasEvents && (
                  <div style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? "#fff" : acc, marginTop: 3 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div>
        {/* Sub-tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, marginBottom: 16 }}>
          {[["events", pl.tabEvents], ["recurring", pl.tabRecurring]].map(([key, label]) => (
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
          return (
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 12, textTransform: "uppercase" }}>
                {pl.months[month]} {selectedDay}
              </div>

              {dayEvents.map(evt => (
                <div key={evt.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px", marginBottom: 6,
                  background: dark ? "#1e1d16" : "#f0ede2",
                  borderLeft: `3px solid ${evt.color}`, borderRadius: 4,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, wordBreak: "keep-all" }}>{evt.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{evt.startTime} – {evt.endTime}</div>
                  </div>
                  <button onClick={() => deleteCalEvent(selectedDay, evt.id)} style={{ background: "none", border: "none", cursor: "pointer", color: ink, opacity: 0.3, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
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
      </div>
    </div>
  );
}
