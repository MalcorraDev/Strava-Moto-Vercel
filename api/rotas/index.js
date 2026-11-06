import { send } from '../_lib/supabase.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  return send(res, 410, {
    error: 'Esta rota legada foi desativada. Use as rotas autenticadas de motocicletas e viagens.',
    endpoint: '/api/rotas',
  });
}
