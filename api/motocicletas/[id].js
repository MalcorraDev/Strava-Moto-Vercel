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
      if (body.consumo_km_l != null && body.consumo_km_l !== '' && !appUser.premium) {
        return send(res, 403, { error: 'O consumo médio e a estimativa de combustível são recursos Premium.' });
      }
      const update = {};
      if (typeof body.modelo === 'string') {
        if (!body.modelo.trim() || body.modelo.trim().length > 80) return send(res, 400, { error: 'Informe um modelo com até 80 caracteres.' });
        update.modelo = body.modelo.trim();
      }
      if (body.cilindrada !== undefined) {
        const value = Number(body.cilindrada);
        if (!Number.isInteger(value) || value < 1 || value > 9999) return send(res, 400, { error: 'Cilindrada deve ficar entre 1 e 9.999 cc.' });
        update.cilindrada = value;
      }
      if (body.consumo_km_l !== undefined) {
        const value = body.consumo_km_l == null || body.consumo_km_l === ''
          ? null
          : Number(body.consumo_km_l);
        if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 100)) {
          return send(res, 400, { error: 'Consumo deve ficar entre 0 e 100 km/L.' });
        }
        update.consumo_km_l = value;
      }
      if (body.placa !== undefined) {
        const normalized = body.placa == null
          ? ''
          : String(body.placa).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const value = normalized || null;
        if (value !== null && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(value)) {
          return send(res, 400, { error: 'Placa inválida. Use o formato ABC1234 ou ABC1D23.' });
        }
        update.placa = value;
      }
      if (body.ano !== undefined) {
        const value = body.ano == null || body.ano === '' ? null : Number(body.ano);
        if (value !== null && (!Number.isInteger(value) || value < 1900 || value > new Date().getFullYear() + 1)) {
          return send(res, 400, { error: 'Ano da motocicleta inválido.' });
        }
        update.ano = value;
      }
      if (body.cor !== undefined) {
        const normalized = body.cor == null ? '' : String(body.cor).trim();
        const value = normalized || null;
        if (value !== null && (value.length < 2 || value.length > 40)) {
          return send(res, 400, { error: 'A cor deve ter entre 2 e 40 caracteres.' });
        }
        update.cor = value;
      }
      if (body.capacidade_tanque_litros !== undefined) {
        const value = body.capacidade_tanque_litros == null || body.capacidade_tanque_litros === ''
          ? null
          : Number(body.capacidade_tanque_litros);
        if (value !== null && (!Number.isFinite(value) || value < 1 || value > 100)) {
          return send(res, 400, { error: 'Capacidade do tanque deve ficar entre 1 e 100 litros.' });
        }
        update.capacidade_tanque_litros = value;
      }
      if (Object.keys(update).length === 0) return send(res, 400, { error: 'Informe ao menos um campo para atualizar.' });

      const { data, error } = await db
        .from('motocicletas')
        .update(update)
        .eq('id', id)
        .eq('usuario_id', appUser.id)
        .select()
        .maybeSingle();
      if (error?.code === '23505') {
        return send(res, 409, { error: 'Já existe uma motocicleta cadastrada com esta placa.' });
      }
      if (error) throw error;
      if (!data) return send(res, 404, { error: 'Motocicleta não encontrada para este usuário.' });
      if (!appUser.premium) delete data.consumo_km_l;
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
