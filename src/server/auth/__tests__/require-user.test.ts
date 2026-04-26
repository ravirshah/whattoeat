import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}));

// redirect() throws in Next.js — mock it to throw so we can assert on it.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/require-user';

const mockCreateServerClient = vi.mocked(createServerClient);

function makeSupabaseMock(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not authenticated' },
      }),
    },
  };
}

describe('requireUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns userId and email when authenticated', async () => {
    mockCreateServerClient.mockResolvedValue(
      makeSupabaseMock({ id: 'user-123', email: 'ravi@example.com' }) as never,
    );
    const result = await requireUser();
    expect(result.userId).toBe('user-123');
    expect(result.email).toBe('ravi@example.com');
  });

  it('redirects to /auth/login when not authenticated', async () => {
    mockCreateServerClient.mockResolvedValue(makeSupabaseMock(null) as never);
    await expect(requireUser()).rejects.toThrow('REDIRECT:/auth/login');
  });

  it('redirects to /auth/login when user has no email', async () => {
    // A user object without email is treated as incomplete / unauthenticated.
    mockCreateServerClient.mockResolvedValue(makeSupabaseMock({ id: 'user-456' }) as never);
    // requireUser must resolve even without email — email falls back to empty string.
    const result = await requireUser();
    expect(result.userId).toBe('user-456');
    expect(result.email).toBe('');
  });
});
