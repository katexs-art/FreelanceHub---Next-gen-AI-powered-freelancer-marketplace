-- Clean orphan rows that reference deleted profiles/conversations, then add FK constraints

-- 1) Delete orphan messages and conversations referencing non-existent profiles
DELETE FROM public.messages m
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.sender_id)
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.recipient_id);

DELETE FROM public.conversations c
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.participant_one)
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.participant_two);

-- Cascade-clean any messages now pointing at a deleted conversation
DELETE FROM public.messages m
 WHERE NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = m.conversation_id);

-- 2) Add foreign keys (idempotent: drop if exists, then add)
DO $$
DECLARE
  r record;
  fks text[][] := ARRAY[
    ['orders','buyer_id','profiles','id','CASCADE','orders_buyer_id_fkey'],
    ['orders','seller_id','profiles','id','CASCADE','orders_seller_id_fkey'],
    ['orders','gig_id','gigs','id','SET NULL','orders_gig_id_fkey'],
    ['orders','package_id','gig_packages','id','SET NULL','orders_package_id_fkey'],
    ['bids','seller_id','profiles','id','CASCADE','bids_seller_id_fkey'],
    ['bids','project_id','project_posts','id','CASCADE','bids_project_id_fkey'],
    ['notifications','user_id','profiles','id','CASCADE','notifications_user_id_fkey'],
    ['reviews','buyer_id','profiles','id','CASCADE','reviews_buyer_id_fkey'],
    ['reviews','seller_id','profiles','id','CASCADE','reviews_seller_id_fkey'],
    ['reviews','order_id','orders','id','CASCADE','reviews_order_id_fkey'],
    ['messages','sender_id','profiles','id','CASCADE','messages_sender_id_fkey'],
    ['messages','recipient_id','profiles','id','CASCADE','messages_recipient_id_fkey'],
    ['messages','conversation_id','conversations','id','CASCADE','messages_conversation_id_fkey'],
    ['conversations','participant_one','profiles','id','CASCADE','conversations_p1_fkey'],
    ['conversations','participant_two','profiles','id','CASCADE','conversations_p2_fkey']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(fks, 1) LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', fks[i][1], fks[i][6]);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE %s',
      fks[i][1], fks[i][6], fks[i][2], fks[i][3], fks[i][4], fks[i][5]
    );
  END LOOP;
END $$;