-- Update weekly_schedules table to use time windows instead of exact times
ALTER TABLE weekly_schedules 
ADD COLUMN time_windows text[] DEFAULT '{}';

-- Drop old time columns
ALTER TABLE weekly_schedules 
DROP COLUMN start_time,
DROP COLUMN end_time;

-- Add check constraint to ensure valid time windows
ALTER TABLE weekly_schedules
ADD CONSTRAINT valid_time_windows 
CHECK (
  time_windows <@ ARRAY['morning', 'afternoon', 'evening']::text[]
);