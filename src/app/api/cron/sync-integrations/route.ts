import { syncAllConnected } from '@/server/integrations/sync';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Daily cron — pulls fresh signals from every connected integration so that
 * subsequent recommendation requests hit the snapshot cache instead of the
 * live provider API.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Locally you
 * can hit it with the same header to dry-run.
 *
 * Range: last 7 days → today, in YYYY-MM-DD UTC. Provider day strings are
 * user-TZ-keyed; a wider window guarantees we see the latest completed sleep
 * even if processing is delayed or the user's TZ rolls over differently.
 */
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authz = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || authz !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const range = {
    from: weekAgo.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };

  const results = await syncAllConnected(range);
  const summary = {
    range,
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    errors: results
      .filter((r) => !r.ok)
      .map((r) => ({ user_id: r.user_id, provider: r.provider, error: r.error })),
  };
  return NextResponse.json(summary);
}
