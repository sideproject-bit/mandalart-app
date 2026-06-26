import React, { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Search, UserPlus, Check, X, Eye } from "lucide-react";
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, listIncomingRequests, listFriends } from "../api/friendsApi";

export default function FriendsPanel({ pal, t, play, myId, myCode, onViewFriend, notifOn, addNotification }) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState(null); // { type: "error" | "success", text }
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [copied, setCopied] = useState(false);
  const prevIncomingIds = useRef(null);
  const prevFriendIds = useRef(null);

  const refresh = useCallback(async () => {
    const [f, inc] = await Promise.all([listFriends(myId), listIncomingRequests(myId)]);
    const newFriends = f.map((p) => ({ id: p.id, code: `${p.username}#${p.tag}` }));
    setFriends(newFriends);
    const newIncoming = inc.map((r) => ({ id: r.requesterId, code: `${r.username}#${r.tag}` }));
    setIncoming(newIncoming);

    const isFirstLoad = prevIncomingIds.current === null;

    // Fire notification for new incoming requests (skip on first load)
    if (!isFirstLoad && notifOn && Notification.permission === "granted") {
      const prev = prevIncomingIds.current;
      newIncoming.forEach((r) => {
        if (!prev.includes(r.id)) {
          new Notification(t.friends.notifTitle || "New friend request", {
            body: t.friends.notifBody ? t.friends.notifBody(r.code) : `${r.code} sent you a friend request.`,
          });
        }
      });
    }
    if (!isFirstLoad) {
      const prevIds = prevIncomingIds.current;
      newIncoming.forEach((r) => {
        if (!prevIds.includes(r.id)) {
          addNotification?.({ type: "info", title: t.friends.notifTitle || "New friend request", body: t.friends.notifBody ? t.friends.notifBody(r.code) : `${r.code}` });
        }
      });
      // Detect friend accepted: was in incoming, now in friends
      const prevFIds = prevFriendIds.current ?? [];
      newFriends.forEach((fr) => {
        if (!prevFIds.includes(fr.id)) {
          addNotification?.({ type: "success", title: t.friends.acceptedTitle || "Friend added", body: t.friends.acceptedBody ? t.friends.acceptedBody(fr.code) : fr.code });
        }
      });
    }

    prevIncomingIds.current = newIncoming.map((r) => r.id);
    prevFriendIds.current = newFriends.map((f) => f.id);
  }, [myId, notifOn, t, addNotification]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll for new friend requests every 60s
  useEffect(() => {
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === myCode.toLowerCase()) {
      setFeedback({ type: "error", text: t.friends.errSelf });
      play("F3", "16n");
      return;
    }
    const res = await sendFriendRequest(myId, trimmed);
    if (!res.ok) {
      const msg = res.reason === "not_found" ? t.friends.errNotFound : res.reason === "self" ? t.friends.errSelf : t.friends.errAlready;
      setFeedback({ type: "error", text: msg });
      play("F3", "16n");
      return;
    }
    setFeedback({ type: "success", text: t.friends.sent(`${res.target.username}#${res.target.tag}`) });
    play("G5", "16n");
    setCode("");
  };

  const accept = async (id) => {
    await acceptFriendRequest(myId, id);
    play("E5", "16n");
    refresh();
  };
  const decline = async (id) => {
    await declineFriendRequest(myId, id);
    play("F4", "16n");
    refresh();
  };

  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(myCode).catch(() => {});
    setCopied(true);
    play("B5", "32n");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 480 }}>
      <div style={{ border: `1px solid ${pal.ink}30`, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.55, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{t.friends.yourCode}</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{myCode}</div>
        </div>
        <button
          onClick={copyCode}
          style={{ background: pal.accent3, color: "#1a1a1a", border: "none", padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <Copy size={13} /> {copied ? t.friends.copied : t.friends.copy}
        </button>
      </div>

      <div>
        <div style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", marginBottom: 8, color: pal.ink }}>{t.friends.addTitle}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.4, color: pal.ink }} />
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); setFeedback(null); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={t.friends.placeholder}
              style={{ width: "100%", background: "transparent", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "10px 10px 10px 32px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={submit}
            style={{ background: pal.accent3, color: "#1a1a1a", border: "none", padding: "0 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            <UserPlus size={14} /> {t.friends.add}
          </button>
        </div>
        <p style={{ fontSize: 10.5, opacity: 0.5, marginTop: 6, color: pal.ink }}>{t.friends.exactHint}</p>
        {feedback && (
          <div className="fade-in" style={{ marginTop: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: feedback.type === "error" ? "#D1483D" : "#3CA45C" }}>
            {feedback.type === "error" ? <X size={13} /> : <Check size={13} />} {feedback.text}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", marginBottom: 8, color: pal.ink }}>{t.friends.requests}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {incoming.map((req) => (
              <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${pal.ink}30`, padding: "8px 12px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: pal.ink }}>{req.code}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => accept(req.id)} style={{ background: pal.accent3, color: "#1a1a1a", border: "none", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                    {t.friends.accept}
                  </button>
                  <button onClick={() => decline(req.id)} style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                    {t.friends.decline}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", marginBottom: 8, color: pal.ink }}>{t.friends.list}</div>
        {friends.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5, color: pal.ink }}>{t.friends.empty}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {friends.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${pal.ink}30`, padding: "8px 12px", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: pal.ink }}>{f.code}</span>
                <button
                  onClick={() => onViewFriend?.(f)}
                  style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "4px 10px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Eye size={12} /> {t.friends.viewMandalarts}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
