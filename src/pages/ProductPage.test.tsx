import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductPage } from './ProductPage';

const mocks = vi.hoisted(() => {
  const catalog = {
    mode: 'test',
    liveEnabled: false,
    checkoutAvailable: true,
    fallback: false,
    plans: [
      { code: 'lite', name: 'Lite', description: 'Start with essential call visibility.', currentPrice: null },
      {
        code: 'pro', name: 'Pro', description: 'Manager tools for growing teams.',
        currentPrice: { id: 'pro_v1', baseAmountPaise: 199900, grossAmountPaise: 235882, taxAmountPaise: 35982, currency: 'INR', billingPeriod: 'monthly', interval: 3, providerReady: true },
      },
      {
        code: 'max', name: 'Max', description: 'Advanced integrations and reporting.',
        currentPrice: { id: 'max_v1', baseAmountPaise: 399900, grossAmountPaise: 471882, taxAmountPaise: 71982, currency: 'INR', billingPeriod: 'yearly', interval: 1, providerReady: true },
      },
      { code: 'enterprise', name: 'Enterprise', description: 'Custom controls and terms.', currentPrice: null },
    ],
  };
  return {
    catalog,
    auth: {
      user: null as null | { uid: string },
      claims: { orgId: '', role: null as null | 'org_admin' },
      loading: false,
      refreshClaims: vi.fn(),
    },
    fetchCatalog: vi.fn(),
  };
});

const catalog = mocks.catalog;

vi.mock('../context/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../api/billing', () => ({
  FALLBACK_BILLING_CATALOG: mocks.catalog,
  fetchBillingCatalog: mocks.fetchCatalog,
  billingCycleLabel: (_code: string, period?: string) => period === 'yearly' ? 'per year' : 'every quarter',
  formatBillingMoney: (amount?: number | null) => amount == null ? '—' : `₹${Math.round(amount / 100).toLocaleString('en-IN')}`,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  mocks.auth.user = null;
  mocks.auth.claims = { orgId: '', role: null };
  mocks.fetchCatalog.mockReset();
  mocks.fetchCatalog.mockResolvedValue(catalog);
});

const renderPage = () => render(<MemoryRouter initialEntries={['/']}><ProductPage /></MemoryRouter>);

describe('ProductPage', () => {
  it('shows the outcome-led public experience and safe Android fallback to visitors', async () => {
    vi.stubEnv('VITE_APK_DOWNLOAD_URL', '');
    vi.stubEnv('VITE_APK_SCREENSHOT_URL', '');
    mocks.fetchCatalog.mockResolvedValue(catalog);
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Every sales call. One clear picture.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start free/ }).some((link) => link.getAttribute('href') === '/signup')).toBe(true);
    expect(screen.getByText((_, element) => (
      element?.getAttribute('role') === 'status'
      && element.textContent?.includes('Android download coming soon') === true
    ))).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Smartly Manage Android app preview' })).toBeInTheDocument();
    expect(screen.queryByText('248')).not.toBeInTheDocument();
    expect(screen.getAllByText(/does not record call audio/i).length).toBeGreaterThan(0);
    await waitFor(() => expect(mocks.fetchCatalog).toHaveBeenCalledOnce());
  });

  it('uses a configured Android screenshot and falls back if the image breaks', async () => {
    vi.stubEnv('VITE_APK_SCREENSHOT_URL', 'https://cdn.example.com/leadwatch-android.png');
    mocks.fetchCatalog.mockResolvedValue(catalog);
    renderPage();

    const screenshot = screen.getByRole('img', { name: 'Smartly Manage Android call activity screen' });
    expect(screenshot).toHaveAttribute('src', 'https://cdn.example.com/leadwatch-android.png');
    expect(screenshot).toHaveAttribute('loading', 'lazy');
    fireEvent.error(screenshot);
    expect(screen.getByRole('img', { name: 'Smartly Manage Android app preview' })).toBeInTheDocument();
  });

  it('keeps a safe Lite path when the live paid catalog is unavailable', async () => {
    const unavailableCatalog = {
      ...catalog,
      checkoutAvailable: false,
      fallback: true,
      plans: catalog.plans.map((plan) => ({
        ...plan,
        currentPrice: plan.currentPrice ? { ...plan.currentPrice, providerReady: false } : null,
      })),
    };
    mocks.fetchCatalog.mockResolvedValue(unavailableCatalog);
    renderPage();

    expect(await screen.findByText('Paid checkout is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Start on Lite' }).every((link) => (
      link.getAttribute('href') === '/signup?plan=lite'
    ))).toBe(true);
  });

  it('keeps signed-in CTAs session-aware and deep-links paid plan management', async () => {
    mocks.auth.user = { uid: 'user_1' };
    mocks.auth.claims = { orgId: 'org_1', role: 'org_admin' };
    mocks.fetchCatalog.mockResolvedValue(catalog);
    renderPage();

    expect(screen.getAllByRole('link', { name: /Open dashboard/ }).some((link) => link.getAttribute('href') === '/dashboard')).toBe(true);
    expect(within(screen.getByRole('banner')).queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    await waitFor(() => {
      const manageLinks = screen.getAllByRole('link', { name: 'Manage plan' });
      expect(manageLinks.some((link) => link.getAttribute('href') === '/dashboard/billing?plan=pro')).toBe(true);
      expect(manageLinks.some((link) => link.getAttribute('href') === '/dashboard/billing?plan=max')).toBe(true);
    });
  });

  it('opens and closes the keyboard-accessible mobile navigation', async () => {
    mocks.fetchCatalog.mockResolvedValue(catalog);
    const user = userEvent.setup();
    renderPage();

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    await user.click(trigger);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
