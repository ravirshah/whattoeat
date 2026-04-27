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
 * Range: yesterday → today, in YYYY-MM-DD UTC. The provider adapters are
 * responsible for translating to their own timezone semantics.
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
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const range = {
    from: yesterday.toISOString().slice(0, 10),
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
