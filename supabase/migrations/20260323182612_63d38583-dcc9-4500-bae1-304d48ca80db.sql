
-- Affiliate clicks tracking
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_hash TEXT,
  source TEXT,
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Allow insert clicks" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Affiliate payouts
CREATE TABLE public.affiliate_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  stripe_payout_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- Enable realtime on clicks for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_clicks;
