-- Replace meals_per_day with enabled_slots (JSON array of slot indices)
-- Slots: 0=Frühstück, 1=Mittag, 2=Abend, 3=Snack

ALTER TABLE households ADD COLUMN enabled_slots TEXT DEFAULT '[2]';

-- Migrate existing data
UPDATE households SET enabled_slots = 
  CASE meals_per_day
    WHEN 1 THEN '[2]'
    WHEN 2 THEN '[1,2]'
    WHEN 3 THEN '[0,1,2]'
    WHEN 4 THEN '[0,1,2,3]'
    ELSE '[2]'
  END
WHERE meals_per_day IS NOT NULL;

-- Default for new households: just dinner (Abend)
ALTER TABLE households ALTER COLUMN enabled_slots SET DEFAULT '[2]';
