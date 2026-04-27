import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock server actions
// ---------------------------------------------------------------------------

const mockExtractHealthDoc = vi.fn();
const mockApplyHealthExtraction = vi.fn();
const mockDiscardHealthExtraction = vi.fn();

vi.mock('@/server/profile/extract-health-doc', () => ({
  extractHealthDoc: (...args: unknown[]) => mockExtractHealthDoc(...args),
}));

vi.mock('@/server/profile/apply-health-extraction', () => ({
  applyHealthExtraction: (...args: unknown[]) => mockApplyHealthExtraction(...args),
  discardHealthExtraction: (...args: unknown[]) => mockDiscardHealthExtraction(...args),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { HealthDocStep } from '@/components/feature/onboarding/HealthDocStep';

const CANNED_EXTRACTION = {
  id: 'extraction-test-1',
  docType: 'bloodwork' as const,
  markers: [{ name: 'HbA1c', value: 5.4, unit: '%' }],
  suggested: {
    notes: ['Consider low-glycemic foods.'],
  },
  summary: 'Bloodwork panel with metabolic markers.',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderStep(props: { onApplied?: () => void; onSkip?: () => void } = {}) {
  return render(<HealthDocStep {...props} />);
}

/** Submits the health doc input form. Avoids non-null assertion. */
function submitForm(textarea: HTMLElement) {
  const form = textarea.closest('form');
  if (!form) throw new Error('Could not find parent form');
  fireEvent.submit(form);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HealthDocStep — input phase', () => {
  afterEach(cleanup);
  beforeEach(() => vi.clearAllMocks());

  it('renders the textarea and skip button', () => {
    renderStep();
    expect(screen.getByRole('textbox')).toBeDefined();
    expect(screen.getByRole('button', { name: /skip/i })).toBeDefined();
  });

  it('calls onSkip when the Skip button is clicked', () => {
    const onSkip = vi.fn();
    renderStep({ onSkip });
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('disables the submit button when textarea is empty', () => {
    renderStep();
    const btn = screen.getByRole('button', { name: /read document/i });
    expect(btn.getAttribute('disabled')).toBeDefined();
  });

  it('enables the submit button when text is entered', () => {
    renderStep();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'HbA1c 5.4%' } });
    const btn = screen.getByRole('button', { name: /read document/i });
    expect(btn.getAttribute('disabled')).toBeNull();
  });
});

describe('HealthDocStep — paste → preview flow', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractHealthDoc.mockResolvedValue({ ok: true, value: CANNED_EXTRACTION });
  });

  it('moves to preview phase after successful extraction', async () => {
    renderStep();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'HbA1c 5.4%' } });
    submitForm(textarea);

    await waitFor(() => {
      expect(screen.getByText(/bloodwork panel/i)).toBeDefined();
    });
  });

  it('shows the Edit and Discard buttons in preview', async () => {
    renderStep();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'HbA1c 5.4%' } });
    submitForm(textarea);

    await waitFor(() => screen.getByText(/bloodwork panel/i));
    expect(screen.getByRole('button', { name: /discard/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /edit/i })).toBeDefined();
  });

  it('shows an error message when extraction fails', async () => {
    mockExtractHealthDoc.mockResolvedValue({
      ok: false,
      error: { message: 'Could not read your document.', code: 'engine_failed' },
    });

    renderStep();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'some text' } });
    submitForm(textarea);

    await waitFor(() => {
      expect(screen.getByText(/could not read/i)).toBeDefined();
    });
  });
});

describe('HealthDocStep — discard action', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractHealthDoc.mockResolvedValue({ ok: true, value: CANNED_EXTRACTION });
    mockDiscardHealthExtraction.mockResolvedValue({ ok: true, value: undefined });
  });

  it('calls onSkip after discarding', async () => {
    const onSkip = vi.fn();
    renderStep({ onSkip });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'some text' } });
    submitForm(textarea);
    await waitFor(() => screen.getByText(/bloodwork panel/i));

    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    await waitFor(() => {
      expect(mockDiscardHealthExtraction).toHaveBeenCalledWith('extraction-test-1');
      expect(onSkip).toHaveBeenCalledOnce();
    });
  });
});

describe('HealthDocStep — apply action', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    // Use an extraction with a concrete suggestion so the Apply button appears.
    mockExtractHealthDoc.mockResolvedValue({
      ok: true,
      value: {
        ...CANNED_EXTRACTION,
        suggested: { activity_level: 'active', notes: ['Active lifestyle detected.'] },
      },
    });
    mockApplyHealthExtraction.mockResolvedValue({
      ok: true,
      value: { user_id: 'user-test', goal: 'maintain' },
    });
  });

  it('calls onApplied after pressing Apply', async () => {
    const onApplied = vi.fn();
    renderStep({ onApplied });

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'some text' } });
    submitForm(textarea);
    await waitFor(() => screen.getByText(/bloodwork panel/i));

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => {
      expect(mockApplyHealthExtraction).toHaveBeenCalledWith('extraction-test-1');
      expect(onApplied).toHaveBeenCalledOnce();
    });
  });
});

describe('HealthDocStep — edit flow', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractHealthDoc.mockResolvedValue({ ok: true, value: CANNED_EXTRACTION });
  });

  it('shows the edit form when Edit is clicked', async () => {
    renderStep();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'some text' } });
    submitForm(textarea);
    await waitFor(() => screen.getByText(/bloodwork panel/i));

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByLabelText(/goal/i)).toBeDefined();
    expect(screen.getByLabelText(/activity level/i)).toBeDefined();
  });

  it('returns to preview when Back is clicked from edit', async () => {
    renderStep();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'some text' } });
    submitForm(textarea);
    await waitFor(() => screen.getByText(/bloodwork panel/i));

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByText(/bloodwork panel/i)).toBeDefined();
    });
  });
});
