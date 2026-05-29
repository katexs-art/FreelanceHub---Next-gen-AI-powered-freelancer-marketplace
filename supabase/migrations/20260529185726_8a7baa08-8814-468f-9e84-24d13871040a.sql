
-- Add new notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'bid';

-- Project posts
CREATE TABLE public.project_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text,
  skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  budget_min int,
  budget_max int,
  deadline date,
  attachments text[] NOT NULL DEFAULT ARRAY[]::text[],
  visibility text NOT NULL DEFAULT 'open',
  status text NOT NULL DEFAULT 'open',
  bid_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.project_posts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.project_posts TO authenticated;
GRANT ALL ON public.project_posts TO service_role;

ALTER TABLE public.project_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY pp_public_read ON public.project_posts FOR SELECT USING (true);
CREATE POLICY pp_buyer_insert ON public.project_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY pp_buyer_update ON public.project_posts FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR is_admin(auth.uid()));

-- Bids
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  bid_amount int NOT NULL,
  delivery_days int NOT NULL,
  cover_message text NOT NULL,
  attachments text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY bids_party_read ON public.bids FOR SELECT TO authenticated
  USING (
    auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.project_posts p WHERE p.id = bids.project_id AND p.buyer_id = auth.uid())
    OR is_admin(auth.uid())
  );
CREATE POLICY bids_seller_insert ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY bids_party_update ON public.bids FOR UPDATE TO authenticated
  USING (
    auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM public.project_posts p WHERE p.id = bids.project_id AND p.buyer_id = auth.uid())
    OR is_admin(auth.uid())
  );

CREATE INDEX idx_bids_project ON public.bids(project_id);

-- Submit a bid: insert, bump count, notify buyer
CREATE OR REPLACE FUNCTION public.submit_bid(
  _project_id uuid,
  _bid_amount int,
  _delivery_days int,
  _cover_message text,
  _attachments text[] DEFAULT ARRAY[]::text[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _buyer uuid;
  _bid_id uuid;
  _title text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT buyer_id, title INTO _buyer, _title FROM public.project_posts WHERE id = _project_id;
  IF _buyer IS NULL THEN RAISE EXCEPTION 'project not found'; END IF;
  IF _buyer = _me THEN RAISE EXCEPTION 'cannot bid on own project'; END IF;

  INSERT INTO public.bids(project_id, seller_id, bid_amount, delivery_days, cover_message, attachments)
  VALUES (_project_id, _me, _bid_amount, _delivery_days, _cover_message, COALESCE(_attachments, ARRAY[]::text[]))
  RETURNING id INTO _bid_id;

  UPDATE public.project_posts SET bid_count = bid_count + 1 WHERE id = _project_id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    _buyer, 'bid'::notification_type,
    'A new bid came in on your project',
    'A new bid came in on your project — review it now.',
    '/projects/' || _project_id::text || '/bids'
  );

  RETURN _bid_id;
END $$;

-- Accept a bid
CREATE OR REPLACE FUNCTION public.accept_bid(_bid_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _b record;
  _buyer uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO _b FROM public.bids WHERE id = _bid_id;
  IF _b IS NULL THEN RAISE EXCEPTION 'bid not found'; END IF;
  SELECT buyer_id INTO _buyer FROM public.project_posts WHERE id = _b.project_id;
  IF _buyer <> _me THEN RAISE EXCEPTION 'forbidden'; END IF;

  UPDATE public.bids SET status = 'accepted' WHERE id = _bid_id;
  UPDATE public.bids SET status = 'closed' WHERE project_id = _b.project_id AND id <> _bid_id AND status = 'pending';
  UPDATE public.project_posts SET status = 'in_progress' WHERE id = _b.project_id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    _b.seller_id, 'bid'::notification_type,
    'Your bid was accepted',
    'Your bid was accepted — the buyer is ready to start',
    '/projects/' || _b.project_id::text
  );

  RETURN _b.project_id;
END $$;
