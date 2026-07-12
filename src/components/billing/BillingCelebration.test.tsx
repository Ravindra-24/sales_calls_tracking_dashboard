import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingCelebration } from './BillingCelebration';

vi.mock('../../api/billing', () => ({
  billingPlanName: (plan: string) => plan.charAt(0).toUpperCase() + plan.slice(1),
  formatBillingDate: () => '13 Oct 2026',
}));

const celebration = {
  action: 'initial' as const,
  targetPlan: 'pro' as const,
  previousAccessMode: 'full' as const,
  renewalDate: '2026-10-13T00:00:00.000Z',
  benefits: ['Manager workflows', 'Team reporting'],
  showPaymentHistory: true,
};

afterEach(cleanup);

describe('BillingCelebration', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('announces authoritative activation details and exposes both next actions', async () => {
    const onOpenDashboard = vi.fn();
    const onViewPaymentHistory = vi.fn();
    render(
      <BillingCelebration
        celebration={celebration}
        onClose={vi.fn()}
        onOpenDashboard={onOpenDashboard}
        onViewPaymentHistory={onViewPaymentHistory}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'You’re all set — Pro is active.' })).toBeInTheDocument();
    expect(screen.getByText('Manager workflows')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /open dashboard/i }));
    expect(onOpenDashboard).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: /view payment history/i }));
    expect(onViewPaymentHistory).toHaveBeenCalledOnce();
  });

  it('traps initial focus and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <BillingCelebration
        celebration={{ ...celebration, action: 'recovery' }}
        onClose={onClose}
        onOpenDashboard={vi.fn()}
        onViewPaymentHistory={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Payment is back on track.' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /close plan activation/i })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
