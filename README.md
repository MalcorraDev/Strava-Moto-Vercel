# Strava Motos API — integração com o esquema existente

Endpoints: `GET/POST /api/motocicletas`, `PATCH/DELETE /api/motocicletas/:id`, `GET/POST /api/viagens`, `PATCH/DELETE /api/viagens/:id`, `GET /api/usuarios/me`, and test-only `POST /api/premium/test`. Uses the existing `usuarios`, `motocicletas`, and `viagens` tables.

Variáveis Vercel necessárias: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a service-role key no Flutter.

## Premium de teste (R$ 0,00)

O entitlement de teste é uma liberação de demonstração, não uma cobrança. Para habilitar, configure na Vercel (Settings > Environment Variables, Production e Preview se necessário):

- `PREMIUM_TEST_MODE=true`
- `PREMIUM_TEST_EMAILS=email-google-autorizado@example.com` (comma-separated allowlist)

Depois, faça um novo deploy da API. No Perfil do app, só contas autenticadas com e-mail confirmado e presente na allowlist conseguem ativar o Premium de teste. O endpoint grava `usuarios.premium = true`; mudar uma variável no cliente não libera os recursos. Para encerrar o teste, remova `PREMIUM_TEST_MODE` e faça redeploy; para revogar acesso já concedido, defina `usuarios.premium = false` no perfil de teste no Supabase. Este fluxo não deve ser usado como cobrança de produção.

## Cobrança de produção

Recomendação para o Flutter: RevenueCat, usando Google Play Billing no Android e App Store In-App Purchase no iOS, com entitlement verificado pelo servidor/webhook antes de atualizar `usuarios.premium`. RevenueCat também oferece Test Store para testar compras sem conectar as lojas. A ativação manual acima é apenas para demonstração rápida e controlada.

## Autenticação

Antes de publicar esta versão, aplique `supabase/migrations/202611060001_auth_user_mapping.sql` no SQL Editor do Supabase. A API valida o access token Supabase enviado no cabeçalho `Authorization: Bearer ...`, associa o usuário a `public.usuarios.auth_user_id` e deriva o `usuario_id` no servidor. O cliente não deve enviar um `usuario_id` como prova de identidade.

O primeiro acesso cria um perfil em `public.usuarios` quando não houver perfil vinculado. A associação da conta atual preserva o UUID existente do perfil e, portanto, as motos e viagens relacionadas.

**Atenção de segurança:** a service-role key continua apenas no servidor. As rotas principais de motos e viagens agora validam o JWT e filtram pelos registros do perfil autenticado. Não habilite novamente as rotas legadas `/api/motos` e `/api/rotas` sem acrescentar vínculo e autorização por usuário.
