import { useState, useEffect } from "react";
import PlannerDaily from "./PlannerDaily";
import PlannerMonthly from "./PlannerMonthly";

// Local-timezone date key (toISOString would use UTC and roll over early)
function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  return localKey(new Date());
}

function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localKey(d);
}

const MON_RED  = "#C7382E";
const MON_BLUE = "#2B3DCB";

export default function Planner({ t, pal, dark, userId, theme, lang }) {
  const pl = t.planner;
  const isMon = theme === "mondrian";
  const [tab, setTab] = useState("daily");
  const [editMode, setEditMode] = useState(true);

  const DAILY_KEY = `grida_daily_${userId}_${todayKey()}`;
  const TODO_KEY  = `grida_todos_${userId}`;
  const CAL_KEY   = `grida_calendar_${userId}`;
  const RECUR_KEY = `grida_recurring_${userId}`;

  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
  };

  const [events,    setEvents]    = useState(() => load(DAILY_KEY, {}).events ?? []);
  const [todos,     setTodos]     = useState(() => load(TODO_KEY, []));
  const [calEvents, setCalEvents] = useState(() => load(CAL_KEY, {}));
  const [recurring, setRecurring] = useState(() => load(RECUR_KEY, []));

  useEffect(() => {
    const prev = load(DAILY_KEY, {});
    localStorage.setItem(DAILY_KEY, JSON.stringify({ ...prev, events }));
  }, [events]);
  useEffect(() => { localStorage.setItem(TODO_KEY,  JSON.stringify(todos));     }, [todos]);
  useEffect(() => { localStorage.setItem(CAL_KEY,   JSON.stringify(calEvents)); }, [calEvents]);
  useEffect(() => { localStorage.setItem(RECUR_KEY, JSON.stringify(recurring)); }, [recurring]);

  // Move an event to tomorrow (same time) by adding it to the calendar
  const moveEventToTomorrow = (calEvt) => {
    const key = tomorrowKey();
    setCalEvents(prev => ({ ...prev, [key]: [...(prev[key] ?? []), calEvt] }));
  };

  const today    = todayKey();
  const todayDow = new Date().getDay();
  const allDailyEvents = [
    ...events,
    ...(calEvents[today] ?? []).map(e => ({ ...e, fromCalendar: true })),
    ...recurring
      .filter(r => r.days.includes(todayDow))
      .map(r => ({ ...r, id: `recur_${r.id}_${today}`, fromCalendar: true })),
  ];

  const ink    = pal.ink;
  const accent = pal.accent;
  const border = dark ? "#333" : "#ddd";

  // Mondrian tab colors: Daily=red, Monthly=blue
  const tabColor = { daily: isMon ? MON_RED : accent, monthly: isMon ? MON_BLUE : accent };

  return (
    <div style={{ color: ink, fontFamily: "inherit" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          display: "flex", gap: isMon ? 0 : 2,
          background: isMon ? "transparent" : dark ? "#1e1d16" : "#e4e1d6",
          borderRadius: isMon ? 0 : 8,
          padding: isMon ? 0 : 3,
          border: isMon ? `2px solid #1B1A17` : "none",
        }}>
          {[["daily", pl.tabDaily], ["monthly", pl.tabMonthly]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: tab === key ? tabColor[key] : isMon ? (dark ? "#1e1d16" : "#f4f0e4") : "transparent",
              color: tab === key ? "#fff" : isMon ? ink : ink,
              border: isMon ? "none" : "none",
              borderRight: isMon && key === "daily" ? "2px solid #1B1A17" : "none",
              padding: "7px 20px", fontWeight: 700, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
              textTransform: "uppercase", letterSpacing: "0.04em",
              transition: "background 0.15s, color 0.15s",
              opacity: (!isMon && tab !== key) ? 0.55 : 1,
              borderRadius: isMon ? 0 : 6,
            }}>{label}</button>
          ))}
        </div>
        {tab === "daily" && (
          <button onClick={() => setEditMode(v => !v)} style={{
            background: "none", border: `1px solid ${border}`,
            borderRadius: isMon ? 0 : 6,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 11, padding: "5px 11px", color: ink, fontWeight: 600,
          }}>
            {editMode ? pl.viewModeBtn : pl.editModeBtn}
          </button>
        )}
      </div>

      {tab === "daily" && (
        <PlannerDaily
          t={t} pal={pal} dark={dark}
          editMode={editMode}
          events={allDailyEvents}
          onEventsChange={setEvents}
          todos={todos}
          onTodosChange={setTodos}
          onMoveToTomorrow={moveEventToTomorrow}
          theme={theme}
          lang={lang}
        />
      )}
      {tab === "monthly" && (
        <PlannerMonthly
          t={t} pal={pal} dark={dark}
          calEvents={calEvents}
          onCalEventsChange={setCalEvents}
          recurring={recurring}
          onRecurringChange={setRecurring}
        />
      )}
    </div>
  );
}
