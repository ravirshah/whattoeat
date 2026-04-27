'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import type { IntegrationProvider, IntegrationSummary } from '@/contracts/zod/integrations';
import {
  type ProviderDebug,
  connectEightSleep,
  disconnectIntegration,
  getProviderDebug,
  listMyIntegrations,
  syncProviderNow,
} from '@/server/integrations/actions';
import { useEffect, useState, useTransition } from 'react';

interface IntegrationsViewProps {
  initialIntegrations: IntegrationSummary[];
}

interface ProviderMeta {
  provider: IntegrationProvider;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

const PROVIDERS: ProviderMeta[] = [
  {
    provider: 'eight_sleep',
    name: 'Eight Sleep',
    icon: '🛏',
    description: 'Sleep score, duration, and resting HR feed into recovery-aware meals.',
    available: true,
  },
  {
    provider: 'apple_health',
    name: 'Apple Health',
    icon: '🍎',
    description: 'Steps, workouts, and resting HR from your iPhone.',
    available: false,
  },
  {
    provider: 'whoop',
    name: 'Whoop',
    icon: '⚡',
    description: 'Strain and recovery score.',
    available: false,
  },
  {
    provider: 'oura',
    name: 'Oura',
    icon: '💍',
    description: 'Sleep + readiness + activity ring.',
    available: false,
  },
];

export function IntegrationsView({ initialIntegrations }: IntegrationsViewProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  const refresh = async () => {
    const r = await listMyIntegrations();
    if (r.ok) setIntegrations(r.value);
  };

  const findStatus = (p: IntegrationProvider) => integrations.find((i) => i.provider === p);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text">Integrations</h1>
        <p className="mt-1 text-sm text-text-muted">
          Connect health platforms so Feed Me can adapt meals to how you slept, trained, and
          recovered.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        {PROVIDERS.map((meta) => (
          <ProviderCard
            key={meta.provider}
            meta={meta}
            summary={findStatus(meta.provider)}
            onChange={refresh}
          />
        ))}
      </section>
    </div>
  );
}

