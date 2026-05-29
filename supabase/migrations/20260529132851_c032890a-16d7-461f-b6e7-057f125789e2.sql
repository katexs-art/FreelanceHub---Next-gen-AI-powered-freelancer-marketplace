CREATE OR REPLACE FUNCTION public.notify_on_custom_offer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (TG_OP='INSERT') then
    perform public.create_notification(NEW.buyer_id, 'custom_offer'::notification_type,
      'New custom offer', 'You received a custom offer for $' || (NEW.price/100.0)::text,
      '/inbox/' || NEW.conversation_id::text);
  elsif (TG_OP='UPDATE' and NEW.status is distinct from OLD.status) then
    perform public.create_notification(NEW.seller_id, 'custom_offer'::notification_type,
      'Offer ' || NEW.status::text, null, '/inbox/' || NEW.conversation_id::text);
  end if;
  return NEW;
end $function$;