import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  created_by: string | null;
  created_at: string;
  unread_count?: number;
}

export interface MessengerMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  thread_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender_name?: string;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

const DEFAULT_CHANNELS = [
  { name: "general", description: "Team announcements and updates", type: "public" },
  { name: "support", description: "Client support tickets", type: "public" },
  { name: "sales", description: "Sales conversations and deals", type: "public" },
  { name: "river-alerts", description: "River AI notifications", type: "river" },
  { name: "integrations", description: "Webhook and integration events", type: "public" },
  { name: "files", description: "Shared documents and assets", type: "public" },
];

export function useMessenger() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);

  // Fetch or create default channels
  const fetchChannels = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("channels").select("*").order("created_at");
    if (data && data.length > 0) {
      setChannels(data as unknown as Channel[]);
      if (!activeChannelId) setActiveChannelId(data[0].id);
    } else {
      // Create default channels
      for (const ch of DEFAULT_CHANNELS) {
        await supabase.from("channels").insert({ ...ch, created_by: user.id } as never);
      }
      const { data: created } = await supabase.from("channels").select("*").order("created_at");
      if (created) {
        setChannels(created as unknown as Channel[]);
        setActiveChannelId(created[0].id);
        // Join all channels
        for (const c of created) {
          await supabase.from("channel_members").insert({ channel_id: c.id, user_id: user.id } as never);
        }
      }
    }
    setLoading(false);
  }, [user, activeChannelId]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    setMsgLoading(true);
    const { data } = await supabase
      .from("messenger_messages")
      .select("*")
      .eq("channel_id", activeChannelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data as unknown as MessengerMessage[]);
    setMsgLoading(false);
  }, [activeChannelId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!activeChannelId) return;
    const channel = supabase
      .channel(`messenger-${activeChannelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messenger_messages", filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as unknown as MessengerMessage]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannelId]);

  const sendMessage = async (content: string, messageType = "text") => {
    if (!user || !activeChannelId || !content.trim()) return;
    await supabase.from("messenger_messages").insert({
      channel_id: activeChannelId, sender_id: user.id, content: content.trim(), message_type: messageType,
    } as never);
  };

  const deleteMessage = async (messageId: string) => {
    await supabase.from("messenger_messages").update({ deleted_at: new Date().toISOString() } as never).eq("id", messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji } as never);
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
  };

  return {
    channels, messages, activeChannelId, loading, msgLoading,
    setActiveChannelId, sendMessage, deleteMessage, addReaction, removeReaction, refetch: fetchMessages,
  };
}
