import { supabase } from "../lib/supabaseClient";

const THIRTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

export async function fetchMessages(myId, friendId) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, content, read_at, created_at")
    .or(
      `and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`
    )
    .gte("created_at", THIRTY_DAYS_AGO())
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAsRead(myId, friendId) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: now })
    .eq("receiver_id", myId)
    .eq("sender_id", friendId)
    .is("read_at", null);
  if (error) throw error;
}

export function subscribeToMessages(myId, onMessage) {
  return supabase
    .channel(`messages_${myId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${myId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
}
