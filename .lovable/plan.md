## Seed 6 test accounts

Create auth users + profiles for the test buyers, sellers, and admin you listed. Sellers get approved status, skills, category, river score, and a starter gig matching their price/delivery.

### What gets created

**Auth users** (via SQL insert into `auth.users` with bcrypt-hashed passwords, email auto-confirmed so they can log in immediately):
- buyer1@test.katexs.com / buyer2@test.katexs.com — role `client`
- seller1/2/3@test.katexs.com — role `seller`
- admin@test.katexs.com — role `admin`

The existing `handle_new_user` trigger will auto-create matching `profiles` rows and `seller_accounts` for the sellers from `raw_user_meta_data`.

**Profile updates** (post-trigger):
- Sellers → `seller_status = 'approved'`, `seller_skills`, `primary_category`, `river_score`
- Admin → `role = 'admin'` (override default `client` since the trigger only honors `client`/`seller`)

**Starter gig per seller** (so they're discoverable in browse/search):
| Seller | Title | Category | Price | Delivery |
|---|---|---|---|---|
| Seller One | Voice AI assistant setup | Sound and Speak with AI | $150 | 3d |
| Seller Two | AI automation workflows | Run with AI | $100 | 5d |
| Seller Three | AI-written copy & content | Write with AI | $75 | 2d |

### Technical notes

- One `supabase--migration` call: inserts into `auth.users` + `auth.identities`, runs profile updates, inserts gigs. Passwords hashed with `crypt(pw, gen_salt('bf'))`.
- `email_confirmed_at = now()` so no verification email needed.
- Uses `ON CONFLICT (email) DO NOTHING` so re-running is safe.
- No app code changes, no schema changes.

Ready to run on approval.