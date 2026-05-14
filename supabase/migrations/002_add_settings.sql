-- Add settings JSONB column to profiles
alter table public.profiles
  add column if not exists settings jsonb default '{
    "tone": "auto",
    "structure_type": "chronological",
    "point_of_view": "first_person",
    "chapter_length": "medium",
    "topics_to_avoid": ""
  }'::jsonb;
