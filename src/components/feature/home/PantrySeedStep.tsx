'use client';
import { submitPantrySeedStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';

type FormState = { ok: true; value: undefined } | { ok: false; error: string };

interface PantrySeedStepProps {
  userId: string;
}

async function pantrySeedAdapter(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await submitPantrySeedStep({ ok: true, value: undefined }, formData);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, value: undefined };
}

export function PantrySeedStep({ userId: _userId }: PantrySeedStepProps) {
  const initialState: FormState = { ok: true, value: undefined };
  const [state, formAction, pending] = useActionState(pantrySeedAdapter, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl bg-accent/5 border border-accent/20 px-4 py-3 text-sm text-foreground">
        <p className="font-semibold mb-0.5">Almost there — your first meal awaits.</p>
        <p className="text-muted-foreground">
          Tell us what is in your kitchen and we will suggest something you can actually make
          tonight. Paste a comma-separated list or type a few ingredients.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pantry_text">What&apos;s in your kitchen?</Label>
        <textarea
          id="pantry_text"
          name="pantry_text"
          rows={5}
          placeholder="chicken breast, olive oil, garlic, canned tomatoes, pasta, onion, eggs…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                     placeholder:text-muted-foreground focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-ring resize-none"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          Separate items with commas. You can always add more from the Pantry tab.
        </p>
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3 mt-4">
        <Button
          type="submit"
          variant="outline"
          className="flex-1"
          disabled={pending}
          onClick={(e) => {
            const textarea = e.currentTarget
              .closest('form')
              ?.querySelector<HTMLTextAreaElement>('#pantry_text');
            if (textarea) textarea.value = '';
          }}
        >
          Skip for now
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? 'Saving…' : "Let's eat!"}
        </Button>
      </div>
    </form>
  );
}
