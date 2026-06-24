import { useState, useEffect } from "react";
import PlannerDaily from "./PlannerDaily";
import PlannerMonthly from "./PlannerMonthly";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function Planner({ t, pal, dark, userId }) {
  const pl = t.planner;
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

  // Merge calendar + recurring into today's daily view
  const today   = todayKey();
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

  return (
    <div style={{ color: ink, fontFamily: "inherit" }}>
      {/* Tab bar — segmented control */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          display: "flex", gap: 2,
          background: dark ? "#1e1d16" : "#e4e1d6",
          borderRadius: 8, padding: 3,
        }}>
          {[["daily", pl.tabDaily], ["monthly", pl.tabMonthly]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: tab === key ? accent : "transparent",
              color: tab === key ? "#fff" : ink,
              border: "none", borderRadius: 6,
              padding: "6px 18px", fontWeight: 700, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
              textTransform: "uppercase", letterSpacing: "0.04em",
              transition: "background 0.15s, color 0.15s",
              opacity: tab === key ? 1 : 0.55,
            }}>{label}</button>
          ))}
        </div>
        {tab === "daily" && (
          <button onClick={() => setEditMode(v => !v)} style={{
            background: "none", border: `1px solid ${border}`,
            borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
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
