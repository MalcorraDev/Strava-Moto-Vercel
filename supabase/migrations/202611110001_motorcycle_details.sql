alter table public.motocicletas
  add column if not exists placa text,
  add column if not exists ano integer,
  add column if not exists cor text,
  add column if not exists capacidade_tanque_litros numeric(5,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'motocicletas_ano_check'
      and conrelid = 'public.motocicletas'::regclass
  ) then
    alter table public.motocicletas
      add constraint motocicletas_ano_check
      check (ano is null or ano between 1900 and 2100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'motocicletas_capacidade_tanque_check'
      and conrelid = 'public.motocicletas'::regclass
  ) then
    alter table public.motocicletas
      add constraint motocicletas_capacidade_tanque_check
      check (capacidade_tanque_litros is null or capacidade_tanque_litros between 1 and 100);
  end if;
end $$;

create unique index if not exists motocicletas_usuario_placa_unique
  on public.motocicletas (usuario_id, upper(regexp_replace(placa, '[^A-Za-z0-9]', '', 'g')))
  where placa is not null and btrim(placa) <> '';
