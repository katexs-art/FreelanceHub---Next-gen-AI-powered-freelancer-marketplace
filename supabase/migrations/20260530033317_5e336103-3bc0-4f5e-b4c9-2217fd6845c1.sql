
-- Extend reviews table with 5 category ratings + standout moment + helpful_count
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rating_communication int CHECK (rating_communication BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_quality int CHECK (rating_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_delivery int CHECK (rating_delivery BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_value int CHECK (rating_value BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_rehire int CHECK (rating_rehire BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS overall_rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS standout_moment text,
  ADD COLUMN IF NOT EXISTS helpful_count int NOT NULL DEFAULT 0;

UPDATE public.reviews SET overall_rating = rating WHERE overall_rating IS NULL;

-- Profile aggregate columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS river_score numeric(4,2),
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS total_reviews int NOT NULL DEFAULT 0;

-- Review prompt tracking (14-day window)
CREATE TABLE IF NOT EXISTS public.review_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  buyer_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.review_prompts TO authenticated;
GRANT ALL ON public.review_prompts TO service_role;

ALTER TABLE public.review_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY rp_buyer_read ON public.review_prompts
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR public.is_admin(auth.uid()));

-- Recompute aggregates + river score
CREATE OR REPLACE FUNCTION public.recompute_seller_review_stats(_seller uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _avg numeric(3,2);
  _count int;
  _river numeric(4,2);
  _on_time numeric;
BEGIN
  SELECT ROUND(AVG(overall_rating)::numeric, 2), COUNT(*)
    INTO _avg, _count
    FROM public.reviews
   WHERE seller_id = _seller AND reviewer_role = 'buyer' AND overall_rating IS NOT NULL;

  -- On-time delivery rate of completed orders (fallback 1)
  SELECT COALESCE(
    AVG(CASE WHEN delivered_at IS NULL OR delivery_deadline IS NULL OR delivered_at <= delivery_deadline THEN 1.0 ELSE 0.0 END),
    1.0
  ) INTO _on_time
  FROM public.orders WHERE seller_id = _seller AND status = 'completed';

  IF _count IS NULL OR _count = 0 THEN
    _river := NULL;
  ELSE
    -- Score on a 0-100 scale: (avg/5)*100 weighted, slight boost for on-time
    _river := ROUND(LEAST(100, ((_avg / 5.0) * 90 + (_on_time * 10)))::numeric, 2);
  END IF;

  UPDATE public.profiles
     SET average_rating = _avg,
         total_reviews = COALESCE(_count, 0),
         river_score = _river,
         updated_at = now()
   WHERE id = _seller;
END $$;

-- Submit a full 5-category review
CREATE OR REPLACE FUNCTION public.submit_full_review(
  _order_id uuid,
  _communication int,
  _quality int,
  _delivery int,
  _value int,
  _rehire int,
  _text text,
  _standout text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _o record;
  _overall numeric(3,2);
  _avg_int int;
  _id uuid;
  _prompt record;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _communication IS NULL OR _quality IS NULL OR _delivery IS NULL OR _value IS NULL OR _rehire IS NULL
     OR _communication NOT BETWEEN 1 AND 5
     OR _quality NOT BETWEEN 1 AND 5
     OR _delivery NOT BETWEEN 1 AND 5
     OR _value NOT BETWEEN 1 AND 5
     OR _rehire NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'all 5 ratings required (1-5)';
  END IF;
  IF _text IS NULL OR length(trim(_text)) < 50 THEN
    RAISE EXCEPTION 'review must be at least 50 characters';
  END IF;

  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF _o IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF _o.buyer_id <> _me THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _o.status <> 'completed' THEN RAISE EXCEPTION 'order not completed'; END IF;

  SELECT * INTO _prompt FROM public.review_prompts WHERE order_id = _order_id;
  IF _prompt.id IS NOT NULL AND _prompt.expires_at < now() THEN
    RAISE EXCEPTION 'review window expired';
  END IF;
  IF _prompt.id IS NULL AND _o.completed_at IS NOT NULL AND _o.completed_at + interval '14 days' < now() THEN
    RAISE EXCEPTION 'review window expired';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reviews WHERE order_id = _order_id AND reviewer_role = 'buyer') THEN
    RAISE EXCEPTION 'review already submitted';
  END IF;

  _overall := ROUND(((_communication + _quality + _delivery + _value + _rehire)::numeric / 5.0), 2);
  _avg_int := ROUND((_communication + _quality + _delivery + _value + _rehire)::numeric / 5.0)::int;

  INSERT INTO public.reviews(
    order_id, gig_id, buyer_id, seller_id, reviewer_role,
    rating, overall_rating, review_text,
    rating_communication, rating_quality, rating_delivery, rating_value, rating_rehire,
    communication_rating, service_rating, recommend_rating,
    standout_moment
  ) VALUES (
    _order_id, _o.gig_id, _me, _o.seller_id, 'buyer',
    _avg_int, _overall, _text,
    _communication, _quality, _delivery, _value, _rehire,
    _communication, _quality, _rehire,
    NULLIF(trim(COALESCE(_standout,'')), '')
  ) RETURNING id INTO _id;

  PERFORM public.recompute_seller_review_stats(_o.seller_id);

  PERFORM public.create_notification(
    _o.seller_id, 'system'::notification_type,
    'You just received a new review — check it out.',
    NULL,
    '/u/' || COALESCE((SELECT username FROM public.profiles WHERE id = _o.seller_id), _o.seller_id::text) || '#reviews'
  );

  RETURN _id;
END $$;

-- Trigger: when order flips to completed, create review prompt + buyer notification
CREATE OR REPLACE FUNCTION public.orders_on_completed_review_prompt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.review_prompts(order_id, buyer_id, expires_at)
    VALUES (NEW.id, NEW.buyer_id, now() + interval '14 days')
    ON CONFLICT (order_id) DO NOTHING;

    PERFORM public.create_notification(
      NEW.buyer_id, 'order'::notification_type,
      'How did it go? Leave a review for your seller — it only takes 60 seconds.',
      NULL,
      '/orders/' || NEW.id::text || '/review'
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_review_prompt ON public.orders;
CREATE TRIGGER trg_orders_review_prompt
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_on_completed_review_prompt();

-- Seller response within 300 char limit (extra safety)
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_reply_len;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_reply_len CHECK (reply IS NULL OR length(reply) <= 300);
