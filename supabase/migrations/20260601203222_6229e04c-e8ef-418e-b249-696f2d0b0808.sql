
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  buyer_orders_inapp boolean NOT NULL DEFAULT true,
  buyer_orders_email boolean NOT NULL DEFAULT true,
  seller_orders_inapp boolean NOT NULL DEFAULT true,
  seller_orders_email boolean NOT NULL DEFAULT true,
  messages_inapp boolean NOT NULL DEFAULT true,
  messages_email boolean NOT NULL DEFAULT true,
  marketing_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY np_own_read ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY np_own_insert ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY np_own_update ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.should_notify(_user_id uuid, _category text, _channel text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.notification_preferences%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.notification_preferences WHERE user_id = _user_id;
  IF NOT FOUND THEN
    -- default: everything on except marketing
    IF _category = 'marketing' AND _channel = 'email' THEN RETURN false; END IF;
    RETURN true;
  END IF;
  IF _category = 'buyer_orders' AND _channel = 'inapp' THEN RETURN r.buyer_orders_inapp; END IF;
  IF _category = 'buyer_orders' AND _channel = 'email' THEN RETURN r.buyer_orders_email; END IF;
  IF _category = 'seller_orders' AND _channel = 'inapp' THEN RETURN r.seller_orders_inapp; END IF;
  IF _category = 'seller_orders' AND _channel = 'email' THEN RETURN r.seller_orders_email; END IF;
  IF _category = 'messages' AND _channel = 'inapp' THEN RETURN r.messages_inapp; END IF;
  IF _category = 'messages' AND _channel = 'email' THEN RETURN r.messages_email; END IF;
  IF _category = 'marketing' AND _channel = 'email' THEN RETURN r.marketing_email; END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.should_notify(uuid, text, text) TO authenticated, service_role;
