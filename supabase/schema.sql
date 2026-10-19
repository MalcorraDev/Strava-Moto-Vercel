-- Execute no SQL Editor do Supabase antes de testar a API.
create extension if not exists pgcrypto;

create table if not exists public.motos (
  id uuid primary key default gen_random_uuid(),
  modelo text not null check (length(trim(modelo)) > 0),
  cilindrada integer check (cilindrada is null or cilindrada > 0),
  consumo_km_l numeric(7,2) check (consumo_km_l is null or consumo_km_l > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rotas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  distancia_km numeric(10,2) not null default 0 check (distancia_km >= 0),
  duracao_segundos integer not null default 0 check (duracao_segundos >= 0),
  velocidade_media numeric(7,2) not null default 0 check (velocidade_media >= 0),
  velocidade_maxima numeric(7,2) not null default 0 check (velocidade_maxima >= 0),
  tempo_movimento_segundos integer not null default 0 check (tempo_movimento_segundos >= 0),
  tempo_parado_segundos integer not null default 0 check (tempo_parado_segundos >= 0),
  moto_id uuid references public.motos(id) on delete set null,
  data_percurso timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rotas_data_percurso_idx on public.rotas(data_percurso desc);
create index if not exists rotas_moto_id_idx on public.rotas(moto_id);

-- A API usa a service_role key no servidor; nunca coloque essa chave no Flutter.
-- Para esta entrega acadêmica, mantenha a service role somente nas Environment Variables da Vercel.
