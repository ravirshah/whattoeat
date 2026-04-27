'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import type { IntegrationProvider, IntegrationSummary } from '@/contracts/zod/integrations';
import {
  connectEightSleep,
  disconnectIntegration,
  listMyIntegrations,
} from '@/server/integrations/actions';
import { useState, useTransition } from 'react';

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
    </div>
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
