import type { RecommendationContext } from '@/contracts/zod';

const BASE_PROFILE = {
  user_id: '00000000-0000-0000-0000-000000000001',
  display_name: 'Test User',
  goal: 'maintain' as const,
  targets: { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 },
  height_cm: 175,
  weight_kg: 75,
  birthdate: '1990-01-01',
  sex: 'male' as const,
  activity_level: 'moderate' as const,
  dietary_pattern: null,
  allergies: [] as string[],
  dislikes: [] as string[],
  cuisines: [] as string[],
  equipment: ['stovetop', 'oven', 'microwave'],
  created_at: '2026-04-26T00:00:00.000Z',
  updated_at: '2026-04-26T00:00:00.000Z',
};

const STOCKED_PANTRY = [
  {
    id: '00000000-0000-0001-0000-000000000001',
    user_id: BASE_PROFILE.user_id,
    name: 'chicken breast',
    display_name: 'Chicken Breast',
    category: 'protein' as const,
    available: true,
    added_at: '2026-04-26T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0001-0000-000000000002',
    user_id: BASE_PROFILE.user_id,
    name: 'white rice',
    display_name: 'White Rice',
    category: 'grain' as const,
    available: true,
    added_at: '2026-04-26T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0001-0000-000000000003',
    user_id: BASE_PROFILE.user_id,
    name: 'eggs',
    display_name: 'Eggs',
    category: 'protein' as const,
    available: true,
    added_at: '2026-04-26T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0001-0000-000000000004',
    user_id: BASE_PROFILE.user_id,
    name: 'greek yogurt',
    display_name: 'Greek Yogurt',
    category: 'dairy' as const,
    available: true,
    added_at: '2026-04-26T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0001-0000-000000000005',
    user_id: BASE_PROFILE.user_id,
    name: 'olive oil',
    display_name: 'Olive Oil',
    category: 'pantry' as const,
    available: true,
    added_at: '2026-04-26T00:00:00.000Z',
  },
];

/** 1. Standard cutting-day context */
export const cuttingDayCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: {
    ...BASE_PROFILE,
    goal: 'cut',
    targets: { kcal: 1600, protein_g: 150, carbs_g: 130, fat_g: 50 },
  },
  checkin: {
    id: '00000000-0000-0002-0000-000000000001',
    user_id: BASE_PROFILE.user_id,
    date: '2026-04-26',
    energy: 3,
    training: 'light',
    hunger: 'normal',
    note: null,
    created_at: '2026-04-26T00:00:00.000Z',
  },
  request: { mealType: 'dinner', candidateCount: 3 },
};

/** 2. Hard training day — bulk goal, high protein priority */
export const trainingDayCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: {
    ...BASE_PROFILE,
    goal: 'bulk',
    targets: { kcal: 2800, protein_g: 200, carbs_g: 320, fat_g: 90 },
  },
  checkin: {
    id: '00000000-0000-0002-0000-000000000002',
    user_id: BASE_PROFILE.user_id,
    date: '2026-04-26',
    energy: 5,
    training: 'hard',
    hunger: 'high',
    note: null,
    created_at: '2026-04-26T00:00:00.000Z',
  },
  request: { mealType: 'any', candidateCount: 3 },
};

/** 3. Low-sleep recovery context — quick meal preferred */
export const lowSleepCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: BASE_PROFILE,
  checkin: {
    id: '00000000-0000-0002-0000-000000000003',
    user_id: BASE_PROFILE.user_id,
    date: '2026-04-26',
    energy: 1,
    training: 'none',
    hunger: 'low',
    note: null,
    created_at: '2026-04-26T00:00:00.000Z',
  },
  signals: { sleep: { lastNightHours: 4.5, quality: 'poor' } },
  request: { mealType: 'breakfast', timeBudgetMin: 10, candidateCount: 2 },
};

/** 4. Bare pantry — only 2 items available */
export const barePantryCtx: RecommendationContext = {
  pantry: [
    {
      id: '00000000-0000-0001-0000-000000000001',
      user_id: BASE_PROFILE.user_id,
      name: 'eggs',
      display_name: 'Eggs',
      category: 'protein',
      available: true,
      added_at: '2026-04-26T00:00:00.000Z',
    },
    {
      id: '00000000-0000-0001-0000-000000000002',
      user_id: BASE_PROFILE.user_id,
      name: 'salt',
      display_name: 'Salt',
      category: 'pantry',
      available: true,
      added_at: '2026-04-26T00:00:00.000Z',
    },
  ],
  profile: BASE_PROFILE,
  request: { mealType: 'any', candidateCount: 3 },
};

/** 5. Allergy context — peanut allergy */
export const allergyCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: { ...BASE_PROFILE, allergies: ['peanut'] },
  request: { mealType: 'any', candidateCount: 3 },
};

/** 6. Recency context — one recent cook title to de-prioritise */
export const recencyCtx: RecommendationContext = {
  pantry: STOCKED_PANTRY,
  profile: BASE_PROFILE,
  request: { mealType: 'dinner', candidateCount: 3 },
};

export const RECENCY_RECENT_TITLE = 'Grilled Chicken & Rice';
