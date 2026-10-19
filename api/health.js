import { getSupabase, send, onlyMethods, handleError } from './_lib/supabase.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'GET') return onlyMethods(res, ['GET', 'OPTIONS']);
  try { const db = getSupabase(); const { error } = await db.from('motocicletas').select('id').limit(1); if (error) throw error; return send(res, 200, { ok: true, service: 'strava-motos-api', database: 'connected' }); }
  catch (e) { return handleError(res, e); }
}
