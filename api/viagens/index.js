import { requireAppUser, send, onlyMethods, handleError } from '../_lib/supabase.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  try {
    const { db, appUser } = await requireAppUser(req);

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('viagens')
        .select('*, motocicletas(id, modelo)')
        .eq('usuario_id', appUser.id)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return send(res, 200, { data });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (typeof body.titulo !== 'string' || !body.titulo.trim()) {
        return send(res, 400, { error: 'O título é obrigatório.' });
      }

      const row = { usuario_id: appUser.id, titulo: body.titulo.trim() };
      for (const field of [
        'distancia_km', 'duracao_segundos', 'tempo_movimento_segundos',
        'tempo_parado_segundos', 'velocidade_media', 'velocidade_maxima',
      ]) {
        if (body[field] === undefined || body[field] === null || body[field] === '') continue;
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return send(res, 400, { error: `${field} deve ser um número não negativo.` });
        }
        row[field] = value;
      }

      if (body.motocicleta_id) {
        const bikeId = String(body.motocicleta_id);
        if (!uuid.test(bikeId)) return send(res, 400, { error: 'Motocicleta inválida.' });
        const { data: bike, error } = await db
          .from('motocicletas')
          .select('id')
          .eq('id', bikeId)
          .eq('usuario_id', appUser.id)
          .maybeSingle();
        if (error) throw error;
        if (!bike) return send(res, 400, { error: 'A motocicleta não pertence a este usuário.' });
        row.motocicleta_id = bike.id;
      }

      if (body.data_inicio) row.data_inicio = body.data_inicio;
      if (body.data_fim) row.data_fim = body.data_fim;

      const { data, error } = await db
        .from('viagens')
        .insert(row)
        .select('*, motocicletas(id, modelo)')
        .single();
      if (error) throw error;
      return send(res, 201, { data });
    }

    return onlyMethods(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
