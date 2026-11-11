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
      const visibleData = appUser.premium
        ? data
        : data.map(({ consumo_km_l, ...bike }) => bike);
      return send(res, 200, { data: visibleData });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.consumo_km_l != null && body.consumo_km_l !== '' && !appUser.premium) {
        return send(res, 403, { error: 'O consumo médio e a estimativa de combustível são recursos Premium.' });
      }
      if (typeof body.modelo !== 'string' || !body.modelo.trim() || body.modelo.trim().length > 80) {
        return send(res, 400, { error: 'Informe um modelo com até 80 caracteres.' });
      }

      const cilindrada = Number(body.cilindrada);
      const consumo = body.consumo_km_l == null || body.consumo_km_l === ''
        ? null
        : Number(body.consumo_km_l);
      if (!Number.isInteger(cilindrada) || cilindrada < 1 || cilindrada > 9999) {
        return send(res, 400, { error: 'Cilindrada deve ser um inteiro entre 1 e 9.999 cc.' });
      }
      if (consumo !== null && (!Number.isFinite(consumo) || consumo <= 0 || consumo > 100)) {
        return send(res, 400, { error: 'Consumo deve ficar entre 0 e 100 km/L.' });
      }

      const normalizedPlate = body.placa == null
        ? ''
        : String(body.placa).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const placa = normalizedPlate || null;
      if (placa !== null && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) {
        return send(res, 400, { error: 'Placa inválida. Use o formato ABC1234 ou ABC1D23.' });
      }
      const ano = body.ano == null || body.ano === '' ? null : Number(body.ano);
      if (ano !== null && (!Number.isInteger(ano) || ano < 1900 || ano > new Date().getFullYear() + 1)) {
        return send(res, 400, { error: 'Ano da motocicleta inválido.' });
      }
      const capacidade = body.capacidade_tanque_litros == null || body.capacidade_tanque_litros === ''
        ? null
        : Number(body.capacidade_tanque_litros);
      if (capacidade !== null && (!Number.isFinite(capacidade) || capacidade < 1 || capacidade > 100)) {
        return send(res, 400, { error: 'Capacidade do tanque deve ficar entre 1 e 100 litros.' });
      }
      const normalizedColor = body.cor == null ? '' : String(body.cor).trim();
      const cor = normalizedColor || null;
      if (cor !== null && (cor.length < 2 || cor.length > 40)) {
        return send(res, 400, { error: 'A cor deve ter entre 2 e 40 caracteres.' });
      }

      const { data, error } = await db
        .from('motocicletas')
        .insert({
          usuario_id: appUser.id,
          modelo: body.modelo.trim(),
          cilindrada,
          consumo_km_l: consumo,
          placa,
          ano,
          cor,
          capacidade_tanque_litros: capacidade,
        })
        .select()
        .single();
      if (error?.code === '23505') {
        return send(res, 409, { error: 'Já existe uma motocicleta cadastrada com esta placa.' });
      }
      if (error) throw error;
      return send(res, 201, { data });
    }

    return onlyMethods(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
