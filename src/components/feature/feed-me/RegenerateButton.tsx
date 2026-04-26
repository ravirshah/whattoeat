'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTransition } from 'react';

interface RegenerateButtonProps {
  /** Called when the user taps the button. Parent handles the action. */
  onRegenerate: () => void;
  /** True when the parent is already waiting on an action response. */
  isPending?: boolean;
}

export function RegenerateButton({ onRegenerate, isPending }: RegenerateButtonProps) {
  const [isTransitioning, startTransition] = useTransition();
  const busy = isPending ?? isTransitioning;

  function handleClick() {
    startTransition(() => {
      onRegenerate();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={busy}
      aria-label="Get new suggestions"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
      {busy ? 'Thinking...' : 'Try again'}
    </Button>
  );
}
