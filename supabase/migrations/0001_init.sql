-- Unser Rezeptbuch (Supabase) - Schema + RLS
-- Apply in Supabase SQL editor, or via supabase CLI migrations.

-- Extensions
create extension if not exists pgcrypto;

-- Helpers
create or replace function public.make_join_code()
returns text
language plpgsql
as $$
declare
  chars text[] := array['A','B','C','D','E','F','G','H','J','K','M','N','P','Q','R','S','T','V','W','X','Y','Z','2','3','4','5','6','7','8','9'];
  res text := '';
  i int;
begin
  for i in 1..6 loop
    res := res || chars[1 + floor(random() * array_length(chars,1))::int];
  end loop;
  return res;
end;
$$;

-- Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Recipes
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  portions int null,
  ingredients text not null default '',
  steps text not null default '',
  notes text not null default '',
  photo_path text null,
  is_favorite boolean not null default false,
  tags text[] not null default '{}'::text[],
  last_cooked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_household_idx on public.recipes (household_id);
create index if not exists recipes_updated_idx on public.recipes (updated_at desc);

-- Meal plan: one recipe per day per household
create table if not exists public.meal_plan (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  day date not null,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  status text not null default 'planned' check (status in ('planned','prepped','cooked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, day)
);

create index if not exists meal_plan_household_day_idx on public.meal_plan (household_id, day);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recipes_updated_at on public.recipes;
create trigger trg_recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists trg_meal_plan_updated_at on public.meal_plan;
create trigger trg_meal_plan_updated_at
before update on public.meal_plan
for each row execute function public.set_updated_at();

-- -----------------
-- RLS
-- -----------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plan enable row level security;

-- Helper: membership check that avoids policy recursion
create or replace function public.is_household_member(hid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  return exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = uid
  );
end;
$$;

-- Households: only members can read
create policy households_select_for_members
on public.households
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
);

-- Household members: allow members to read members of their household (avoid recursion)
drop policy if exists household_members_select on public.household_members;
create policy household_members_select
on public.household_members
for select
to authenticated
using (
  public.is_household_member(household_members.household_id)
);

-- Recipes CRUD: members only
create policy recipes_select
on public.recipes
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
);

create policy recipes_insert
on public.recipes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
);

create policy recipes_update
on public.recipes
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
);

create policy recipes_delete
on public.recipes
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = recipes.household_id
      and hm.user_id = auth.uid()
  )
);

-- Meal plan CRUD: members only
create policy meal_plan_select
on public.meal_plan
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = meal_plan.household_id
      and hm.user_id = auth.uid()
  )
);

create policy meal_plan_insert
on public.meal_plan
for insert
to authenticated
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = meal_plan.household_id
      and hm.user_id = auth.uid()
  )
);

create policy meal_plan_update
on public.meal_plan
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = meal_plan.household_id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = meal_plan.household_id
      and hm.user_id = auth.uid()
  )
);

create policy meal_plan_delete
on public.meal_plan
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = meal_plan.household_id
      and hm.user_id = auth.uid()
  )
);

-- -----------------
-- RPCs for Family Mode (no account stress)
-- -----------------

create or replace function public.create_household()
returns table (id uuid, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c text;
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- generate unique join code
  loop
    c := public.make_join_code();
    exit when not exists (select 1 from public.households h where h.join_code = c);
  end loop;

  insert into public.households (join_code)
  values (c)
  returning households.id into hid;

  insert into public.household_members (household_id, user_id)
  values (hid, auth.uid());

  return query select hid, c;
end;
$$;

create or replace function public.join_household(p_join_code text)
returns table (id uuid, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select h.id, h.join_code
    into hid, code
  from public.households h
  where h.join_code = upper(trim(p_join_code));

  if hid is null then
    raise exception 'Code nicht gefunden';
  end if;

  insert into public.household_members (household_id, user_id)
  values (hid, auth.uid())
  on conflict do nothing;

  return query select hid, code;
end;
$$;

grant execute on function public.create_household() to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- -----------------
-- Storage: recipe photos bucket + policies
-- -----------------

-- Create a public bucket (simplest). You can switch to private later.
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do update set public = excluded.public;

-- Policies on storage.objects
-- Only allow members of a household to manage objects under <household_id>/...

create policy recipe_photos_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recipe-photos'
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = (split_part(name, '/', 1))::uuid
      and hm.user_id = auth.uid()
  )
);

create policy recipe_photos_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-photos'
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = (split_part(name, '/', 1))::uuid
      and hm.user_id = auth.uid()
  )
);

create policy recipe_photos_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-photos'
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = (split_part(name, '/', 1))::uuid
      and hm.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'recipe-photos'
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = (split_part(name, '/', 1))::uuid
      and hm.user_id = auth.uid()
  )
);

create policy recipe_photos_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-photos'
  and exists (
    select 1
    from public.household_members hm
    where hm.household_id = (split_part(name, '/', 1))::uuid
      and hm.user_id = auth.uid()
  )
);
