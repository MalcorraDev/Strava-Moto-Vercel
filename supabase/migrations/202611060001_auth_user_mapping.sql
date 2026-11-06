-- Links a public application profile to its verified Supabase Auth account.
-- Existing public.usuarios.id values remain unchanged, preserving related records.
alter table public.usuarios
  add column if not exists auth_user_id uuid
  references auth.users(id) on delete set null;

create unique index if not exists usuarios_auth_user_id_unique
  on public.usuarios(auth_user_id)
  where auth_user_id is not null;
