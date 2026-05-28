
-- Notification helper
create or replace function public.create_notification(_user uuid, _type notification_type, _title text, _body text, _link text)
returns void language sql security definer set search_path=public as $$
  insert into public.notifications(user_id, type, title, body, link) values (_user, _type, _title, _body, _link);
$$;

-- Notify on new message
create or replace function public.notify_on_message() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.create_notification(
    NEW.recipient_id, 'message'::notification_type, 'New message',
    left(coalesce(NEW.content,'[attachment]'),120),
    '/inbox/' || NEW.conversation_id::text
  );
  return NEW;
end $$;
drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message after insert on public.messages
for each row execute function public.notify_on_message();

-- Notify on order status change
create or replace function public.notify_on_order_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (TG_OP='UPDATE' and NEW.status is distinct from OLD.status) then
    perform public.create_notification(NEW.buyer_id, 'order'::notification_type,
      'Order ' || NEW.order_number || ' — ' || NEW.status::text, null, '/orders/' || NEW.id::text);
    perform public.create_notification(NEW.seller_id, 'order'::notification_type,
      'Order ' || NEW.order_number || ' — ' || NEW.status::text, null, '/orders/' || NEW.id::text);
  end if;
  return NEW;
end $$;
drop trigger if exists trg_notify_on_order_status on public.orders;
create trigger trg_notify_on_order_status after update on public.orders
for each row execute function public.notify_on_order_status();

-- Notify on custom offer
create or replace function public.notify_on_custom_offer() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (TG_OP='INSERT') then
    perform public.create_notification(NEW.buyer_id, 'offer'::notification_type,
      'New custom offer', 'You received a custom offer for $' || (NEW.price/100.0)::text,
      '/inbox/' || NEW.conversation_id::text);
  elsif (TG_OP='UPDATE' and NEW.status is distinct from OLD.status) then
    perform public.create_notification(NEW.seller_id, 'offer'::notification_type,
      'Offer ' || NEW.status::text, null, '/inbox/' || NEW.conversation_id::text);
  end if;
  return NEW;
end $$;
drop trigger if exists trg_notify_on_custom_offer on public.custom_offers;
create trigger trg_notify_on_custom_offer after insert or update on public.custom_offers
for each row execute function public.notify_on_custom_offer();

-- Notify on cancellation / dispute
create or replace function public.notify_on_cancellation() returns trigger language plpgsql security definer set search_path=public as $$
declare _o record;
begin
  select buyer_id, seller_id, order_number into _o from public.orders where id = NEW.order_id;
  perform public.create_notification(case when NEW.requested_by=_o.buyer_id then _o.seller_id else _o.buyer_id end,
    'order'::notification_type, 'Cancellation requested on ' || _o.order_number, NEW.reason, '/orders/' || NEW.order_id::text);
  return NEW;
end $$;
drop trigger if exists trg_notify_on_cancellation on public.cancellation_requests;
create trigger trg_notify_on_cancellation after insert on public.cancellation_requests
for each row execute function public.notify_on_cancellation();

create or replace function public.notify_on_dispute() returns trigger language plpgsql security definer set search_path=public as $$
declare _o record;
begin
  select buyer_id, seller_id, order_number into _o from public.orders where id = NEW.order_id;
  perform public.create_notification(case when NEW.raised_by=_o.buyer_id then _o.seller_id else _o.buyer_id end,
    'order'::notification_type, 'Dispute opened on ' || _o.order_number, NEW.description, '/orders/' || NEW.order_id::text);
  return NEW;
end $$;
drop trigger if exists trg_notify_on_dispute on public.disputes;
create trigger trg_notify_on_dispute after insert on public.disputes
for each row execute function public.notify_on_dispute();

-- Enable realtime for notifications
alter publication supabase_realtime add table public.notifications;
