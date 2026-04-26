import type { HealthSignals, SignalSource } from '@/contracts/zod';

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
}

export interface SignalProvider {
  readonly source: SignalSource;
  getSignals(userId: string, range: DateRange): Promise<Partial<HealthSignals>>;
}