function ProviderCard({
  meta,
  summary,
  onChange,
}: {
  meta: ProviderMeta;
  summary: IntegrationSummary | undefined;
  onChange: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const isConnected = summary?.status === 'connected';
  const isError = summary?.status === 'error';

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            {meta.icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-text">{meta.name}</p>
            <p className="mt-0.5 text-xs text-text-muted">{meta.description}</p>
            {summary && (
              <p className="mt-2 text-xs text-text-muted">
                <StatusBadge status={summary.status} />
                {summary.last_synced_at && (
                  <span className="ml-2">
                    Last sync {new Date(summary.last_synced_at).toLocaleString()}
                  </span>
                )}
              </p>
            )}
            {isError && summary?.last_error && (
              <p className="mt-1 text-xs text-err">{summary.last_error}</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {!meta.available ? (
            <span className="text-xs text-text-muted">Coming soon</span>
          ) : isConnected ? (
            <DisconnectButton provider={meta.provider} onChange={onChange} />
          ) : (
            <Button size="sm" variant="default" onClick={() => setOpen((v) => !v)}>
              {open ? 'Cancel' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {meta.available && open && !isConnected && (
        <ConnectForm provider={meta.provider} onClose={() => setOpen(false)} onChange={onChange} />
      )}

      {isConnected && <DebugPanel provider={meta.provider} onSynced={onChange} />}
    </div>
  );
}

function DebugPanel({
  provider,
  onSynced,
}: {
  provider: IntegrationProvider;
  onSynced: () => Promise<void>;
}) {
  const [debug, setDebug] = useState<ProviderDebug | null | undefined>(undefined);
  const [showRaw, setShowRaw] = useState(false);
  const [syncing, startSync] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getProviderDebug({ provider });
      if (!cancelled && r.ok) setDebug(r.value);
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const sync = () => {
    startSync(async () => {
      const r = await syncProviderNow({ provider });
      if (!r.ok) {
        toast.error(r.error.message);
        return;
      }
      toast.success('Synced');
      const debugRes = await getProviderDebug({ provider });
      if (debugRes.ok) setDebug(debugRes.value);
      await onSynced();
    });
  };

  if (debug === undefined) {
    return <div className="mt-4 border-t border-border pt-4 text-xs text-text-muted">Loading…</div>;
  }

  if (debug === null) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-text-muted">
          No data yet. Run a sync to pull last night's snapshot.
        </p>
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>
    );
  }

  const { mapped, adjustments, observed_at, raw } = debug;
  const sleep = mapped.sleep;
  const recovery = mapped.recovery;

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Latest snapshot
          </p>
          <p className="text-xs text-text-muted">
            Observed {new Date(observed_at).toLocaleString()}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SignalTile
          label="Last night"
          value={sleep ? `${sleep.lastNightHours.toFixed(1)}h` : '—'}
        />
        <SignalTile label="Quality" value={sleep?.quality ?? '—'} />
        <SignalTile
          label="Resting HR"
          value={recovery?.restingHr !== undefined ? `${recovery.restingHr} bpm` : '—'}
        />
        <SignalTile
          label="HRV"
          value={recovery?.hrvMs !== undefined ? `${recovery.hrvMs} ms` : '—'}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          How recipes will adjust
        </p>
        {adjustments.length === 0 ? (
          <p className="text-xs italic text-text-muted">
            No active adjustments — signals are in a neutral range.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {adjustments.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs"
              >
                <p className="font-medium text-text">
                  <SeverityDot severity={a.severity} />
                  {a.title}
                </p>
                <p className="mt-0.5 text-text-muted">{a.effect}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button
          type="button"
          className="text-[11px] font-medium uppercase tracking-wide text-text-muted hover:text-text"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? 'Hide' : 'Show'} raw payload
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-surface p-3 text-[10px] leading-snug text-text-muted">
            {JSON.stringify(raw, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

function SeverityDot({ severity }: { severity: 'tilt' | 'prefer' | 'inform' }) {
  const color =
    severity === 'tilt' ? 'bg-warn' : severity === 'prefer' ? 'bg-accent' : 'bg-text-muted';
  return (
    <span
      className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${color}`}
      aria-hidden
    />
  );
}

function StatusBadge({ status }: { status: IntegrationSummary['status'] }) {
  const styles = {
    connected: 'bg-ok/15 text-ok',
    error: 'bg-err/15 text-err',
    expired: 'bg-warn/15 text-warn',
    disconnected: 'bg-surface text-text-muted',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ConnectForm({
  provider,
  onClose,
  onChange,
}: {
  provider: IntegrationProvider;
  onClose: () => void;
  onChange: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();

  if (provider !== 'eight_sleep') return null;

  const submit = () => {
    startTransition(async () => {
      const r = await connectEightSleep({ email, password });
      if (r.ok) {
        toast.success('Eight Sleep connected');
        await onChange();
        onClose();
      } else {
        toast.error(r.error.message);
      }
    });
  };

  return (
    <form
      className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-xs text-text-muted">
        Eight Sleep doesn't expose OAuth, so we sign in with your account credentials and store them
        encrypted at rest.
      </p>
      <div className="flex flex-col gap-1">
        <Label htmlFor="es-email">Email</Label>
        <Input
          id="es-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="es-password">Password</Label>
        <Input
          id="es-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Connecting…' : 'Connect'}
        </Button>
      </div>
    </form>
  );
}

function DisconnectButton({
  provider,
  onChange,
}: {
  provider: IntegrationProvider;
  onChange: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const click = () => {
    startTransition(async () => {
      const r = await disconnectIntegration({ provider });
      if (r.ok) {
        toast.success('Disconnected');
        await onChange();
      } else {
        toast.error(r.error.message);
      }
    });
  };
  return (
    <Button size="sm" variant="outline" onClick={click} disabled={pending}>
      {pending ? '…' : 'Disconnect'}
    </Button>
  );
}
