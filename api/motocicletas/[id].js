import { requireAppUser, send, onlyMethods, handleError } from '../_lib/supabase.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  const id = String(req.query.id || '');
  if (!uuid.test(id)) return send(res, 400, { error: 'ID da motocicleta inválido.' });

  try {
    const { db, appUser } = await requireAppUser(req);

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const update = {};
      if (typeof body.modelo === 'string') {
        if (!body.modelo.trim()) return send(res, 400, { error: 'O modelo não pode ficar vazio.' });
        update.modelo = body.modelo.trim();
      }
      if (body.cilindrada !== undefined) {
        const value = Number(body.cilindrada);
        if (!Number.isInteger(value) || value <= 0) return send(res, 400, { error: 'Cilindrada inválida.' });
        update.cilindrada = value;
      }
      if (body.consumo_km_l !== undefined) {
        const value = body.consumo_km_l == null || body.consumo_km_l === ''
          ? null
          : Number(body.consumo_km_l);
        if (value !== null && (!Number.isFinite(value) || value <= 0)) {
          return send(res, 400, { error: 'Consumo inválido.' });
        }
        update.consumo_km_l = value;
      }
      if (Object.keys(update).length === 0) return send(res, 400, { error: 'Informe ao menos um campo para atualizar.' });

      const { data, error } = await db
        .from('motocicletas')
        .update(update)
        .eq('id', id)
        .eq('usuario_id', appUser.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(res, 404, { error: 'Motocicleta não encontrada para este usuário.' });
      return send(res, 200, { data });
    }

    if (req.method === 'DELETE') {
      const { data, error } = await db
        .from('motocicletas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', appUser.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) return send(res, 404, { error: 'Motocicleta não encontrada para este usuário.' });
      return send(res, 200, { message: 'Motocicleta excluída.' });
    }

    return onlyMethods(res, ['PATCH', 'DELETE', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
