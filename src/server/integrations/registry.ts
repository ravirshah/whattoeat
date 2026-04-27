import 'server-only';
import type { IntegrationProvider } from '@/contracts/zod/integrations';
import type { SignalProvider } from '@/engine/ports/signal-provider';
import { createEightSleepProvider } from './factory';

type ProviderFactory = () => SignalProvider;

/**
 * Registry of provider→factory mappings. Add an entry here when a new
 * integration's adapter ships; the rest of the pipeline (settings UI, cron,
 * recommendation fan-out) keys off this map.
 */
const PROVIDER_FACTORIES: Partial<Record<IntegrationProvider, ProviderFactory>> = {
  eight_sleep: () => createEightSleepProvider(),
};

export function getProvider(provider: IntegrationProvider): SignalProvider | null {
  const factory = PROVIDER_FACTORIES[provider];
  return factory ? factory() : null;
}

export function listSupportedProviders(): IntegrationProvider[] {
  return Object.keys(PROVIDER_FACTORIES) as IntegrationProvider[];
}
