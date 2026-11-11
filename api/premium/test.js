import {
  requireAppUser,
  send,
  onlyMethods,
  handleError,
} from '../_lib/supabase.js';

function testEmailAllowlist() {
  return new Set(
    String(process.env.PREMIUM_TEST_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'POST') return onlyMethods(res, ['POST', 'OPTIONS']);

  try {
    // A free demo entitlement must never be self-service for every production
    // user. Turn it on explicitly and allow only named test accounts.
    if (process.env.PREMIUM_TEST_MODE !== 'true') {
      return send(res, 404, { error: 'Ativação de teste indisponível.' });
    }

    const allowedEmails = testEmailAllowlist();
    if (allowedEmails.size === 0) {
      return send(res, 503, { error: 'Configure a lista de contas de teste da API.' });
    }

    const { db, authUser, appUser } = await requireAppUser(req);
    const email = String(authUser.email || '').trim().toLowerCase();
    if (!authUser.email_confirmed_at || !email || !allowedEmails.has(email)) {
      return send(res, 403, { error: 'Esta conta não está autorizada para o Premium de teste.' });
    }

    const { data, error } = await db
      .from('usuarios')
      .update({ premium: true })
      .eq('id', appUser.id)
      .select('id,premium')
      .single();
    if (error) throw error;

    return send(res, 200, {
      data: { id: data.id, premium: data.premium === true, test: true, price_brl: 0 },
    });
  } catch (error) {
    return handleError(res, error);
  }
}
