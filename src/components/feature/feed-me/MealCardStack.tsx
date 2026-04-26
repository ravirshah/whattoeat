import type { MealCandidate } from '@/contracts/zod/recommendation';
import { MealCard } from './MealCard';

interface MealCardStackProps {
  candidates: MealCandidate[];
}

/**
 * MealCardStack — renders 1-3 MealCard components in a vertical stack.
 * The stack itself is a simple layout; each card handles its own animation
 * offset via the `index` prop, producing a staggered reveal.
 */
export function MealCardStack({ candidates }: MealCardStackProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto px-4">
      {candidates.map((candidate, index) => (
        <MealCard key={candidate.title} candidate={candidate} index={index} />
      ))}
    </div>
  );
}
