import { getSupabase, send, onlyMethods, handleError } from '../_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  const { id } = req.query;
  if (!id) return send(res, 400, { error: 'ID da moto não informado.' });
  try {
    const db = getSupabase();
    if (req.method === 'PATCH') {
      const body = req.body || {}; const update = {};
      if ('modelo' in body) { if (typeof body.modelo !== 'string' || !body.modelo.trim()) return send(res, 400, { error: 'Modelo não pode ficar vazio.' }); update.modelo = body.modelo.trim(); }
      if ('cilindrada' in body) update.cilindrada = body.cilindrada === '' || body.cilindrada == null ? null : Number(body.cilindrada);
      if ('consumo_km_l' in body) update.consumo_km_l = body.consumo_km_l === '' || body.consumo_km_l == null ? null : Number(body.consumo_km_l);
      for (const field of ['cilindrada', 'consumo_km_l']) if (update[field] != null && (!Number.isFinite(update[field]) || update[field] <= 0)) return send(res, 400, { error: `${field} deve ser um número positivo.` });
      const { data, error } = await db.from('motos').update(update).eq('id', id).select().maybeSingle();
      if (error) throw error; if (!data) return send(res, 404, { error: 'Moto não encontrada.' });
      return send(res, 200, { data });
    }
    if (req.method === 'DELETE') {
      const { data, error } = await db.from('motos').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw error; if (!data) return send(res, 404, { error: 'Moto não encontrada.' });
      return send(res, 200, { message: 'Moto excluída com sucesso.' });
    }
    return onlyMethods(res, ['PATCH', 'DELETE', 'OPTIONS']);
  } catch (e) { return handleError(res, e); }
}
