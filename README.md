# Strava Motos API — integração com o esquema existente

Endpoints: `GET/POST /api/motocicletas`, `PATCH/DELETE /api/motocicletas/:id`, `GET/POST /api/viagens`, `PATCH/DELETE /api/viagens/:id`, `GET /api/usuarios/:id`. Usa as tabelas existentes `usuarios`, `motocicletas` e `viagens`; não executa migrações nem cria tabelas.

Variáveis Vercel necessárias: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a service-role key no Flutter.

**Atenção de segurança:** estes endpoints usam a service-role key e recebem `usuario_id` do cliente. A filtragem impede operações acidentais entre usuários, mas não substitui autenticação: antes de usar com dados reais/publicamente, valide o JWT Supabase no backend e derive o usuário do token, em vez de confiar no `usuario_id` enviado pelo cliente.
