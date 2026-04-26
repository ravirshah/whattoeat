'use client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ExistingCheckin {
  energy: number;
  training: 'none' | 'light' | 'hard';
  hunger: 'low' | 'normal' | 'high';
  note?: string;
}

interface CheckinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCheckin?: ExistingCheckin;
}

/**
 * CheckinSheet — Vaul drawer for the 3-tap daily check-in.
 * Energy 1-5, training (none/light/hard), hunger (low/normal/high), optional note.
 *
 * TODO: Plan 07 fills — real server action, segmented controls, optimistic update.
 */
export function CheckinSheet({ open, onOpenChange, existingCheckin }: CheckinSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Daily Check-in</SheetTitle>
          <SheetDescription>3 taps, ~5 seconds. How are you feeling today?</SheetDescription>
        </SheetHeader>
        <div className="px-6 py-4 text-sm text-text-muted">
          {existingCheckin
            ? `Today logged: energy ${existingCheckin.energy}/5, training ${existingCheckin.training}, hunger ${existingCheckin.hunger}`
            : 'Check-in form — Plan 07 fills this in.'}
        </div>
      </SheetContent>
    </Sheet>
  );
}
