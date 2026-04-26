import { MacroRing } from '@/components/ui/macro-ring';
import { StatTile } from '@/components/ui/stat-tile';
import type { Profile } from '@/contracts/zod/profile';
import Link from 'next/link';

interface ProfileViewProps {
  profile: Profile;
}

const GOAL_LABELS: Record<string, string> = {
  cut: 'Cut — Calorie Deficit',
  maintain: 'Maintain — Calorie Balance',
  bulk: 'Bulk — Calorie Surplus',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Active',
  very_active: 'Very Active',
};

/**
 * ProfileView — read-only display of profile data.
 * Intended to render inside src/app/profile/page.tsx (Server Component).
 */
export function ProfileView({ profile }: ProfileViewProps) {
  const { targets, goal, activity_level, allergies, dislikes, cuisines, equipment } = profile;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {profile.display_name ?? 'Your Profile'}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {GOAL_LABELS[goal] ?? goal}
            {activity_level && ` · ${ACTIVITY_LABELS[activity_level] ?? activity_level}`}
          </p>
        </div>
        <Link
          href="/profile/edit"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Edit
        </Link>
      </div>

      {/* Macro ring + stat tiles */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text">Daily Targets</h2>
        <div className="flex items-center gap-4">
          <MacroRing
            consumed={{ kcal: 0, protein: 0, carbs: 0, fat: 0 }}
            target={{
              kcal: targets.kcal,
              protein: targets.protein_g,
              carbs: targets.carbs_g,
              fat: targets.fat_g,
            }}
            size={100}
          />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="kcal / day" value={targets.kcal} tone="warm" />
            <StatTile label="protein" value={targets.protein_g} unit="g" />
            <StatTile label="carbs" value={targets.carbs_g} unit="g" />
            <StatTile label="fat" value={targets.fat_g} unit="g" />
          </div>
        </div>
      </section>

      {/* Dietary preferences */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text">Dietary Preferences</h2>
        <PreferenceRow label="Allergies" items={allergies} emptyText="None listed" />
        <PreferenceRow label="Dislikes" items={dislikes} emptyText="None listed" />
        <PreferenceRow label="Cuisines" items={cuisines} emptyText="Any cuisine" />
        <PreferenceRow label="Equipment" items={equipment} emptyText="Standard kitchen" />
      </section>

      {/* Connections — Coming Soon */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Connections</h2>
        <p className="text-sm text-text-muted">
          Connect health platforms to improve recommendations.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: 'Apple Health', icon: '🍎' },
            { name: 'Eight Sleep', icon: '🛏' },
            { name: 'Superpower Labs', icon: '⚡' },
          ].map(({ name, icon }) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-elevated px-4 py-3 opacity-50"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-text">{name}</p>
                <p className="text-xs text-text-muted">Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PreferenceRow({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
      {items.length === 0 ? (
        <span className="text-sm italic text-text-muted/60">{emptyText}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-sm text-text"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
