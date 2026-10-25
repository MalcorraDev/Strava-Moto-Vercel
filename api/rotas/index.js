import { getSupabase, send, onlyMethods, handleError } from '../_lib/supabase.js';
const fields = ['titulo','distancia_km','duracao_segundos','velocidade_media','velocidade_maxima','tempo_movimento_segundos','tempo_parado_segundos','moto_id','data_percurso'];
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  try {
    const db = getSupabase();
    if (req.method === 'GET') {
      const { data, error } = await db.from('rotas').select('*, motos(id, modelo)').order('created_at', { ascending: false });
      if (error) throw error; return send(res, 200, { data });
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      if (typeof b.titulo !== 'string' || !b.titulo.trim()) return send(res, 400, { error: 'O campo titulo é obrigatório.' });
      const row = { titulo: b.titulo.trim() };
      for (const f of fields.filter(x => !['titulo','moto_id','data_percurso'].includes(x))) { const n = b[f] == null || b[f] === '' ? 0 : Number(b[f]); if (!Number.isFinite(n) || n < 0) return send(res, 400, { error: `${f} deve ser um número igual ou maior que zero.` }); row[f] = n; }
      row.moto_id = b.moto_id || null; if (b.data_percurso) row.data_percurso = b.data_percurso;
      const { data, error } = await db.from('rotas').insert(row).select('*, motos(id, modelo)').single();
      if (error) throw error; return send(res, 201, { data });
    }
    return onlyMethods(res, ['GET', 'POST', 'OPTIONS']);
  } catch (e) { return handleError(res, e); }
}
