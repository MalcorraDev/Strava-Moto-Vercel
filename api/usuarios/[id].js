import { requireAppUser, send, onlyMethods, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'GET') return onlyMethods(res, ['GET', 'OPTIONS']);

  try {
    const { appUser } = await requireAppUser(req);
    const { id, nome, email, foto_url, premium, criado_em } = appUser;
    return send(res, 200, { data: { id, nome, email, foto_url, premium, criado_em } });
  } catch (error) {
    return handleError(res, error);
  }
}
