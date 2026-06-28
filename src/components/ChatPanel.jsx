import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Send, Check, CheckCheck, Plus, Users, Settings, X, LogOut, Trash2, UserCheck, CalendarCheck } from "lucide-react";
import { fetchMessages, sendMessage, markAsRead, subscribeToMessages } from "../api/messagesApi";
import { listFriends } from "../api/friendsApi";
import { fetchMyGroups, createGroup, inviteMember, leaveGroup, deleteGroup, transferAdmin, getGroupMembers } from "../api/groupsApi";
import { createEventAndInvites, fetchPendingInvites, respondToInvite } from "../api/groupEventsApi";
import { fetchGroupMessages, sendGroupMessage, subscribeToGroupMessages } from "../api/groupMessagesApi";
import SharedEventForm from "./SharedEventForm";

function formatDate(iso, t) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isToday) return t.social?.today ?? "Today";
  if (d.toDateString() === yesterday.toDateString()) return t.social?.yesterday ?? "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatEventDateTime(date, startTime, endTime) {
  if (!date) return "";
  const d = new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (startTime && endTime) return `${d}  ${startTime}–${endTime}`;
  if (startTime) return `${d}  ${startTime}`;
  return d;
}

function groupByDate(messages, t) {
  const result = [];
  let lastDate = null;
  for (const msg of messages) {
    const label = formatDate(msg.created_at, t);
    if (label !== lastDate) { result.push({ type: "date", label }); lastDate = label; }
    result.push({ type: "msg", msg });
  }
  return result;
}

