
-- Channels table
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'public',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view channels" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create channels" ON public.channels FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Channel creators can update" ON public.channels FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Channel members
CREATE TABLE public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view channel members" ON public.channel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join channels" ON public.channel_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON public.channel_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Messenger messages
CREATE TABLE public.messenger_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  thread_id uuid REFERENCES public.messenger_messages(id),
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.messenger_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in channels" ON public.messenger_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send messages" ON public.messenger_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can edit own messages" ON public.messenger_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete own messages" ON public.messenger_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messenger_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reactions" ON public.message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Message files
CREATE TABLE public.message_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messenger_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.message_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view files" ON public.message_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upload files" ON public.message_files FOR INSERT TO authenticated WITH CHECK (true);

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messenger_messages(id),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tickets" ON public.support_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
