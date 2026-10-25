import { getSupabase, send, onlyMethods, handleError } from '../_lib/supabase.js';
const allowed = ['titulo','distancia_km','duracao_segundos','velocidade_media','velocidade_maxima','tempo_movimento_segundos','tempo_parado_segundos','moto_id','data_percurso'];
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  const { id } = req.query; if (!id) return send(res, 400, { error: 'ID da rota não informado.' });
  try {
    const db = getSupabase();
    if (req.method === 'GET') { const { data, error } = await db.from('rotas').select('*, motos(id, modelo)').eq('id', id).maybeSingle(); if (error) throw error; if (!data) return send(res, 404, { error: 'Rota não encontrada.' }); return send(res, 200, { data }); }
    if (req.method === 'PATCH') {
      const b = req.body || {}; const update = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)));
      if ('titulo' in update && (typeof update.titulo !== 'string' || !update.titulo.trim())) return send(res, 400, { error: 'Título não pode ficar vazio.' });
      for (const f of ['distancia_km','duracao_segundos','velocidade_media','velocidade_maxima','tempo_movimento_segundos','tempo_parado_segundos']) if (f in update) { update[f] = Number(update[f]); if (!Number.isFinite(update[f]) || update[f] < 0) return send(res, 400, { error: `${f} deve ser um número igual ou maior que zero.` }); }
      const { data, error } = await db.from('rotas').update(update).eq('id', id).select('*, motos(id, modelo)').maybeSingle(); if (error) throw error; if (!data) return send(res, 404, { error: 'Rota não encontrada.' }); return send(res, 200, { data });
    }
    if (req.method === 'DELETE') { const { data, error } = await db.from('rotas').delete().eq('id', id).select('id').maybeSingle(); if (error) throw error; if (!data) return send(res, 404, { error: 'Rota não encontrada.' }); return send(res, 200, { message: 'Rota excluída com sucesso.' }); }
    return onlyMethods(res, ['GET','PATCH','DELETE','OPTIONS']);
  } catch (e) { return handleError(res, e); }
}
