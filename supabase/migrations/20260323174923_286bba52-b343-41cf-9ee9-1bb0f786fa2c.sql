
-- Fix message_files INSERT policy
DROP POLICY "Users can upload files" ON public.message_files;
CREATE POLICY "Users can upload files" ON public.message_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.messenger_messages m WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));

-- Fix support_tickets INSERT policy  
DROP POLICY "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = support_tickets.channel_id AND cm.user_id = auth.uid()
  ));

-- Fix support_tickets UPDATE policy
DROP POLICY "Users can update tickets" ON public.support_tickets;
CREATE POLICY "Users can update tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (
    SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = support_tickets.channel_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));
