import { requireAppUser, send, onlyMethods, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  try {
    const { db, appUser } = await requireAppUser(req);

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('motocicletas')
        .select('*')
        .eq('usuario_id', appUser.id)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return send(res, 200, { data });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (typeof body.modelo !== 'string' || !body.modelo.trim()) {
        return send(res, 400, { error: 'O modelo é obrigatório.' });
      }

      const cilindrada = Number(body.cilindrada);
      const consumo = body.consumo_km_l == null || body.consumo_km_l === ''
        ? null
        : Number(body.consumo_km_l);
      if (!Number.isInteger(cilindrada) || cilindrada <= 0) {
        return send(res, 400, { error: 'Cilindrada deve ser um inteiro positivo.' });
      }
      if (consumo !== null && (!Number.isFinite(consumo) || consumo <= 0)) {
        return send(res, 400, { error: 'Consumo deve ser positivo.' });
      }

      const { data, error } = await db
        .from('motocicletas')
        .insert({
          usuario_id: appUser.id,
          modelo: body.modelo.trim(),
          cilindrada,
          consumo_km_l: consumo,
        })
        .select()
        .single();
      if (error) throw error;
      return send(res, 201, { data });
    }

    return onlyMethods(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
