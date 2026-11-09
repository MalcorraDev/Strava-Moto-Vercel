import { requireAppUser, send, onlyMethods, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'GET') return onlyMethods(res, ['GET', 'OPTIONS']);

  try {
    const { db, authUser, appUser } = await requireAppUser(req);
    const metadata = authUser.user_metadata || {};
    const googleName = String(metadata.full_name || metadata.name || '').trim();
    const placeholderName = !appUser.nome || /^(usuario teste|usuário teste|nome não informado)$/i.test(appUser.nome.trim());
    let profile = appUser;
    if (googleName && placeholderName) {
      const { data, error } = await db
        .from('usuarios')
        .update({ nome: googleName })
        .eq('id', appUser.id)
        .select('id,nome,email,foto_url,premium,criado_em')
        .single();
      if (error) throw error;
      profile = data;
    }
    const { id, nome, email, foto_url, premium, criado_em } = profile;
    return send(res, 200, { data: { id, nome, email, foto_url, premium, criado_em } });
  } catch (error) {
    return handleError(res, error);
  }
}
