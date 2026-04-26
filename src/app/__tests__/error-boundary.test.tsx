import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Sentry before importing the boundary.
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => cb(mockScope)),
  captureException: vi.fn(),
}));

const mockScope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
};

import ErrorBoundary from '@/app/error';
import * as Sentry from '@sentry/nextjs';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('ErrorBoundary (segment)', () => {
  it('renders the friendly fallback title', () => {
    const fakeError = new Error('test error');
    const reset = vi.fn();
    render(<ErrorBoundary error={fakeError} reset={reset} />);
    expect(screen.getByText(/something went sideways/i)).toBeDefined();
  });

  it('calls Sentry.captureException with the error', async () => {
    const fakeError = new Error('boom');
    const reset = vi.fn();
    render(<ErrorBoundary error={fakeError} reset={reset} />);
    // useEffect fires synchronously in vitest with @testing-library/react
    expect(Sentry.captureException).toHaveBeenCalledWith(fakeError);
  });

  it('tags the boundary as "segment"', () => {
    const fakeError = new Error('boom');
    render(<ErrorBoundary error={fakeError} reset={vi.fn()} />);
    expect(mockScope.setTag).toHaveBeenCalledWith('boundary', 'segment');
  });

  it('calls reset when "Try again" is clicked', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error('x')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('renders a "Go home" link pointing to "/"', () => {
    render(<ErrorBoundary error={new Error('x')} reset={vi.fn()} />);
    const link = screen.getByRole('link', { name: /go home/i });
    expect(link.getAttribute('href')).toBe('/');
  });
});
