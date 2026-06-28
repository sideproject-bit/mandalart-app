import { useState, useEffect } from "react";
import PlannerDaily from "./PlannerDaily";
import PlannerMonthly from "./PlannerMonthly";
import PlannerWeekly from "./PlannerWeekly";
import { fetchGroupEventsForUser, deleteGroupEvent } from "../api/groupEventsApi";

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

export default function Planner({ t, pal, dark, userId, theme, lang, groupEventsVersion = 0 }) {
  const pl = t.planner;
  const isMon = theme === "mondrian";
  const [tab, setTab] = useState("daily");
  const [editMode, setEditMode] = useState(true);

  const DAILY_KEY       = `grida_daily_${userId}_${todayKey()}`;
  const TODO_KEY        = `grida_todos_${userId}`;
  const TODO_RESET_KEY  = `grida_todos_reset_${userId}`;
  const CAL_KEY         = `grida_calendar_${userId}`;
  const RECUR_KEY       = `grida_recurring_${userId}`;
  const SPANS_KEY       = `grida_spans_${userId}`;

  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
  };

  const [events,    setEvents]    = useState(() => load(DAILY_KEY, {}).events ?? []);
  const [todos,     setTodos]     = useState(() => load(TODO_KEY, []));
  const [calEvents, setCalEvents] = useState(() => load(CAL_KEY, {}));
  const [recurring, setRecurring] = useState(() => load(RECUR_KEY, []));
  const [spans,     setSpans]     = useState(() => load(SPANS_KEY, []));
  const [groupEvents, setGroupEvents] = useState([]);

  useEffect(() => {
    const prev = load(DAILY_KEY, {});
    localStorage.setItem(DAILY_KEY, JSON.stringify({ ...prev, events }));
  }, [events]);
  useEffect(() => { localStorage.setItem(TODO_KEY,  JSON.stringify(todos));     }, [todos]);
  useEffect(() => { localStorage.setItem(CAL_KEY,   JSON.stringify(calEvents)); }, [calEvents]);
  useEffect(() => { localStorage.setItem(RECUR_KEY, JSON.stringify(recurring)); }, [recurring]);
  useEffect(() => { localStorage.setItem(SPANS_KEY, JSON.stringify(spans));    }, [spans]);

  // Remove completed todos at midnight (once per day)
  useEffect(() => {
    if (!userId) return;
    const today = todayKey();
    if (localStorage.getItem(TODO_RESET_KEY) !== today) {
      setTodos(prev => prev.filter(td => !td.done));
      localStorage.setItem(TODO_RESET_KEY, today);
    }
  }, [userId]);

  // Fetch group events from Supabase
  useEffect(() => {
    if (!userId) return;
    fetchGroupEventsForUser(userId).then(setGroupEvents).catch(() => {});
  }, [userId, groupEventsVersion]);

  const handleDeleteGroupEvent = async (id) => {
    try {
      await deleteGroupEvent(id);
      setGroupEvents(prev => prev.filter(e => e.id !== id));
    } catch {}
  };

  // On mount: migrate past daily keys into calEvents, delete keys older than 60 days.
  useEffect(() => {
    const prefix = `grida_daily_${userId}_`;
    const today  = todayKey();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = localKey(cutoff);

    const toMigrate = [];
    const toDelete  = [];
    // Snapshot keys (length changes if we delete during iteration)
    const allKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const k of allKeys) {
      if (!k || !k.startsWith(prefix)) continue;
      const dateStr = k.slice(prefix.length);
      if (dateStr === today) continue;
      if (dateStr < cutoffStr) toDelete.push(k);
      else toMigrate.push({ k, dateStr });
    }

    if (toMigrate.length > 0) {
      setCalEvents(prev => {
        const next = { ...prev };
        for (const { k, dateStr } of toMigrate) {
          try {
            const data = JSON.parse(localStorage.getItem(k) ?? "null");
            const evts = data?.events ?? [];
            if (evts.length > 0) {
              const existingIds = new Set((next[dateStr] ?? []).map(e => e.id));
              const fresh = evts.filter(e => !existingIds.has(e.id));
              if (fresh.length > 0) next[dateStr] = [...(next[dateStr] ?? []), ...fresh];
            }
          } catch {}
        }
        return next;
      });
    }
    [...toMigrate.map(x => x.k), ...toDelete].forEach(k => localStorage.removeItem(k));
  }, [userId]);

  // Move an event to tomorrow (same time) by adding it to the calendar
  const moveEventToTomorrow = (calEvt) => {
    const key = tomorrowKey();
    setCalEvents(prev => ({ ...prev, [key]: [...(prev[key] ?? []), calEvt] }));
  };

  // Delete a daily (today's) event — called from Monthly/Weekly view
  const deleteDailyEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id));

  // Edit functions
  const editDailyEvent = (id, changes) =>
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));

  const editCalEvent = (dateKey, id, changes) =>
    setCalEvents(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] ?? []).map(e => e.id === id ? { ...e, ...changes } : e),
    }));

  const today    = todayKey();
  const todayDow = new Date().getDay();
  const allDailyEvents = [
    ...events,
    ...(calEvents[today] ?? []).map(e => ({ ...e, fromCalendar: true })),
    ...recurring
      .filter(r => r.days.includes(todayDow))
      .map(r => ({ ...r, id: `recur_${r.id}_${today}`, fromCalendar: true })),
  ];

  // Merge today's daily events into calEvents for Weekly/Monthly.
  // Tag with _daily so Monthly can route deletes back to setEvents.
  const mergedCalEvents = {
    ...calEvents,
    [today]: [
      ...(calEvents[today] ?? []),
      ...events.map(e => ({ ...e, _daily: true, fromCalendar: true })),
    ],
  };

  const ink    = pal.ink;
  const accent = pal.accent;
  const border = dark ? "#333" : "#ddd";

  // Mondrian tab colors: Daily=red, Weekly=yellow, Monthly=blue
  const tabColor = { daily: isMon ? MON_RED : accent, weekly: isMon ? "#E3B22E" : accent, monthly: isMon ? MON_BLUE : accent };

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
          {[["daily", pl.tabDaily], ["weekly", pl.tabWeekly], ["monthly", pl.tabMonthly]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: tab === key ? tabColor[key] : isMon ? (dark ? "#1e1d16" : "#f4f0e4") : "transparent",
              color: tab === key ? "#fff" : isMon ? ink : ink,
              border: isMon ? "none" : "none",
              borderRight: isMon && key !== "monthly" ? "2px solid #1B1A17" : "none",
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
          onEditEvent={editDailyEvent}
          todos={todos}
          onTodosChange={setTodos}
          onMoveToTomorrow={moveEventToTomorrow}
          spans={spans}
          theme={theme}
          lang={lang}
          onDeleteGroupEvent={handleDeleteGroupEvent}
          groupEvents={(() => {
            const yesterday = localKey(new Date(new Date().setDate(new Date().getDate() - 1)));
            return groupEvents.filter(e =>
              e.date === today ||
              (e.date === yesterday && e.start_time && e.end_time && e.start_time > e.end_time)
            ).map(e => ({ ...e, _carryOver: e.date !== today }));
          })()}
        />
      )}
      {tab === "weekly" && (
        <PlannerWeekly
          t={t} pal={pal} dark={dark}
          calEvents={mergedCalEvents}
          recurring={recurring}
          onEditDailyEvent={editDailyEvent}
          onEditCalEvent={editCalEvent}
          spans={spans}
          theme={theme}
          lang={lang}
          groupEvents={groupEvents}
        />
      )}
      {tab === "monthly" && (
        <PlannerMonthly
          t={t} pal={pal} dark={dark}
          lang={lang}
          calEvents={mergedCalEvents}
          onCalEventsChange={setCalEvents}
          onDeleteDailyEvent={deleteDailyEvent}
          onEditDailyEvent={editDailyEvent}
          onEditCalEvent={editCalEvent}
          recurring={recurring}
          onRecurringChange={setRecurring}
          spans={spans}
          onSpansChange={setSpans}
          groupEvents={groupEvents}
        />
      )}
    </div>
  );
}
