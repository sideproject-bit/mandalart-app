import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { fetchMessages, sendMessage, markAsRead, subscribeToMessages } from "../api/messagesApi";
import { listFriends } from "../api/friendsApi";

function formatDate(iso, t) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return t.social.today;
  if (isYesterday) return t.social.yesterday;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ pal, t, myId, addNotification }) {
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const activeFriendRef = useRef(null);
  const friendsRef = useRef([]);

  useEffect(() => { activeFriendRef.current = activeFriend; }, [activeFriend]);
  useEffect(() => { friendsRef.current = friends; }, [friends]);

  useEffect(() => {
    if (!myId) return;
    listFriends(myId).then(setFriends).catch(() => {});
  }, [myId]);

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!myId) return;
    channelRef.current = subscribeToMessages(myId, (msg) => {
      const currentFriend = activeFriendRef.current;
      const isOpenChat = currentFriend?.id === msg.sender_id;

      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        // only append to message list if this chat is open
        if (!isOpenChat) return prev;
        return [...prev, msg];
      });

      if (isOpenChat) {
        markAsRead(myId, msg.sender_id).catch(() => {});
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === msg.sender_id && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
      } else {
        // fire in-app notification
        const sender = friendsRef.current.find((f) => f.id === msg.sender_id);
        const name = sender?.username ?? "Someone";
        addNotification?.({
          type: "chat",
          title: name,
          body: msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content,
        });
      }
    });
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [myId, addNotification]);

  const openChat = useCallback(async (friend) => {
    setActiveFriend(friend);
    setLoading(true);
    try {
      const msgs = await fetchMessages(myId, friend.id);
      setMessages(msgs);
      await markAsRead(myId, friend.id);
      // reflect read status locally
      setMessages((prev) =>
        prev.map((m) =>
          m.receiver_id === myId && !m.read_at
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      );
    } catch {}
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !activeFriend || sending) return;
    setSending(true);
    setInput("");
    try {
      const msg = await sendMessage(myId, activeFriend.id, content);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInput(content);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  for (const msg of messages) {
    const label = formatDate(msg.created_at, t);
    if (label !== lastDate) {
      grouped.push({ type: "date", label });
      lastDate = label;
    }
    grouped.push({ type: "msg", msg });
  }

  if (activeFriend) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 420 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => { setActiveFriend(null); setMessages([]); }}
            style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: 0 }}
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, textTransform: "uppercase" }}>{activeFriend.username}</div>
            <div style={{ fontSize: 10, opacity: 0.45, fontFamily: "monospace" }}>#{activeFriend.tag}</div>
          </div>
        </div>

        {/* Retention notice */}
        <div style={{
          fontSize: 10, opacity: 0.45, color: pal.ink, textAlign: "center",
          padding: "5px 0", borderBottom: `1px solid ${pal.ink}18`, marginBottom: 8,
        }}>
          {t.social.retentionNotice}
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
          {loading ? (
            <div style={{ textAlign: "center", opacity: 0.35, fontSize: 12, marginTop: 40 }}>…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", opacity: 0.35, fontSize: 12, marginTop: 40 }}>{t.social.noMessages}</div>
          ) : (
            grouped.map((item, i) => {
              if (item.type === "date") {
                return (
                  <div key={`d-${i}`} style={{ textAlign: "center", fontSize: 10, opacity: 0.35, margin: "10px 0 6px", color: pal.ink }}>
                    {item.label}
                  </div>
                );
              }
              const { msg } = item;
              const isMine = msg.sender_id === myId;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 6 }}>
                  <div style={{
                    maxWidth: "72%",
                    background: isMine ? pal.accent : pal.ink + "12",
                    color: isMine ? "#fff" : pal.ink,
                    padding: "7px 11px",
                    borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    fontSize: 13,
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2, fontSize: 10, opacity: 0.4, color: pal.ink }}>
                    <span>{formatTime(msg.created_at)}</span>
                    {isMine && (
                      msg.read_at
                        ? <CheckCheck size={11} style={{ opacity: 0.8 }} />
                        : <Check size={11} />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, borderTop: `1px solid ${pal.ink}18`, paddingTop: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.social.typeMessage}
            rows={1}
            style={{
              flex: 1, background: pal.ink + "0c", color: pal.ink,
              border: `1px solid ${pal.ink}22`, padding: "8px 10px",
              fontSize: 13, resize: "none", fontFamily: "inherit", outline: "none",
              borderRadius: 2,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              background: pal.accent, color: "#fff", border: "none",
              width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !sending ? "pointer" : "not-allowed",
              opacity: input.trim() && !sending ? 1 : 0.4,
              flexShrink: 0, alignSelf: "flex-end",
              borderRadius: 2,
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    );
  }

  // Friend list
  return (
    <div>
      <h2 style={{ fontWeight: 900, fontSize: 24, textTransform: "uppercase", margin: "0 0 16px" }}>{t.social.chatTitle}</h2>
      {friends.length === 0 ? (
        <p style={{ fontSize: 13, opacity: 0.45, color: pal.ink }}>{t.social.noFriends}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => openChat(friend)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "none", border: `1px solid ${pal.ink}18`,
                color: pal.ink, cursor: "pointer",
                padding: "12px 14px", textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = pal.ink + "08"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: pal.accent + "33",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, color: pal.accent, flexShrink: 0,
              }}>
                {(friend.username?.[0] ?? "?").toUpperCase()}
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
