import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const err = new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel.');
    err.status = 500;
    throw err;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function findAppUser(db, authUser) {
  const columns = 'id,auth_user_id,nome,email,foto_url,premium,criado_em';
  const byAuthId = await db
    .from('usuarios')
    .select(columns)
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (byAuthId.error) throw byAuthId.error;
  if (byAuthId.data) return byAuthId.data;

  const email = authUser.email?.trim().toLowerCase();
  if (!email) throw httpError(403, 'A conta autenticada não tem um e-mail associado.');

  // Preserve an existing application profile when its verified e-mail matches.
  const byEmail = await db.from('usuarios').select(columns).eq('email', authUser.email).maybeSingle();
  if (byEmail.error) throw byEmail.error;
  if (byEmail.data) {
    if (byEmail.data.auth_user_id && byEmail.data.auth_user_id !== authUser.id) {
      throw httpError(409, 'Este perfil já está vinculado a outra conta.');
    }
    if (!byEmail.data.auth_user_id) {
      const linked = await db
        .from('usuarios')
        .update({ auth_user_id: authUser.id })
        .eq('id', byEmail.data.id)
        .is('auth_user_id', null)
        .select(columns)
        .maybeSingle();
      if (linked.error) throw linked.error;
      if (linked.data) return linked.data;

      const raced = await db.from('usuarios').select(columns).eq('auth_user_id', authUser.id).maybeSingle();
      if (raced.error) throw raced.error;
      if (raced.data) return raced.data;
      throw httpError(409, 'Não foi possível vincular o perfil à conta autenticada.');
    }
    return byEmail.data;
  }

  const metadata = authUser.user_metadata || {};
  const googleIdentity = authUser.identities?.find((identity) => identity.provider === 'google');
  const googleId = googleIdentity?.identity_data?.sub
    || googleIdentity?.identityData?.sub
    || metadata.sub
    || authUser.id;
  const profile = {
    id: randomUUID(),
    auth_user_id: authUser.id,
    nome: metadata.full_name || metadata.name || email.split('@')[0],
    email,
    foto_url: metadata.avatar_url || metadata.picture || null,
    google_id: String(googleId),
    premium: false,
  };

  const created = await db.from('usuarios').insert(profile).select(columns).single();
  if (!created.error) return created.data;

  // Concurrent first requests can race to create the profile. Re-read on conflict.
  if (created.error.code === '23505') {
    const raced = await db.from('usuarios').select(columns).eq('auth_user_id', authUser.id).maybeSingle();
    if (raced.error) throw raced.error;
    if (raced.data) return raced.data;
  }
  throw created.error;
}

export async function requireAppUser(req) {
  const authorization = req.headers.authorization || req.headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw httpError(401, 'Sessão ausente. Entre novamente com o Google.');

  const db = getSupabase();
  const { data, error } = await db.auth.getUser(match[1]);
  if (error || !data.user) throw httpError(401, 'Sessão inválida ou expirada. Entre novamente com o Google.');

  try {
    const appUser = await findAppUser(db, data.user);
    return { db, authUser: data.user, appUser };
  } catch (error) {
    if (error.code === '42703' || error.code === 'PGRST204') {
      throw httpError(500, 'Aplique a migração de autenticação da API no Supabase antes de continuar.');
    }
    throw error;
  }
}

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(status).json(body);
}

export function onlyMethods(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return send(res, 405, { error: `Método não permitido. Use: ${methods.join(', ')}` });
}

export function handleError(res, error) {
  // Avoid returning internal stack traces to clients.
  const status = error.status || 500;
  const message = status >= 500 && !error.status ? 'Erro interno da API.' : error.message;
  return send(res, status, { error: message || 'Erro interno da API.' });
}
