import { supabase } from "../lib/supabaseClient";

export async function fetchGroupMessages(groupId) {
  const { data, error } = await supabase
    .from("group_messages")
    .select("id, group_id, sender_id, content, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function sendGroupMessage(groupId, senderId, content) {
  const { data, error } = await supabase
    .from("group_messages")
    .insert({ group_id: groupId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToGroupMessages(groupId, onMessage) {
  return supabase
    .channel(`group_msgs_${groupId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "group_messages",
      filter: `group_id=eq.${groupId}`,
    }, (payload) => onMessage(payload.new))
    .subscribe();
}

// Global subscription for all groups — used for unread tracking & notifications
// when the user is NOT inside a specific group chat.
export function subscribeToAllGroupMessages(myId, groupIds, onMessage) {
  if (!groupIds.length) return null;
  const groupIdSet = new Set(groupIds);
  return supabase
    .channel(`grp_all_${myId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "group_messages",
    }, (payload) => {
      const msg = payload.new;
      if (msg.sender_id === myId) return;
      if (groupIdSet.has(msg.group_id)) onMessage(msg);
    })
    .subscribe();
}
