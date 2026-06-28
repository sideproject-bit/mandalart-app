import { useState, useEffect, useRef } from "react";
import { Cloud, CloudUpload, CloudDownload, Check, AlertCircle } from "lucide-react";
import PlannerDaily from "./PlannerDaily";
import PlannerMonthly from "./PlannerMonthly";
import PlannerWeekly from "./PlannerWeekly";
import { fetchGroupEventsForUser, deleteGroupEvent, updateGroupEvent } from "../api/groupEventsApi";
import { pushPlannerSync, pullPlannerSync } from "../api/plannerSyncApi";

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

export default function Planner({ t, pal, dark, userId, theme, lang, groupEventsVersion = 0, weeklyCompact = false, setWeeklyCompact }) {
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

  const handleEditGroupEvent = async (id, changes) => {
    try {
      await updateGroupEvent(id, changes);
      setGroupEvents(prev => prev.map(e => e.id === id ? { ...e, ...changes, start_time: changes.startTime ?? e.start_time, end_time: changes.endTime ?? e.end_time } : e));
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
      // Build merged state synchronously from current localStorage (not React state)
      // so we can persist to CAL_KEY BEFORE deleting old per-day keys — prevents
      // data loss if the app closes between setState and the calEvents save effect.
      const storedCal = JSON.parse(localStorage.getItem(`grida_calendar_${userId}`) ?? "{}");
      const nextCal = { ...storedCal };
      for (const { k, dateStr } of toMigrate) {
        try {
          const data = JSON.parse(localStorage.getItem(k) ?? "null");
          const evts = data?.events ?? [];
          if (evts.length > 0) {
            const existingIds = new Set((nextCal[dateStr] ?? []).map(e => e.id));
            const fresh = evts.filter(e => !existingIds.has(e.id));
            if (fresh.length > 0) nextCal[dateStr] = [...(nextCal[dateStr] ?? []), ...fresh];
          }
        } catch {}
      }
      localStorage.setItem(`grida_calendar_${userId}`, JSON.stringify(nextCal));
      setCalEvents(nextCal);
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

  const deleteCalEvent = (dateKey, id) =>
    setCalEvents(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] ?? []).filter(e => e.id !== id),
    }));

  const moveCalEventToDate = (evt, origDateKey, newDateKey, changes) => {
    if (origDateKey === newDateKey) {
      if (evt._daily) {
        setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, ...changes } : e));
      } else {
        setCalEvents(prev => ({
          ...prev,
          [origDateKey]: (prev[origDateKey] ?? []).map(e => e.id === evt.id ? { ...e, ...changes } : e),
        }));
      }
    } else {
      const clean = { id: evt.id, title: evt.title, color: evt.color, memo: evt.memo ?? "", ...changes };
      if (evt._daily) {
        setEvents(prev => prev.filter(e => e.id !== evt.id));
      } else {
        setCalEvents(prev => ({
          ...prev,
          [origDateKey]: (prev[origDateKey] ?? []).filter(e => e.id !== evt.id),
        }));
      }
      setCalEvents(prev => ({ ...prev, [newDateKey]: [...(prev[newDateKey] ?? []), clean] }));
    }
  };

  const skipRecurringOccurrence = (recurringId, dateKey) =>
    setRecurring(prev => prev.map(r =>
      r.id === recurringId ? { ...r, exceptions: [...(r.exceptions ?? []), dateKey] } : r
    ));

  const today    = todayKey();
  const todayDow = new Date().getDay();
  const allDailyEvents = [
    ...events,
    ...(calEvents[today] ?? []).map(e => ({ ...e, fromCalendar: true, _dateKey: today })),
    ...recurring
      .filter(r => r.days.includes(todayDow) && !(r.exceptions ?? []).includes(today))
      .map(r => ({ ...r, id: `recur_${r.id}_${today}`, fromCalendar: true, _recurring: true, _recurringId: r.id, _dateKey: today })),
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

  // ── Cloud Sync ──
  const SYNC_TIME_KEY = `grida_sync_time_${userId}`;
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const [syncOpen,   setSyncOpen]   = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null|"saving"|"loading"|"saved"|"loaded"|"no_data"|"error"
  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem(`grida_sync_time_${userId}`) ?? null);
  const syncPanelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    if (!syncOpen) return;
    const handler = (e) => {
      if (syncPanelRef.current && !syncPanelRef.current.contains(e.target)) setSyncOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [syncOpen]);

  const formatSyncTime = (iso) => {
    if (!iso) return null;
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return lang === "ko" ? "방금 전" : "just now";
    if (diff < 3600) return lang === "ko" ? `${Math.floor(diff / 60)}분 전` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return lang === "ko" ? `${Math.floor(diff / 3600)}시간 전` : `${Math.floor(diff / 3600)}h ago`;
    return lang === "ko" ? `${Math.floor(diff / 86400)}일 전` : `${Math.floor(diff / 86400)}d ago`;
  };

  const handleSaveToCloud = async () => {
    setSyncStatus("saving");
    try {
      const payload = {
        todos,
        calEvents,
        recurring,
        spans,
        dailyKey: todayKey(),
        dailyEvents: events,
        savedAt: new Date().toISOString(),
      };
      await pushPlannerSync(userId, payload);
      const now = new Date().toISOString();
      localStorage.setItem(SYNC_TIME_KEY, now);
      setLastSynced(now);
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus(null), 3000);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleLoadFromCloud = async () => {
    setSyncStatus("loading");
    try {
      const remote = await pullPlannerSync(userId);
      if (!remote) { setSyncStatus("no_data"); setTimeout(() => setSyncStatus(null), 3000); return; }
      const d = remote.data;
      if (d.todos)     setTodos(d.todos);
      if (d.calEvents) setCalEvents(d.calEvents);
      if (d.recurring) setRecurring(d.recurring);
      if (d.spans)     setSpans(d.spans);
      if (d.dailyKey === todayKey() && d.dailyEvents) setEvents(d.dailyEvents);
      const t = remote.synced_at;
      localStorage.setItem(SYNC_TIME_KEY, t);
      setLastSynced(t);
      setSyncStatus("loaded");
      setTimeout(() => setSyncStatus(null), 3000);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const syncCopy = {
    title:    lang === "ko" ? "플래너 동기화" : "Sync Planner",
    lastSave: lang === "ko" ? "마지막 저장" : "Last saved",
    never:    lang === "ko" ? "저장 기록 없음" : "Never saved",
    push:     lang === "ko" ? "이 기기 → 클라우드" : "This device → Cloud",
    pushDesc: lang === "ko" ? "현재 기기의 일정·할 일·달력 데이터를 클라우드에 저장해요." : "Saves your events, to-dos, and calendar data from this device to the cloud.",
    pull:     lang === "ko" ? "클라우드 → 이 기기" : "Cloud → This device",
    pullDesc: lang === "ko" ? "클라우드에 저장된 데이터를 불러와서 현재 기기에 적용해요." : "Loads the last saved version from the cloud and applies it to this device.",
    pullWarn: lang === "ko" ? "현재 로컬 데이터를 덮어씁니다." : "This will overwrite your current local data.",
    saved:    lang === "ko" ? "클라우드에 저장됐어요" : "Saved to cloud",
    loaded:   lang === "ko" ? "데이터를 불러왔어요" : "Loaded from cloud",
    no_data:  lang === "ko" ? "저장된 데이터가 없어요" : "No cloud data found",
    error:    lang === "ko" ? "오류가 발생했어요" : "Something went wrong",
    saving:   lang === "ko" ? "저장 중…" : "Saving…",
    loading:  lang === "ko" ? "불러오는 중…" : "Loading…",
  };

  const statusMsg = syncStatus === "saving"  ? syncCopy.saving
    : syncStatus === "loading" ? syncCopy.loading
    : syncStatus === "saved"   ? syncCopy.saved
    : syncStatus === "loaded"  ? syncCopy.loaded
    : syncStatus === "no_data" ? syncCopy.no_data
    : syncStatus === "error"   ? syncCopy.error
    : null;

  // Mondrian tab colors: Daily=red, Weekly=yellow, Monthly=blue
  const tabColor = { daily: isMon ? MON_RED : accent, weekly: isMon ? "#E3B22E" : accent, monthly: isMon ? MON_BLUE : accent };

  return (
    <div style={{ color: ink, fontFamily: "inherit" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: syncOpen ? 0 : 24, flexWrap: "wrap" }}>
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
        {tab === "weekly" && !isMobile && (
          <button onClick={() => setWeeklyCompact?.(v => !v)} style={{
            background: "none", border: `1px solid ${border}`,
            borderRadius: isMon ? 0 : 6,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 11, padding: "5px 11px", color: ink, fontWeight: 600,
          }}>
            {weeklyCompact ? (lang === "ko" ? "넓은 간격" : "Wide") : (lang === "ko" ? "좁은 간격" : "Compact")}
          </button>
        )}
        {/* Cloud sync button */}
        <div ref={syncPanelRef} style={{ marginLeft: "auto", position: "relative" }}>
          <button
            onClick={() => { setSyncOpen(v => !v); setSyncStatus(null); }}
            title={syncCopy.title}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: syncOpen ? ink : "none",
              border: `1px solid ${border}`,
              borderRadius: isMon ? 0 : 6,
              color: syncOpen ? (dark ? "#1e1d16" : "#fff") : ink,
              cursor: "pointer", padding: "5px 9px", fontSize: 11, fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            <Cloud size={13} />
            {!isMobile && lastSynced && <span style={{ opacity: 0.65 }}>{formatSyncTime(lastSynced)}</span>}
          </button>

          {/* Sync panel */}
          {syncOpen && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 30,
              width: 280, background: dark ? "#1e1d16" : "#fff",
              border: `1px solid ${border}`, borderRadius: 8,
              boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: 16,
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: ink }}>
                  {syncCopy.title}
                </span>
                <span style={{ fontSize: 10, opacity: 0.45, color: ink }}>
                  {lastSynced ? `${syncCopy.lastSave}: ${formatSyncTime(lastSynced)}` : syncCopy.never}
                </span>
              </div>

              {/* Status message */}
              {statusMsg && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                  fontSize: 11, fontWeight: 600,
                  color: syncStatus === "error" ? "#C7382E" : syncStatus === "saved" || syncStatus === "loaded" ? "#2a7a2a" : ink,
                  opacity: 0.9,
                }}>
                  {(syncStatus === "saved" || syncStatus === "loaded") && <Check size={12} />}
                  {syncStatus === "error" && <AlertCircle size={12} />}
                  {statusMsg}
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={handleSaveToCloud}
                disabled={syncStatus === "saving" || syncStatus === "loading"}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 8,
                  background: dark ? "#ffffff08" : "#f7f5ef",
                  border: `1px solid ${border}`, borderRadius: 6,
                  cursor: syncStatus ? "not-allowed" : "pointer", color: ink,
                  opacity: syncStatus === "saving" || syncStatus === "loading" ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <CloudUpload size={14} color={accent} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: ink }}>{syncCopy.push}</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, color: ink, lineHeight: 1.5 }}>{syncCopy.pushDesc}</div>
              </button>

              {/* Download button */}
              <button
                onClick={handleLoadFromCloud}
                disabled={syncStatus === "saving" || syncStatus === "loading"}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px",
                  background: dark ? "#ffffff08" : "#f7f5ef",
                  border: `1px solid ${border}`, borderRadius: 6,
                  cursor: syncStatus ? "not-allowed" : "pointer", color: ink,
                  opacity: syncStatus === "saving" || syncStatus === "loading" ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <CloudDownload size={14} color={accent} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: ink }}>{syncCopy.pull}</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, color: ink, lineHeight: 1.5, marginBottom: 4 }}>{syncCopy.pullDesc}</div>
                <div style={{ fontSize: 10, color: "#C7382E", opacity: 0.8 }}>{syncCopy.pullWarn}</div>
              </button>
            </div>
          )}
        </div>
      </div>

      {syncOpen && <div style={{ marginBottom: 24 }} />}

      {tab === "daily" && (
        <PlannerDaily
          t={t} pal={pal} dark={dark}
          editMode={editMode}
          events={allDailyEvents}
          onEventsChange={setEvents}
          onEditEvent={editDailyEvent}
          onEditCalEvent={editCalEvent}
          onDeleteCalEvent={deleteCalEvent}
          todos={todos}
          onTodosChange={setTodos}
          onMoveToTomorrow={moveEventToTomorrow}
          onSkipRecurring={skipRecurringOccurrence}
          spans={spans}
          theme={theme}
          lang={lang}
          onDeleteGroupEvent={handleDeleteGroupEvent}
          onEditGroupEvent={handleEditGroupEvent}
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
          compact={weeklyCompact}
          onToggleCompact={() => setWeeklyCompact(v => !v)}
          editMode={editMode}
          calEvents={mergedCalEvents}
          recurring={recurring}
          onEditDailyEvent={editDailyEvent}
          onEditCalEvent={editCalEvent}
          onMoveEvent={moveCalEventToDate}
          onAddCalEvent={(dateKey, evt) => setCalEvents(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] ?? []), evt] }))}
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
          onSkipRecurring={skipRecurringOccurrence}
          spans={spans}
          onSpansChange={setSpans}
          groupEvents={groupEvents}
        />
      )}
    </div>
  );
}
