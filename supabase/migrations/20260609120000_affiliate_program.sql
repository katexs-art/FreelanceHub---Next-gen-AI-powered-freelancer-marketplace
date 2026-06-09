-- ─── Affiliate Program Tables ─────────────────────────────────────────────

-- Main affiliates record, one per user
CREATE TABLE IF NOT EXISTS public.affiliates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_code   text NOT NULL UNIQUE,
  clicks           integer NOT NULL DEFAULT 0,
  signups          integer NOT NULL DEFAULT 0,
  conversions      integer NOT NULL DEFAULT 0,
  total_earned     integer NOT NULL DEFAULT 0, -- cents
  pending_payout   integer NOT NULL DEFAULT 0, -- cents
  paid_out         integer NOT NULL DEFAULT 0, -- cents
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_user_id_idx ON public.affiliates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_code_idx   ON public.affiliates(affiliate_code);

-- Click tracking
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text NOT NULL,
  ip_address     text,
  page_url       text,
  converted      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_code_idx ON public.affiliate_clicks(affiliate_code);

-- Conversion / commission records
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code    text NOT NULL,
  affiliate_id      uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  order_id          uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  referred_user_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_amount      integer NOT NULL DEFAULT 0, -- cents
  commission_amount integer NOT NULL DEFAULT 0, -- cents (40%)
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_conv_code_idx ON public.affiliate_conversions(affiliate_code);
CREATE INDEX IF NOT EXISTS affiliate_conv_aff_idx  ON public.affiliate_conversions(affiliate_id);

-- Payout requests
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount         integer NOT NULL, -- cents
  method         text NOT NULL DEFAULT 'paypal',
  payout_email   text,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','rejected')),
  requested_at   timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts     ENABLE ROW LEVEL SECURITY;

-- affiliates: owner reads own row; anyone can read code lookup (for tracking)
CREATE POLICY "affiliate_owner_all"    ON public.affiliates FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "affiliate_public_read"  ON public.affiliates FOR SELECT USING (true);

-- clicks: anyone can insert (tracking pixel); owner can read
CREATE POLICY "click_insert_anon"      ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "click_owner_read"       ON public.affiliate_clicks FOR SELECT
  USING (affiliate_code IN (SELECT affiliate_code FROM public.affiliates WHERE user_id = auth.uid()));

-- conversions: owner reads own
CREATE POLICY "conv_owner_read"        ON public.affiliate_conversions FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "conv_service_all"       ON public.affiliate_conversions FOR ALL
  USING (auth.role() = 'service_role');

-- payouts: owner reads / inserts own
CREATE POLICY "payout_owner_all"       ON public.affiliate_payouts FOR ALL
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()))
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "payout_owner_read"      ON public.affiliate_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- ─── Grants ──────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.affiliates            TO authenticated;
GRANT SELECT, INSERT          ON public.affiliate_clicks      TO anon, authenticated;
GRANT SELECT                  ON public.affiliate_conversions TO authenticated;
GRANT SELECT, INSERT          ON public.affiliate_payouts     TO authenticated;
GRANT ALL ON public.affiliates, public.affiliate_clicks,
            public.affiliate_conversions, public.affiliate_payouts TO service_role;

-- ─── Helper: generate a short readable affiliate code ────────────────────────
CREATE OR REPLACE FUNCTION public.generate_affiliate_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _prefix text;
BEGIN
  -- Try to use username prefix, fall back to random
  SELECT COALESCE(UPPER(SUBSTRING(username, 1, 4)), 'KATX')
    INTO _prefix
    FROM profiles WHERE id = p_user_id;

  LOOP
    _code := _prefix || UPPER(SUBSTRING(md5(gen_random_uuid()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM affiliates WHERE affiliate_code = _code);
  END LOOP;

  RETURN _code;
END;
$$;

-- ─── Helper: join affiliate program ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_affiliate_program()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid  uuid := auth.uid();
  _code text;
  _row  affiliates;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Already enrolled?
  SELECT * INTO _row FROM affiliates WHERE user_id = _uid;
  IF FOUND THEN
    RETURN json_build_object('affiliate_code', _row.affiliate_code, 'already_member', true);
  END IF;

  _code := generate_affiliate_code(_uid);

  INSERT INTO affiliates (user_id, affiliate_code)
  VALUES (_uid, _code)
  RETURNING * INTO _row;

  RETURN json_build_object('affiliate_code', _row.affiliate_code, 'already_member', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_affiliate_program()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_affiliate_code(uuid)   TO authenticated, service_role;

-- ─── Helper: record a click ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_affiliate_click(
  p_code     text,
  p_ip       text DEFAULT NULL,
  p_page_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only record if code exists and affiliate is active
  IF NOT EXISTS (SELECT 1 FROM affiliates WHERE affiliate_code = p_code AND status = 'active') THEN
    RETURN;
  END IF;

  INSERT INTO affiliate_clicks (affiliate_code, ip_address, page_url)
  VALUES (p_code, p_ip, p_page_url);

  UPDATE affiliates SET clicks = clicks + 1 WHERE affiliate_code = p_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_affiliate_click(text, text, text) TO anon, authenticated;

-- ─── Helper: record signup conversion ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_affiliate_signup(p_code text, p_new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM affiliates WHERE affiliate_code = p_code AND status = 'active') THEN
    RETURN;
  END IF;

  UPDATE affiliates SET signups = signups + 1 WHERE affiliate_code = p_code;

  -- Mark most recent click from this session as converted
  UPDATE affiliate_clicks
     SET converted = true
   WHERE id = (
     SELECT id FROM affiliate_clicks
      WHERE affiliate_code = p_code AND converted = false
      ORDER BY created_at DESC LIMIT 1
   );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_affiliate_signup(text, uuid) TO service_role;

-- ─── Helper: record order commission (called when order completes) ────────────
CREATE OR REPLACE FUNCTION public.record_affiliate_commission(
  p_order_id     uuid,
  p_order_amount integer -- cents
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code       text;
  _aff        affiliates;
  _commission integer;
BEGIN
  -- Look up which affiliate code is stored on the order (via referred_by on profiles)
  SELECT a.affiliate_code INTO _code
    FROM orders o
    JOIN profiles p ON p.id = o.buyer_id
    JOIN affiliates a ON a.affiliate_code = p.referred_by_affiliate
   WHERE o.id = p_order_id AND a.status = 'active';

  IF _code IS NULL THEN RETURN; END IF;

  _commission := ROUND(p_order_amount * 0.40);

  SELECT * INTO _aff FROM affiliates WHERE affiliate_code = _code;

  INSERT INTO affiliate_conversions
    (affiliate_code, affiliate_id, order_id, order_amount, commission_amount, status)
  VALUES
    (_code, _aff.id, p_order_id, p_order_amount, _commission, 'pending');

  UPDATE affiliates
     SET conversions    = conversions + 1,
         total_earned   = total_earned + _commission,
         pending_payout = pending_payout + _commission
   WHERE affiliate_code = _code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_affiliate_commission(uuid, integer) TO service_role;
