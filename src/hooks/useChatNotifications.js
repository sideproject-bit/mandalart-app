import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { subscribeToMessages } from "../api/messagesApi";
import { subscribeToAllGroupMessages } from "../api/groupMessagesApi";

function tryBrowserNotif(title, body) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try { new Notification(title, { body }); } catch (_) {}
}
import { fetchMyGroups } from "../api/groupsApi";

export function useChatNotifications(myId, addNotification, notifOn) {
  const [unreadDirect, setUnreadDirect] = useState(new Set());
  const [unreadGroups, setUnreadGroups] = useState(new Set());
  const [groups, setGroups] = useState([]);

  // Refs so subscription callbacks always see latest values without re-subscribing
  const activeChatRef  = useRef({ type: null, id: null });
  const notifOnRef     = useRef(notifOn);
  const groupsRef      = useRef(groups);
  const addNotifRef    = useRef(addNotification);
  const nameCacheRef   = useRef({});

  useEffect(() => { notifOnRef.current  = notifOn; },       [notifOn]);
  useEffect(() => { groupsRef.current   = groups; },        [groups]);
  useEffect(() => { addNotifRef.current = addNotification;}, [addNotification]);

  // Load groups on mount / userId change
  const loadGroups = () => fetchMyGroups().then(setGroups).catch(() => {});
  useEffect(() => {
    if (!myId) return;
    loadGroups();
  }, [myId]);

  // Fetch initial unread direct-message senders (read_at is null)
  useEffect(() => {
    if (!myId) return;
    supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", myId)
      .is("read_at", null)
      .then(({ data }) => {
        if (data?.length) setUnreadDirect(new Set(data.map(m => m.sender_id)));
      });
  }, [myId]);

  // Helper: resolve sender username (cached)
  const getSenderName = async (senderId) => {
    if (nameCacheRef.current[senderId]) return nameCacheRef.current[senderId];
    const { data } = await supabase.from("profiles").select("username").eq("id", senderId).single();
    const name = data?.username ?? "Someone";
    nameCacheRef.current[senderId] = name;
    return name;
  };

  // Always-on direct message subscription — use "_notif" suffix to avoid channel name
  // conflict with ChatPanel's per-panel subscription ("_panel" suffix)
  useEffect(() => {
    if (!myId) return;
    const ch = subscribeToMessages(myId, async (msg) => {
      const isActive = activeChatRef.current.type === "direct" && activeChatRef.current.id === msg.sender_id;
      if (isActive) return;
      setUnreadDirect(prev => new Set([...prev, msg.sender_id]));
      const body = msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
      if (notifOnRef.current) {
        const name = await getSenderName(msg.sender_id);
        addNotifRef.current?.({ type: "chat", title: name, body });
        tryBrowserNotif(name, body);
      }
    }, "_notif");
    return () => ch?.unsubscribe();
  }, [myId]);

  // Always-on global group message subscription
  useEffect(() => {
    if (!myId || !groups.length) return;
    const ch = subscribeToAllGroupMessages(myId, groups.map(g => g.id), (msg) => {
      const isActive = activeChatRef.current.type === "group" && activeChatRef.current.id === msg.group_id;
      if (isActive) return;
      setUnreadGroups(prev => new Set([...prev, msg.group_id]));
      if (notifOnRef.current) {
        const group = groupsRef.current.find(g => g.id === msg.group_id);
        const title = group?.name ?? "Group";
        const body = msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
        addNotifRef.current?.({ type: "chat", title, body });
        tryBrowserNotif(title, body);
      }
    });
    return () => ch?.unsubscribe();
  }, [myId, groups]);

  const clearUnreadDirect = (friendId) =>
    setUnreadDirect(prev => { const n = new Set(prev); n.delete(friendId); return n; });
  const clearUnreadGroup = (groupId) =>
    setUnreadGroups(prev => { const n = new Set(prev); n.delete(groupId); return n; });
  const markGroupUnread = (groupId) =>
    setUnreadGroups(prev => new Set([...prev, groupId]));
  const setActiveChat = (type, id) => { activeChatRef.current = { type: type ?? null, id: id ?? null }; };

  return {
    unreadDirect,
    unreadGroups,
    clearUnreadDirect,
    clearUnreadGroup,
    markGroupUnread,
    setActiveChat,
    refreshChatGroups: loadGroups,
  };
}
