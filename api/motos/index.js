import { getSupabase, send, onlyMethods, handleError } from '../_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  try {
    const db = getSupabase();
    if (req.method === 'GET') {
      const { data, error } = await db.from('motos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return send(res, 200, { data });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (typeof body.modelo !== 'string' || !body.modelo.trim()) return send(res, 400, { error: 'O campo modelo é obrigatório.' });
      const cilindrada = body.cilindrada == null || body.cilindrada === '' ? null : Number(body.cilindrada);
      const consumo = body.consumo_km_l == null || body.consumo_km_l === '' ? null : Number(body.consumo_km_l);
      if ((cilindrada !== null && (!Number.isFinite(cilindrada) || cilindrada <= 0)) || (consumo !== null && (!Number.isFinite(consumo) || consumo <= 0))) return send(res, 400, { error: 'Cilindrada e consumo devem ser números positivos.' });
      const { data, error } = await db.from('motos').insert({ modelo: body.modelo.trim(), cilindrada, consumo_km_l: consumo }).select().single();
      if (error) throw error;
      return send(res, 201, { data });
    }
    return onlyMethods(res, ['GET', 'POST', 'OPTIONS']);
  } catch (e) { return handleError(res, e); }
}
