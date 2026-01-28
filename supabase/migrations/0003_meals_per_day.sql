-- Migration: Configurable meals per day
-- Allows households to set how many meals they plan per day (1-4, default 2)

-- 1. Add meals_per_day setting to households
alter table public.households
  add column if not exists meals_per_day smallint not null default 2
  constraint meals_per_day_range check (meals_per_day >= 1 and meals_per_day <= 4);

-- 2. Add meal_slot to meal_plan (0 = first meal, 1 = second, etc.)
-- First drop the old unique constraint
alter table public.meal_plan
  drop constraint if exists meal_plan_household_id_day_key;

-- Add the slot column
alter table public.meal_plan
  add column if not exists meal_slot smallint not null default 0
  constraint meal_slot_range check (meal_slot >= 0 and meal_slot < 4);

-- Create new unique constraint including slot
alter table public.meal_plan
  add constraint meal_plan_household_day_slot_key unique (household_id, day, meal_slot);

-- 3. Update RLS policy: members can update their household's meals_per_day
drop policy if exists households_update_for_members on public.households;
create policy households_update_for_members
on public.households
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = auth.uid()
  )
);

-- 4. Extend getHousehold to include meals_per_day (handled via select in app)

-- 5. Index for efficient lookup
create index if not exists meal_plan_household_day_slot_idx 
  on public.meal_plan (household_id, day, meal_slot);
