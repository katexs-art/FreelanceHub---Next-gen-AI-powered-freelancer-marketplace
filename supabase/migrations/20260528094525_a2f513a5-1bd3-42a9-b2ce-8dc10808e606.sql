
-- Allow order parties to update their own orders (status transitions enforced in app/edge functions)
CREATE POLICY orders_party_update ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin(auth.uid()));

-- Trigger to keep updated_at fresh on orders
DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
