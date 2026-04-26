import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the server client factory before importing the helper.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// Mock next/headers (not available outside Next.js runtime).
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}));

import { createServerClient } from '@/lib/supabase/server';
import { getUserId } from '@/server/auth/get-user-id';

const mockCreateServerClient = vi.mocked(createServerClient);

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not authenticated' },
      }),
    },
  };
}

describe('getUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the user id when a session exists', async () => {
    mockCreateServerClient.mockResolvedValue(makeSupabaseMock({ id: 'user-abc' }) as never);
    const id = await getUserId();
    expect(id).toBe('user-abc');
  });

  it('returns null when no session exists', async () => {
    mockCreateServerClient.mockResolvedValue(makeSupabaseMock(null) as never);
    const id = await getUserId();
    expect(id).toBeNull();
  });
});
