CREATE INDEX IF NOT EXISTS messages_convo_idx ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS conversations_p1_idx ON public.conversations(participant_one, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_p2_idx ON public.conversations(participant_two, last_message_at DESC);