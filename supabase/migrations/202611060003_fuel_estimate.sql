alter table public.viagens
  add column if not exists combustivel_estimado_litros numeric(10, 3)
  check (combustivel_estimado_litros is null or combustivel_estimado_litros >= 0);
