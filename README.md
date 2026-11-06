# Strava Motos API — integração com o esquema existente

Endpoints: `GET/POST /api/motocicletas`, `PATCH/DELETE /api/motocicletas/:id`, `GET/POST /api/viagens`, `PATCH/DELETE /api/viagens/:id`, `GET /api/usuarios/:id`. Usa as tabelas existentes `usuarios`, `motocicletas` e `viagens`; não executa migrações nem cria tabelas.

Variáveis Vercel necessárias: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a service-role key no Flutter.

## Autenticação

Antes de publicar esta versão, aplique `supabase/migrations/202611060001_auth_user_mapping.sql` no SQL Editor do Supabase. A API valida o access token Supabase enviado no cabeçalho `Authorization: Bearer ...`, associa o usuário a `public.usuarios.auth_user_id` e deriva o `usuario_id` no servidor. O cliente não deve enviar um `usuario_id` como prova de identidade.

O primeiro acesso cria um perfil em `public.usuarios` quando não houver perfil vinculado. A associação da conta atual preserva o UUID existente do perfil e, portanto, as motos e viagens relacionadas.

**Atenção de segurança:** a service-role key continua apenas no servidor. As rotas principais de motos e viagens agora validam o JWT e filtram pelos registros do perfil autenticado. Não habilite novamente as rotas legadas `/api/motos` e `/api/rotas` sem acrescentar vínculo e autorização por usuário.
