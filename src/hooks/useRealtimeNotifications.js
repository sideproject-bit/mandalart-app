import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

function tryBrowserNotif(title, body) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try { new Notification(title, { body }); } catch (_) {}
}

export function useRealtimeNotifications(myId, addNotification, notifOn, t, markGroupUnread) {
  const notifOnRef        = useRef(notifOn);
  const addNotifRef       = useRef(addNotification);
  const markGroupUnreadRef = useRef(markGroupUnread);
  useEffect(() => { notifOnRef.current        = notifOn; },        [notifOn]);
  useEffect(() => { addNotifRef.current       = addNotification; }, [addNotification]);
  useEffect(() => { markGroupUnreadRef.current = markGroupUnread; }, [markGroupUnread]);

  // ── 1. Contact message reply ──────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`contact_reply_${myId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "contact_messages",
        filter: `user_id=eq.${myId}`,
      }, (payload) => {
        if (payload.new?.status !== "replied" || payload.old?.status === "replied") return;
        const p   = t.planner;
        const title = p.notifContactReply;
        const body  = p.notifContactReplyBody(payload.new.subject ?? "");
        addNotifRef.current?.({ type: "info", title, body });
        if (notifOnRef.current) tryBrowserNotif(title, body);
      })
      .subscribe();
    return () => { ch?.unsubscribe(); };
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Group event invite ─────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`event_invite_${myId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "group_event_invites",
        filter: `invitee_id=eq.${myId}`,
      }, async (payload) => {
        const { data: evt } = await supabase
          .from("group_events")
          .select("title, group_id")
          .eq("id", payload.new.event_id)
          .single();
        const p     = t.planner;
        const title = p.notifGroupEventInvite;
        const body  = p.notifGroupEventInviteBody(evt?.title ?? "");
        addNotifRef.current?.({ type: "info", title, body });
        if (notifOnRef.current) tryBrowserNotif(title, body);
        if (evt?.group_id) markGroupUnreadRef.current?.(evt.group_id);
      })
      .subscribe();
    return () => { ch?.unsubscribe(); };
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Friend request received ────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`friend_req_${myId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "friendships",
        filter: `friend_id=eq.${myId}`,
      }, async (payload) => {
        if (payload.new?.status !== "pending") return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", payload.new.user_id)
          .single();
        const name  = profile?.username ?? "Someone";
        const p     = t.planner;
        const title = p.notifFriendRequest;
        const body  = p.notifFriendRequestBody(name);
        addNotifRef.current?.({ type: "info", title, body });
        if (notifOnRef.current) tryBrowserNotif(title, body);
      })
      .subscribe();
    return () => { ch?.unsubscribe(); };
  }, [myId]); // eslint-disable-line react-hooks/exhaustive-deps
}
