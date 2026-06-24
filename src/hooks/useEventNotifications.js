import { useEffect, useRef } from "react";

const COLS = 6; // 10-min columns per hour

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}

// Fires a browser notification when a planner event's start time is reached.
// Reads straight from localStorage so it works regardless of which view is open.
export function useEventNotifications(enabled, userId, t) {
  const fired = useRef(new Set());

  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const check = () => {
      const today = todayKey();
      const now = new Date();
      const curCell = now.getHours() * COLS + Math.floor(now.getMinutes() / 10);

      const events    = load(`grida_daily_${userId}_${today}`, {}).events ?? [];
      const calEvents = load(`grida_calendar_${userId}`, {})[today] ?? [];
      const dow       = now.getDay();
      const recurring = load(`grida_recurring_${userId}`, [])
        .filter(r => Array.isArray(r.days) && r.days.includes(dow))
        .map(r => ({ ...r, id: `recur_${r.id}` }));

      for (const evt of [...events, ...calEvents, ...recurring]) {
        if (evt.startCell !== curCell) continue;
        const tag = `${evt.id}_${today}_${curCell}`;
        if (fired.current.has(tag)) continue;
        fired.current.add(tag);
        try {
          new Notification(t.planner.notifStartTitle, { body: t.planner.notifStartBody(evt.title) });
        } catch (_) {}
      }
    };

    check();
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [enabled, userId, t]);
}
