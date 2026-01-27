-- Cook feedback per household + recipe

create table if not exists public.cook_feedback (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  day date not null,
  score smallint not null check (score in (1, -1)),
  created_at timestamptz not null default now()
);

create index if not exists cook_feedback_household_idx on public.cook_feedback (household_id);
create index if not exists cook_feedback_household_recipe_idx on public.cook_feedback (household_id, recipe_id);
create index if not exists cook_feedback_created_idx on public.cook_feedback (created_at desc);

alter table public.cook_feedback enable row level security;

create policy cook_feedback_select
on public.cook_feedback
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = cook_feedback.household_id
      and hm.user_id = auth.uid()
  )
);

create policy cook_feedback_insert
on public.cook_feedback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = cook_feedback.household_id
      and hm.user_id = auth.uid()
  )
);

create policy cook_feedback_delete
on public.cook_feedback
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = cook_feedback.household_id
      and hm.user_id = auth.uid()
  )
);
