-- Track 4 (Supabase Auth) — Profile auto-create trigger
--
-- This migration is DEFERRED from Track 4 because supabase/migrations/ is
-- owned by Track 0.  Apply this SQL manually via the Supabase dashboard SQL
-- editor or add it as a new migration file once Track 0 ownership is relaxed.
--
-- Trigger: auto-create an empty profiles row when auth.users gets a new entry.
-- This fires AFTER INSERT so the auth.users row is committed and the FK is valid.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, goal)
  values (new.id, 'maintain')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Drop and recreate so this migration is idempotent.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
