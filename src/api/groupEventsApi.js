import { supabase } from "../lib/supabaseClient";

export async function fetchGroupEventsForUser(myId) {
  const { data: events, error } = await supabase
    .from("group_events")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  if (!events?.length) return [];

  // For events I didn't create, only include ones I've accepted
  const notMine = events.filter(e => e.creator_id !== myId);
  const acceptedEventIds = new Set();
  if (notMine.length) {
    const { data: invites } = await supabase
      .from("group_event_invites")
      .select("event_id")
      .eq("invitee_id", myId)
      .eq("status", "accepted")
      .in("event_id", notMine.map(e => e.id));
    (invites ?? []).forEach(i => acceptedEventIds.add(i.event_id));
  }

  const visible = events.filter(e => e.creator_id === myId || acceptedEventIds.has(e.id));
  if (!visible.length) return [];

  const groupIds = [...new Set(visible.filter(e => e.group_id).map(e => e.group_id))];
  const creatorIds = [...new Set(visible.map(e => e.creator_id))];

  const [groupsRes, profilesRes] = await Promise.all([
    groupIds.length
      ? supabase.from("groups").select("id, name, admin_id").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("profiles").select("id, username").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupMap = Object.fromEntries((groupsRes.data ?? []).map(g => [g.id, g]));
  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));

  return visible.map(e => ({
    ...e,
    _groupLabel: e.group_id
      ? `[${groupMap[e.group_id]?.name ?? "Group"}]`
      : `[${profileMap[e.creator_id]?.username ?? "?"}]`,
    _isAdmin: e.group_id
      ? groupMap[e.group_id]?.admin_id === myId
      : e.creator_id === myId,
  }));
}

export async function addGroupEvent({ groupId, receiverId, creatorId, title, date, startTime, endTime, color, memo }) {
  const payload = {
    creator_id: creatorId,
    title,
    date,
    start_time: startTime || null,
    end_time: endTime || null,
    color: color || "#4A90D9",
    memo: memo || null,
  };
  if (groupId) payload.group_id = groupId;
  if (receiverId) payload.receiver_id = receiverId;

  const { data, error } = await supabase
    .from("group_events")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createEventAndInvites(payload, memberIds) {
  const event = await addGroupEvent(payload);
  const invitees = (memberIds ?? []).filter(id => id !== payload.creatorId);
  if (invitees.length) {
    const { error } = await supabase
      .from("group_event_invites")
      .insert(invitees.map(id => ({ event_id: event.id, invitee_id: id })));
    if (error) throw error;
  }
  return event;
}

export async function fetchPendingInvites(myId) {
  const { data, error } = await supabase
    .from("group_event_invites")
    .select("id, event_id, created_at")
    .eq("invitee_id", myId)
    .eq("status", "pending");
  if (error) throw error;
  if (!data?.length) return [];

  const eventIds = data.map(i => i.event_id);
  const { data: events, error: evErr } = await supabase
    .from("group_events")
    .select("id, title, date, start_time, end_time, color, group_id, receiver_id, creator_id")
    .in("id", eventIds);
  if (evErr) throw evErr;

  const creatorIds = [...new Set((events ?? []).map(e => e.creator_id))];
  const { data: profiles } = await supabase
    .from("profiles").select("id, username").in("id", creatorIds);
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
  const eventMap = Object.fromEntries((events ?? []).map(e => [e.id, e]));

  return data.map(inv => {
    const ev = eventMap[inv.event_id];
    return { ...inv, event: ev, creatorUsername: profileMap[ev?.creator_id]?.username ?? "?" };
  }).filter(inv => inv.event);
}

export async function respondToInvite(inviteId, status) {
  const { error } = await supabase
    .from("group_event_invites")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) throw error;
}

export async function deleteGroupEvent(eventId) {
  const { error } = await supabase.from("group_events").delete().eq("id", eventId);
  if (error) throw error;
}

export async function updateGroupEvent(eventId, changes) {
  const payload = {};
  if (changes.title     !== undefined) payload.title      = changes.title;
  if (changes.startTime !== undefined) payload.start_time = changes.startTime || null;
  if (changes.endTime   !== undefined) payload.end_time   = changes.endTime   || null;
  if (changes.color     !== undefined) payload.color      = changes.color;
  if (changes.memo      !== undefined) payload.memo       = changes.memo      || null;
  const { error } = await supabase.from("group_events").update(payload).eq("id", eventId);
  if (error) throw error;
}
