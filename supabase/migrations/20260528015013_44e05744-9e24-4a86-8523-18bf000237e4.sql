
-- Enable realtime
ALTER TABLE public.project_messages REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.projects';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

-- Storage bucket for project attachments (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Project participants can read files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND public.is_project_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Project participants can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND public.is_project_participant(((storage.foldername(name))[1])::uuid, auth.uid())
);
