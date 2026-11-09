-- Stores the recorded route for each trip as a JSON array of GPS samples.
alter table public.viagens
  add column if not exists pontos_gps jsonb not null default '[]'::jsonb;
