import { requireAppUser, send, onlyMethods, handleError } from '../_lib/supabase.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  const id = String(req.query.id || '');
  if (!uuid.test(id)) return send(res, 400, { error: 'ID da viagem inválido.' });

  try {
    const { db, appUser } = await requireAppUser(req);

    if (req.method === 'DELETE') {
      const { data, error } = await db
        .from('viagens')
        .delete()
        .eq('id', id)
        .eq('usuario_id', appUser.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(res, 404, { error: 'Viagem não encontrada para este usuário.' });
      return send(res, 200, { message: 'Viagem excluída.' });
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      if (Object.hasOwn(body, 'combustivel_estimado_litros') && body.combustivel_estimado_litros != null && !appUser.premium) {
        return send(res, 403, { error: 'A estimativa de combustível é um recurso Premium.' });
      }
      const allowed = [
        'titulo', 'motocicleta_id', 'data_inicio', 'data_fim', 'distancia_km',
        'duracao_segundos', 'tempo_movimento_segundos', 'tempo_parado_segundos',
        'velocidade_media', 'velocidade_maxima', 'combustivel_estimado_litros',
      ];
      const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      if ('titulo' in update) {
        if (typeof update.titulo !== 'string' || !update.titulo.trim()) {
          return send(res, 400, { error: 'O título não pode ficar vazio.' });
        }
        update.titulo = update.titulo.trim();
      }
      if (Object.keys(update).length === 0) return send(res, 400, { error: 'Informe ao menos um campo para atualizar.' });

      for (const field of [
        'distancia_km', 'duracao_segundos', 'tempo_movimento_segundos',
        'tempo_parado_segundos', 'velocidade_media', 'velocidade_maxima',
        'combustivel_estimado_litros',
      ]) {
        if (!(field in update) || update[field] === null) continue;
        const value = Number(update[field]);
        if (!Number.isFinite(value) || value < 0) {
          return send(res, 400, { error: `${field} deve ser um número não negativo.` });
        }
        update[field] = value;
      }

      if (update.motocicleta_id) {
        const bikeId = String(update.motocicleta_id);
        if (!uuid.test(bikeId)) return send(res, 400, { error: 'Motocicleta inválida.' });
        const { data: bike, error } = await db
          .from('motocicletas')
          .select('id')
          .eq('id', bikeId)
          .eq('usuario_id', appUser.id)
          .maybeSingle();
        if (error) throw error;
        if (!bike) return send(res, 400, { error: 'A motocicleta não pertence a este usuário.' });
      }

      const { data, error } = await db
        .from('viagens')
        .update(update)
        .eq('id', id)
        .eq('usuario_id', appUser.id)
        .select('*, motocicletas(id, modelo)')
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(res, 404, { error: 'Viagem não encontrada para este usuário.' });
      if (!appUser.premium) delete data.combustivel_estimado_litros;
      return send(res, 200, { data });
    }

    return onlyMethods(res, ['PATCH', 'DELETE', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
