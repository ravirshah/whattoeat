import type { MealCandidate } from '@/contracts/zod/recommendation';
import { MealCard } from './MealCard';

interface MealCardStackProps {
  candidates: MealCandidate[];
  runId?: string;
}

export function MealCardStack({ candidates, runId }: MealCardStackProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto px-4">
      {candidates.map((candidate, index) => (
        <MealCard key={candidate.title} candidate={candidate} index={index} runId={runId} />
      ))}
    </div>
  );
}