export default function ChatPanel({ pal, t, myId, myUsername, addNotification, onGroupEventsChange,
  unreadDirect = new Set(), unreadGroups = new Set(),
  onClearUnreadDirect, onClearUnreadGroup, onActiveChatChange }) {
  const [chatView, setChatView] = useState("list"); // "list"|"direct"|"group"|"newGroup"
  const [friends, setFriends] = useState([]);
  const [myGroups, setMyGroups] = useState([]);

  // Active chat
  const [activeFriend, setActiveFriend] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [directMessages, setDirectMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventError, setEventError] = useState("");

  // Pending invites (events awaiting my acceptance)
  const [pendingInvites, setPendingInvites] = useState([]);

  // New group
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedInvites, setSelectedInvites] = useState([]);
  const [creating, setCreating] = useState(false);

  // Group settings
  const [showSettings, setShowSettings] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [inviteTarget, setInviteTarget] = useState("");

  const [guideOpen, setGuideOpen] = useState(false);

  const activeFriendRef = useRef(null);
  const friendsRef = useRef([]);
  const bottomRef = useRef(null);
  const directChannelRef = useRef(null);
  const groupChannelRef = useRef(null);

  useEffect(() => { activeFriendRef.current = activeFriend; }, [activeFriend]);
  useEffect(() => { friendsRef.current = friends; }, [friends]);

  // Load friends & groups
  useEffect(() => {
    if (!myId) return;
    listFriends(myId).then(setFriends).catch(() => {});
    fetchMyGroups().then(setMyGroups).catch(() => {});
  }, [myId]);

  // Load all pending invites for me
  const refreshPendingInvites = useCallback(() => {
    if (!myId) return;
    fetchPendingInvites(myId).then(setPendingInvites).catch(() => {});
  }, [myId]);

  useEffect(() => { refreshPendingInvites(); }, [refreshPendingInvites]);

  // Direct message realtime subscription
  useEffect(() => {
    if (!myId) return;
    directChannelRef.current = subscribeToMessages(myId, (msg) => {
      const currentFriend = activeFriendRef.current;
      const isOpen = chatView === "direct" && currentFriend?.id === msg.sender_id;
      if (isOpen) {
        setDirectMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        markAsRead(myId, msg.sender_id).catch(() => {});
        setDirectMessages(prev => prev.map(m =>
          m.sender_id === msg.sender_id && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
        ));
        // notification + unread tracking handled by useChatNotifications in App
      }
    }, "_panel");
    return () => { directChannelRef.current?.unsubscribe(); };
  }, [myId, addNotification, chatView]);

  // Group message realtime subscription
  useEffect(() => {
    groupChannelRef.current?.unsubscribe();
    if (!activeGroup) return;
    groupChannelRef.current = subscribeToGroupMessages(activeGroup.id, (msg) => {
      if (msg.sender_id === myId) return;
      const member = groupMembers.find(m => m.user_id === msg.sender_id);
      const senderName = member?.username ?? "?";
      setGroupMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, _senderName: senderName }]);
      // notification handled by global group subscription
    });
    return () => { groupChannelRef.current?.unsubscribe(); };
  }, [activeGroup?.id, groupMembers, myId, addNotification]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [directMessages, groupMessages]);

  const openDirectChat = useCallback(async (friend) => {
    onClearUnreadDirect?.(friend.id);
    onActiveChatChange?.("direct", friend.id);
    setActiveFriend(friend);
    setChatView("direct");
    setInput("");
    setLoading(true);
    try {
      const msgs = await fetchMessages(myId, friend.id);
      setDirectMessages(msgs);
      await markAsRead(myId, friend.id);
      setDirectMessages(prev => prev.map(m =>
        m.receiver_id === myId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
      ));
    } catch {}
    setLoading(false);
  }, [myId]);

  const openGroupChat = useCallback(async (group) => {
    onClearUnreadGroup?.(group.id);
    onActiveChatChange?.("group", group.id);
    setActiveGroup(group);
    setChatView("group");
    setInput("");
    setShowSettings(false);
    setLoading(true);
    try {
      const [msgs, members] = await Promise.all([fetchGroupMessages(group.id), getGroupMembers(group.id)]);
      const profileMap = Object.fromEntries(members.map(m => [m.user_id, m.username]));
      setGroupMessages(msgs.map(m => ({ ...m, _senderName: profileMap[m.sender_id] ?? "?" })));
      setGroupMembers(members);
    } catch {}
    setLoading(false);
  }, []);

  const goBack = () => {
    onActiveChatChange?.(null, null);
    setChatView("list");
    setActiveFriend(null);
    setActiveGroup(null);
    setDirectMessages([]);
    setGroupMessages([]);
    setGroupMembers([]);
    setShowSettings(false);
    setInput("");
  };

  const handleDirectSend = async () => {
    const content = input.trim();
    if (!content || !activeFriend || sending) return;
    setSending(true);
    setInput("");
    try {
      const msg = await sendMessage(myId, activeFriend.id, content);
      setDirectMessages(prev => [...prev, msg]);
    } catch { setInput(content); }
    setSending(false);
  };

  const handleGroupSend = async () => {
    const content = input.trim();
    if (!content || !activeGroup || sending) return;
    setSending(true);
    setInput("");
    try {
      const msg = await sendGroupMessage(activeGroup.id, myId, content);
      const me = groupMembers.find(m => m.user_id === myId);
      setGroupMessages(prev => [...prev, { ...msg, _senderName: me?.username ?? "Me" }]);
    } catch { setInput(content); }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatView === "group" ? handleGroupSend() : handleDirectSend();
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || creating) return;
    setCreating(true);
    try {
      const group = await createGroup(myId, newGroupName.trim());
      await Promise.all(selectedInvites.map(fid => inviteMember(group.id, fid)));
      const updated = await fetchMyGroups();
      setMyGroups(updated);
      setNewGroupName("");
      setSelectedInvites([]);
      setChatView("list");
    } catch {}
    setCreating(false);
  };

  const handleAddEvent = async (formData) => {
    setEventError("");
    const payload = {
      creatorId: myId,
      title: formData.title,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
      memo: formData.memo,
    };

    let memberIds = [];
    if (chatView === "group" && activeGroup) {
      payload.groupId = activeGroup.id;
      memberIds = groupMembers.map(m => m.user_id);
    } else if (chatView === "direct" && activeFriend) {
      payload.receiverId = activeFriend.id;
      memberIds = [activeFriend.id];
    }

    try {
      await createEventAndInvites(payload, memberIds);
      setShowEventForm(false);

      // Post invite message in chat
      const dateStr = formatEventDateTime(formData.date, formData.startTime, formData.endTime);
      const adminName = myUsername ?? "Admin";
      const inviteText = `${t.social?.invitedYou?.(adminName, formData.title) ?? `${adminName} invited you to "${formData.title}"`}${dateStr ? `\n${dateStr}` : ""}`;

      if (chatView === "group" && activeGroup) {
        const msg = await sendGroupMessage(activeGroup.id, myId, inviteText);
        const me = groupMembers.find(m => m.user_id === myId);
        setGroupMessages(prev => [...prev, { ...msg, _senderName: me?.username ?? "Me" }]);
      } else if (chatView === "direct" && activeFriend) {
        const msg = await sendMessage(myId, activeFriend.id, inviteText);
        setDirectMessages(prev => [...prev, msg]);
      }

      // Notify admin
      addNotification?.({
        type: "info",
        title: t.social?.addEvent ?? "Shared Event",
        body: t.social?.eventCreatedNotif ?? "Event created. Members will see it after accepting.",
      });

      onGroupEventsChange?.();
    } catch (err) {
      console.error("createEventAndInvites error:", err);
      setEventError(err?.message ?? "Failed to save event.");
      throw err;
    }
  };

  const handleInviteRespond = async (invite, accepted) => {
    try {
      await respondToInvite(invite.id, accepted ? "accepted" : "declined");
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));

      if (accepted) {
        onGroupEventsChange?.();

        // Post response message
        const myName = myUsername ?? "Member";
        const responseText = accepted
          ? `✓ ${myName}: "${invite.event.title}" ${t.social?.accept ?? "accepted"}`
          : `✗ ${myName}: "${invite.event.title}" ${t.social?.decline ?? "declined"}`;

        if (chatView === "group" && activeGroup) {
          const msg = await sendGroupMessage(activeGroup.id, myId, responseText);
          const me = groupMembers.find(m => m.user_id === myId);
          setGroupMessages(prev => [...prev, { ...msg, _senderName: me?.username ?? "Me" }]);
        } else if (chatView === "direct" && activeFriend) {
          const msg = await sendMessage(myId, activeFriend.id, responseText);
          setDirectMessages(prev => [...prev, msg]);
        }
      }
    } catch (err) {
      console.error("respondToInvite error:", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    if (!window.confirm("Leave this group?")) return;
    await leaveGroup(activeGroup.id, myId);
    const updated = await fetchMyGroups();
    setMyGroups(updated);
    goBack();
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!window.confirm("Delete this group for everyone?")) return;
    await deleteGroup(activeGroup.id);
    const updated = await fetchMyGroups();
    setMyGroups(updated);
    goBack();
  };

  const handleTransferAdmin = async () => {
    if (!transferTarget || !activeGroup) return;
    await transferAdmin(activeGroup.id, transferTarget);
    const updated = await fetchMyGroups();
    setMyGroups(updated);
    setActiveGroup(prev => ({ ...prev, admin_id: transferTarget }));
    setTransferTarget("");
  };

  const handleInvite = async () => {
    if (!inviteTarget || !activeGroup) return;
    const friend = friends.find(f => f.id === inviteTarget);
    if (!friend) return;
    await inviteMember(activeGroup.id, inviteTarget);
    const members = await getGroupMembers(activeGroup.id);
    setGroupMembers(members);
    setInviteTarget("");
  };

  const isGroupAdmin = activeGroup?.admin_id === myId;
  const ink = pal.ink;
  const bg = pal.bg;
  const acc = pal.accent;

  // Invite cards relevant to current chat
  const chatInvites = pendingInvites.filter(inv => {
    if (!inv.event) return false;
    if (chatView === "group" && activeGroup) return inv.event.group_id === activeGroup.id;
    if (chatView === "direct" && activeFriend) return inv.event.creator_id === activeFriend.id;
    return false;
  });

  const InviteCards = chatInvites.length > 0 && (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", opacity: 0.4, letterSpacing: "0.06em", marginBottom: 6, color: ink }}>
        {t.social?.pendingInvites ?? "Pending Invites"}
      </div>
      {chatInvites.map(inv => (
        <div key={inv.id} style={{
          border: `1.5px dashed ${inv.event.color ?? acc}`,
          borderRadius: 8, padding: "10px 12px", marginBottom: 8,
          background: (inv.event.color ?? acc) + "10",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <CalendarCheck size={14} style={{ color: inv.event.color ?? acc, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: ink, wordBreak: "break-word" }}>{inv.event.title}</div>
              <div style={{ fontSize: 11, opacity: 0.6, color: ink, marginTop: 2 }}>
                {inv.creatorUsername} · {formatEventDateTime(inv.event.date, inv.event.start_time, inv.event.end_time)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button
              onClick={() => handleInviteRespond(inv, true)}
              style={{
                flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 700, border: "none",
                background: inv.event.color ?? acc, color: "#fff", cursor: "pointer", borderRadius: 4,
              }}
            >
              {t.social?.accept ?? "수락"}
            </button>
            <button
              onClick={() => handleInviteRespond(inv, false)}
              style={{
                flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 700,
                border: `1px solid ${ink}22`, background: "none", color: ink, cursor: "pointer", borderRadius: 4,
              }}
            >
              {t.social?.decline ?? "거절"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const inputBar = (
    <div style={{ display: "flex", gap: 8, marginTop: 10, borderTop: `1px solid ${ink}18`, paddingTop: 10 }}>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.social?.typeMessage ?? "Type a message…"}
        rows={1}
        style={{
          flex: 1, background: ink + "0c", color: ink,
          border: `1px solid ${ink}22`, padding: "8px 10px",
          fontSize: 13, resize: "none", fontFamily: "inherit", outline: "none", borderRadius: 2,
        }}
      />
      <button
        onClick={chatView === "group" ? handleGroupSend : handleDirectSend}
        disabled={!input.trim() || sending}
        style={{
          background: acc, color: "#fff", border: "none",
          width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: input.trim() && !sending ? "pointer" : "not-allowed",
          opacity: input.trim() && !sending ? 1 : 0.4,
          flexShrink: 0, alignSelf: "flex-end", borderRadius: 2,
        }}
      >
        <Send size={15} />
      </button>
    </div>
  );

  const socialGuide = t.guide?.sections?.find(s => s.category === "Social" || s.category === "소셜");

  // ── LIST VIEW ──
  if (chatView === "list") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 900, fontSize: 24, textTransform: "uppercase", margin: 0 }}>
            {t.social?.chatTitle ?? "Messages"}
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setGuideOpen(v => !v)}
              title="Guide"
              style={{
                background: guideOpen ? ink : "none", border: `1px solid ${ink}33`,
                color: guideOpen ? bg : ink, width: 30, height: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 13, fontWeight: 800,
              }}
            >?</button>
            <button
              onClick={() => setChatView("newGroup")}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: `1px solid ${ink}33`, color: ink,
                padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}
            >
              <Plus size={12} /> {t.social?.newGroup ?? "New Group"}
            </button>
          </div>
        </div>

        {/* Inline guide */}
        {guideOpen && socialGuide && (
          <div style={{
            border: `1px solid ${ink}18`, borderRadius: 6, padding: 14, marginBottom: 16,
            background: acc + "08",
          }}>
            {socialGuide.items.map((item, i) => (
              <div key={i} style={{ marginBottom: i < socialGuide.items.length - 1 ? 12 : 0 }}>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 3, color: ink }}>{item.t}</div>
                <div style={{ fontSize: 12, lineHeight: 1.65, opacity: 0.7, color: ink }}>{item.b}</div>
              </div>
            ))}
          </div>
        )}

        {friends.length === 0 && myGroups.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.45, color: ink }}>{t.social?.noFriends ?? "Add friends to start chatting."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Groups */}
            {myGroups.map(group => (
              <button key={group.id} onClick={() => openGroupChat(group)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "none", border: `1px solid ${ink}18`,
                  color: ink, cursor: "pointer", padding: "12px 14px", textAlign: "left",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = ink + "08"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 4,
                    background: acc + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Users size={16} color={acc} />
                  </div>
                  {unreadGroups.has(group.id) && (
                    <div style={{
                      position: "absolute", top: -3, right: -3,
                      width: 9, height: 9, borderRadius: "50%",
                      background: "#C7382E", border: `2px solid ${bg}`,
                    }} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{group.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.4 }}>
                    {group.admin_id === myId ? (t.social?.admin ?? "Admin") : (t.social?.member ?? "Member")}
                  </div>
                </div>
              </button>
            ))}

            {/* 1:1 Friends */}
            {friends.map(friend => (
              <button key={friend.id} onClick={() => openDirectChat(friend)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "none", border: `1px solid ${ink}18`,
                  color: ink, cursor: "pointer", padding: "12px 14px", textAlign: "left",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = ink + "08"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: acc + "22", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: acc,
                  }}>
                    {(friend.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  {unreadDirect.has(friend.id) && (
                    <div style={{
                      position: "absolute", top: -3, right: -3,
                      width: 9, height: 9, borderRadius: "50%",
                      background: "#C7382E", border: `2px solid ${bg}`,
                    }} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{friend.username}</div>
                  <div style={{ fontSize: 10, opacity: 0.4, fontFamily: "monospace" }}>#{friend.tag}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── NEW GROUP VIEW ──
  if (chatView === "newGroup") {
    return (
      <div>
        <button onClick={() => setChatView("list")}
          style={{ background: "none", border: "none", color: ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: 0, marginBottom: 20 }}>
          <ArrowLeft size={14} /> {t.back ?? "Back"}
        </button>
        <h2 style={{ fontWeight: 900, fontSize: 20, textTransform: "uppercase", margin: "0 0 16px" }}>
          {t.social?.newGroup ?? "New Group"}
        </h2>

        <input
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value.slice(0, 15))}
          placeholder={t.social?.groupNamePlaceholder ?? "Group name (max 15 chars)"}
          style={{
            width: "100%", boxSizing: "border-box", padding: "9px 11px",
            fontSize: 13, fontFamily: "inherit",
            border: `1px solid ${ink}33`, background: "none", color: ink, outline: "none", marginBottom: 6,
          }}
        />
        <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 16, textAlign: "right" }}>{newGroupName.length}/15</div>

        {friends.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", opacity: 0.5, marginBottom: 8, letterSpacing: "0.05em" }}>
              {t.social?.inviteFriends ?? "Invite friends"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
              {friends.map(friend => {
                const selected = selectedInvites.includes(friend.id);
                return (
                  <button key={friend.id}
                    onClick={() => setSelectedInvites(prev => selected ? prev.filter(id => id !== friend.id) : [...prev, friend.id])}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: selected ? acc + "18" : "none",
                      border: `1px solid ${selected ? acc : ink + "18"}`,
                      color: ink, cursor: "pointer", padding: "9px 12px", textAlign: "left",
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: acc + "22", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: acc, flexShrink: 0 }}>
                      {(friend.username?.[0] ?? "?").toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{friend.username}</span>
                    {selected && <UserCheck size={14} color={acc} />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          onClick={handleCreateGroup}
          disabled={!newGroupName.trim() || creating}
          style={{
            width: "100%", padding: "10px 0", fontWeight: 800, fontSize: 13,
            textTransform: "uppercase", letterSpacing: "0.05em",
            background: newGroupName.trim() ? acc : ink + "18",
            color: newGroupName.trim() ? "#fff" : ink,
            border: "none", cursor: newGroupName.trim() && !creating ? "pointer" : "not-allowed",
            opacity: newGroupName.trim() ? 1 : 0.5,
          }}
        >
          {creating ? "…" : (t.social?.createGroup ?? "Create Group")}
        </button>
      </div>
    );
  }

  // ── DIRECT CHAT VIEW ──
  if (chatView === "direct" && activeFriend) {
    const grouped = groupByDate(directMessages, t);
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={goBack} style={{ background: "none", border: "none", color: ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: 0 }}>
            <ArrowLeft size={14} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, textTransform: "uppercase" }}>{activeFriend.username}</div>
            <div style={{ fontSize: 10, opacity: 0.4, fontFamily: "monospace" }}>#{activeFriend.tag}</div>
          </div>
          <button
            onClick={() => setShowEventForm(true)}
            title={t.social?.addEvent ?? "Add shared event"}
            style={{ background: "none", border: `1px solid ${ink}33`, color: ink, cursor: "pointer", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
          >
            <Plus size={14} />
          </button>
        </div>

        <div style={{ fontSize: 10, opacity: 0.4, color: ink, textAlign: "center", padding: "4px 0", borderBottom: `1px solid ${ink}18`, marginBottom: 8 }}>
          {t.social?.retentionNotice ?? "Messages kept for 30 days."}
        </div>

        {InviteCards}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading
            ? <div style={{ textAlign: "center", opacity: 0.3, fontSize: 12, marginTop: 40 }}>…</div>
            : directMessages.length === 0
            ? <div style={{ textAlign: "center", opacity: 0.3, fontSize: 12, marginTop: 40 }}>{t.social?.noMessages ?? "No messages yet."}</div>
            : grouped.map((item, i) => {
              if (item.type === "date") return (
                <div key={`d${i}`} style={{ textAlign: "center", fontSize: 10, opacity: 0.3, margin: "10px 0 6px", color: ink }}>{item.label}</div>
              );
              const { msg } = item;
              const isMine = msg.sender_id === myId;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 6 }}>
                  <div style={{
                    maxWidth: "72%", background: isMine ? acc : ink + "12",
                    color: isMine ? "#fff" : ink,
                    padding: "7px 11px", fontSize: 13, lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap",
                    borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2, fontSize: 10, opacity: 0.4, color: ink }}>
                    <span>{formatTime(msg.created_at)}</span>
                    {isMine && (msg.read_at ? <CheckCheck size={11} /> : <Check size={11} />)}
                  </div>
                </div>
              );
            })
          }
          <div ref={bottomRef} />
        </div>
        {inputBar}
        {showEventForm && (
          <SharedEventForm pal={pal} dark={false} t={t} onSave={handleAddEvent} onClose={() => { setShowEventForm(false); setEventError(""); }} error={eventError} />
        )}
      </div>
    );
  }

  // ── GROUP CHAT VIEW ──
  if (chatView === "group" && activeGroup) {
    const grouped = groupByDate(groupMessages, t);
    const nonAdminMembers = groupMembers.filter(m => m.user_id !== myId && m.user_id !== activeGroup.admin_id);
    const invitableFriends = friends.filter(f => !groupMembers.find(m => m.user_id === f.id));

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: 420 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button onClick={goBack} style={{ background: "none", border: "none", color: ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: 0 }}>
            <ArrowLeft size={14} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, textTransform: "uppercase" }}>{activeGroup.name}</div>
            <div style={{ fontSize: 10, opacity: 0.4 }}>{groupMembers.length} {t.social?.members ?? "members"}</div>
          </div>
          {isGroupAdmin && (
            <button onClick={() => setShowEventForm(true)} title={t.social?.addEvent ?? "Add event"}
              style={{ background: "none", border: `1px solid ${ink}33`, color: ink, cursor: "pointer", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
              <Plus size={14} />
            </button>
          )}
          <button onClick={() => setShowSettings(v => !v)}
            style={{ background: showSettings ? ink : "none", border: `1px solid ${ink}33`, color: showSettings ? bg : ink, cursor: "pointer", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
            <Settings size={14} />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div style={{ border: `1px solid ${ink}18`, borderRadius: 6, padding: 14, marginBottom: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 10, opacity: 0.5, marginBottom: 8, letterSpacing: "0.05em" }}>
              {t.social?.members ?? "Members"}
            </div>
            {groupMembers.map(m => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: acc + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: acc, flexShrink: 0 }}>
                  {(m.username?.[0] ?? "?").toUpperCase()}
                </div>
                <span style={{ flex: 1 }}>{m.username}</span>
                {m.user_id === activeGroup.admin_id && (
                  <span style={{ fontSize: 9, background: acc, color: "#fff", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ADMIN</span>
                )}
              </div>
            ))}

            {isGroupAdmin && invitableFriends.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <select
                  value={inviteTarget}
                  onChange={e => setInviteTarget(e.target.value)}
                  style={{ flex: 1, padding: "5px 8px", fontSize: 11, background: bg, color: ink, border: `1px solid ${ink}33`, fontFamily: "inherit", outline: "none" }}
                >
                  <option value="">{t.social?.selectFriendToInvite ?? "Invite friend…"}</option>
                  {invitableFriends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
                </select>
                <button onClick={handleInvite} disabled={!inviteTarget}
                  style={{ background: inviteTarget ? acc : ink + "20", color: inviteTarget ? "#fff" : ink, border: "none", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: inviteTarget ? "pointer" : "not-allowed", borderRadius: 4 }}>
                  {t.social?.invite ?? "Invite"}
                </button>
              </div>
            )}

            {isGroupAdmin && nonAdminMembers.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                <select
                  value={transferTarget}
                  onChange={e => setTransferTarget(e.target.value)}
                  style={{ flex: 1, padding: "5px 8px", fontSize: 11, background: bg, color: ink, border: `1px solid ${ink}33`, fontFamily: "inherit", outline: "none" }}
                >
                  <option value="">{t.social?.transferAdmin ?? "Transfer admin…"}</option>
                  {nonAdminMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.username}</option>)}
                </select>
                <button onClick={handleTransferAdmin} disabled={!transferTarget}
                  style={{ background: transferTarget ? "#E3B22E" : ink + "20", color: transferTarget ? "#1a1a1a" : ink, border: "none", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: transferTarget ? "pointer" : "not-allowed", borderRadius: 4 }}>
                  <UserCheck size={12} />
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${ink}12` }}>
              <button onClick={handleLeaveGroup}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${ink}22`, color: ink, padding: "5px 10px", fontSize: 11, cursor: "pointer", borderRadius: 4 }}>
                <LogOut size={11} /> {t.social?.leaveGroup ?? "Leave"}
              </button>
              {isGroupAdmin && (
                <button onClick={handleDeleteGroup}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "1px solid #C7382E55", color: "#C7382E", padding: "5px 10px", fontSize: 11, cursor: "pointer", borderRadius: 4 }}>
                  <Trash2 size={11} /> {t.social?.deleteGroup ?? "Delete Group"}
                </button>
              )}
            </div>
          </div>
        )}

        {InviteCards}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading
            ? <div style={{ textAlign: "center", opacity: 0.3, fontSize: 12, marginTop: 40 }}>…</div>
            : groupMessages.length === 0
            ? <div style={{ textAlign: "center", opacity: 0.3, fontSize: 12, marginTop: 40 }}>{t.social?.noMessages ?? "No messages yet."}</div>
            : grouped.map((item, i) => {
              if (item.type === "date") return (
                <div key={`d${i}`} style={{ textAlign: "center", fontSize: 10, opacity: 0.3, margin: "10px 0 6px", color: ink }}>{item.label}</div>
              );
              const { msg } = item;
              const isMine = msg.sender_id === myId;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 6 }}>
                  {!isMine && (
                    <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 2, color: ink, marginLeft: 4 }}>{msg._senderName}</div>
                  )}
                  <div style={{
                    maxWidth: "72%", background: isMine ? acc : ink + "12",
                    color: isMine ? "#fff" : ink,
                    padding: "7px 11px", fontSize: 13, lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap",
                    borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.35, marginTop: 2, color: ink }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              );
            })
          }
          <div ref={bottomRef} />
        </div>
        {inputBar}
        {showEventForm && (
          <SharedEventForm pal={pal} dark={false} t={t} onSave={handleAddEvent} onClose={() => { setShowEventForm(false); setEventError(""); }} error={eventError} />
        )}
      </div>
    );
  }

  return null;
}
