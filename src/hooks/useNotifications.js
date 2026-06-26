import { useState, useCallback, useRef } from "react";

const MAX = 100;
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function storageKey(userId) { return `grida_notifs_${userId ?? "anon"}`; }

function load(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    const cutoff = Date.now() - TTL;
    return raw.filter((n) => n.ts > cutoff);
  } catch { return []; }
}

function save(key, items) {
  try { localStorage.setItem(key, JSON.stringify(items)); } catch (_) {}
}

export function useNotifications(userId) {
  const key = storageKey(userId);
  const [notifications, setNotifications] = useState(() => load(key));
  const [banner, setBanner] = useState(null);
  const bannerTimer = useRef(null);

  const addNotification = useCallback(({ type = "info", title, body }) => {
    const notif = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, type, title, body, ts: Date.now(), read: false };
    setNotifications((prev) => {
      const next = [notif, ...prev].slice(0, MAX);
      save(storageKey(userId), next);
      return next;
    });
    // Show banner for 4 seconds
    setBanner(notif);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  }, [userId]);

  const markRead = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      save(storageKey(userId), next);
      return next;
    });
  }, [userId]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      save(storageKey(userId), next);
      return next;
    });
  }, [userId]);

  const deleteNotification = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      save(storageKey(userId), next);
      return next;
    });
  }, [userId]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    save(storageKey(userId), []);
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, banner, setBanner, addNotification, markRead, markAllRead, deleteNotification, clearAll };
}
