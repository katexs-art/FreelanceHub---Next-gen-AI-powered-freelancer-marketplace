
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one uuid NOT NULL,
  participant_two uuid NOT NULL,
  gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (participant_one < participant_two),
  UNIQUE (participant_one, participant_two)
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_party_read ON public.conversations FOR SELECT
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY conv_party_insert ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);
CREATE POLICY conv_party_update ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE INDEX idx_conv_p1 ON public.conversations(participant_one, last_message_at DESC);
CREATE INDEX idx_conv_p2 ON public.conversations(participant_two, last_message_at DESC);

-- Get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  _other uuid, _gig_id uuid DEFAULT NULL, _order_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _other THEN RAISE EXCEPTION 'cannot start conversation with self'; END IF;
  IF _me < _other THEN _a := _me; _b := _other; ELSE _a := _other; _b := _me; END IF;

  SELECT id INTO _id FROM public.conversations WHERE participant_one=_a AND participant_two=_b;
  IF _id IS NULL THEN
    INSERT INTO public.conversations(participant_one, participant_two, gig_id, order_id)
    VALUES (_a, _b, _gig_id, _order_id)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;

-- Bump conversation on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(COALESCE(NEW.content, '[attachment]'), 140)
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- Reviews → update gig aggregates (buyer reviews only)
CREATE OR REPLACE FUNCTION public.update_gig_rating_on_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reviewer_role = 'buyer' THEN
    UPDATE public.gigs g
      SET total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE gig_id = g.id AND reviewer_role='buyer'),
          average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE gig_id = g.id AND reviewer_role='buyer')
      WHERE id = NEW.gig_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gig_rating_on_review
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_gig_rating_on_review();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
