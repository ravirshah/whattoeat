'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RegenerateButtonProps {
  /** Called when the user taps the button. Parent handles the action. */
  onRegenerate: () => void;
  /** True when the parent is already waiting on an action response. */
  isPending?: boolean;
}

export function RegenerateButton({ onRegenerate, isPending = false }: RegenerateButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRegenerate}
      disabled={isPending}
      aria-label="Get new suggestions"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Thinking...' : 'Try again'}
    </Button>
  );
}
