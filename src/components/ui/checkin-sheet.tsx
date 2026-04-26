'use client';
import { CheckinForm } from '@/components/feature/checkin/CheckinForm';
import { CheckinSummary } from '@/components/feature/checkin/CheckinSummary';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { HungerLevel, TrainingLevel } from '@/contracts/zod/checkin';

/** Minimal check-in data shape the sheet needs — avoids created_at Date vs string conflict. */
interface ExistingCheckin {
  id: string;
  date: string;
  energy: number;
  training: TrainingLevel;
  hunger: HungerLevel;
  note: string | null;
}

interface CheckinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Today's existing check-in (if any). Passed down from a Server Component parent. */
  existingCheckin?: ExistingCheckin | null;
  /** Today's date as 'YYYY-MM-DD'. Caller should supply the local date. */
  date: string;
}

/**
 * Vaul bottom sheet for the daily check-in.
 * Renders CheckinSummary when a check-in already exists, otherwise CheckinForm.
 * Used on the Home screen; the standalone /checkin page uses the same components
 * directly without this sheet wrapper.
 */
export function CheckinSheet({ open, onOpenChange, existingCheckin, date }: CheckinSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Daily Check-in</SheetTitle>
          <SheetDescription>
            {existingCheckin
              ? "You've already checked in today."
              : '3 taps, ~5 seconds. How are you feeling?'}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-4">
          {existingCheckin ? (
            <CheckinSummary checkin={existingCheckin} />
          ) : (
            <CheckinForm date={date} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
