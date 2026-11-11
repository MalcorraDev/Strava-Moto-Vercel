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
      const visibleData = appUser.premium
        ? data
        : data.map(({ combustivel_estimado_litros, ...trip }) => trip);
      return send(res, 200, { data: visibleData });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.combustivel_estimado_litros != null && !appUser.premium) {
        return send(res, 403, { error: 'A estimativa de combustível é um recurso Premium.' });
      }
      if (typeof body.titulo !== 'string' || !body.titulo.trim()) {
        return send(res, 400, { error: 'O título é obrigatório.' });
      }

      const row = { usuario_id: appUser.id, titulo: body.titulo.trim() };
      for (const field of [
        'distancia_km', 'duracao_segundos', 'tempo_movimento_segundos',
        'tempo_parado_segundos', 'velocidade_media', 'velocidade_maxima',
        'combustivel_estimado_litros',
      ]) {
        if (body[field] === undefined || body[field] === null || body[field] === '') continue;
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return send(res, 400, { error: `${field} deve ser um número não negativo.` });
        }
        row[field] = value;
      }

      if (body.pontos_gps !== undefined) {
        if (!Array.isArray(body.pontos_gps) || body.pontos_gps.length > 20000) {
          return send(res, 400, { error: 'pontos_gps deve ser uma lista com até 20.000 pontos.' });
        }
        const points = [];
        for (const point of body.pontos_gps) {
          const latitude = Number(point?.latitude);
          const longitude = Number(point?.longitude);
          const accuracy = Number(point?.accuracy_m);
          const speed = Number(point?.speed_kmh);
          if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
              !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
              !Number.isFinite(accuracy) || accuracy < 0 ||
              !Number.isFinite(speed) || speed < 0) {
            return send(res, 400, { error: 'Um ponto GPS contém coordenadas ou métricas inválidas.' });
          }
          const timestamp = new Date(point.timestamp);
          if (!point.timestamp || Number.isNaN(timestamp.getTime())) {
            return send(res, 400, { error: 'Um ponto GPS contém data inválida.' });
          }
          points.push({ latitude, longitude, accuracy_m: accuracy, speed_kmh: speed, timestamp: timestamp.toISOString() });
        }
        row.pontos_gps = points;
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
      for (const field of ['data_inicio', 'data_fim']) {
        if (row[field] === undefined) continue;
        const parsed = new Date(row[field]);
        if (Number.isNaN(parsed.getTime())) {
          return send(res, 400, { error: `${field} deve ser uma data válida.` });
        }
        row[field] = parsed.toISOString();
      }
      if (row.data_inicio && row.data_fim && row.data_fim < row.data_inicio) {
        return send(res, 400, { error: 'A data de término não pode ser anterior ao início.' });
      }

      const { data, error } = await db
        .from('viagens')
        .insert(row)
        .select('*, motocicletas(id, modelo)')
        .single();
      if (error) throw error;
      if (!appUser.premium && data) delete data.combustivel_estimado_litros;
      return send(res, 201, { data });
    }

    return onlyMethods(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
