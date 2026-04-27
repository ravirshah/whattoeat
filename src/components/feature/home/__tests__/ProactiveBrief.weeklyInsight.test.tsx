import type { Profile } from '@/contracts/zod/profile';
import type { CheckinDTO } from '@/server/checkin/actions';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProactiveBrief } from '../ProactiveBrief';

afterEach(() => {
  cleanup();
});

const PROFILE: Profile = {
  user_id: '00000000-0000-0000-0000-000000000001',
  display_name: 'Test',
  goal: 'maintain',
  targets: { kcal: 2200, protein_g: 160, carbs_g: 250, fat_g: 70 },
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male',
  activity_level: 'moderate',
  dietary_pattern: null,
  allergies: [],
  dislikes: [],
  cuisines: [],
  equipment: [],
  created_at: '2026-04-26T00:00:00.000Z',
  updated_at: '2026-04-26T00:00:00.000Z',
};

const CHECKIN: CheckinDTO = {
  date: '2026-04-26',
  energy: 4,
  training: 'light',
  hunger: 'normal',
  note: null,
};

describe('ProactiveBrief — weeklyInsight', () => {
  it('does not render insight section when weeklyInsight is null', () => {
    render(
      <ProactiveBrief
        profile={PROFILE}
        checkin={CHECKIN}
        pantryItemCount={10}
        hour={19}
        weeklyInsight={null}
      />,
    );
    const paragraphs = screen.getAllByText(/./);
    const insightParagraphs = paragraphs.filter(
      (el) => el.tagName === 'P' && el.className.includes('italic'),
    );
    expect(insightParagraphs).toHaveLength(0);
  });

  it('renders the insight text when weeklyInsight is provided (variety)', () => {
    render(
      <ProactiveBrief
        profile={PROFILE}
        checkin={CHECKIN}
        pantryItemCount={10}
        hour={19}
        weeklyInsight={{
          insight: 'Chicken appeared in 3 of 5 meals this week — try a swap tonight.',
          family: 'variety',
        }}
      />,
    );
    expect(
      screen.getByText('Chicken appeared in 3 of 5 meals this week — try a swap tonight.'),
    ).toBeDefined();
  });

  it('renders deficit_surplus insight without error', () => {
    render(
      <ProactiveBrief
        profile={PROFILE}
        checkin={CHECKIN}
        pantryItemCount={10}
        hour={19}
        weeklyInsight={{
          insight: 'Averaging 280kcal under target on training days — worth fuelling more.',
          family: 'deficit_surplus',
        }}
      />,
    );
    expect(
      screen.getByText('Averaging 280kcal under target on training days — worth fuelling more.'),
    ).toBeDefined();
  });

  it('renders trend family insight without error', () => {
    render(
      <ProactiveBrief
        profile={PROFILE}
        checkin={CHECKIN}
        pantryItemCount={10}
        hour={19}
        weeklyInsight={{
          insight: 'Your protein climbed 12% this week — bulk target is in reach.',
          family: 'trend',
        }}
      />,
    );
    expect(
      screen.getByText('Your protein climbed 12% this week — bulk target is in reach.'),
    ).toBeDefined();
  });

  it('renders the brief greeting', () => {
    render(<ProactiveBrief profile={PROFILE} checkin={CHECKIN} pantryItemCount={10} hour={19} />);
    expect(screen.getByText(/today's brief/i)).toBeDefined();
  });
});
