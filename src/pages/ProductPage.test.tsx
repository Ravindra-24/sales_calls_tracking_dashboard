import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductPage } from './ProductPage';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as null | { uid: string },
    claims: { orgId: '', role: null as null | 'org_admin' },
    loading: false,
    refreshClaims: vi.fn(),
  },
}));

vi.mock('../context/auth', () => ({ useAuth: () => mocks.auth }));

afterEach(() => {
  cleanup();
  mocks.auth.user = null;
  mocks.auth.claims = { orgId: '', role: null };
  mocks.auth.refreshClaims.mockReset();
});

const renderPage = () => render(<MemoryRouter initialEntries={['/']}><ProductPage /></MemoryRouter>);

describe('ProductPage', () => {
  it('keeps the homepage focused and routes detailed subjects to dedicated pages', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Every sales call. One clear picture.' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start free/ }).some((link) => link.getAttribute('href') === '/signup')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Explore the product' }).some((link) => link.getAttribute('href') === '/product')).toBe(true);
    expect(screen.getByRole('link', { name: 'View Android app' })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: 'Compare plans' })).toHaveAttribute('href', '/pricing');
    expect(screen.queryByText('What happens when the Android download is not available?')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lite' })).not.toBeInTheDocument();
  });

  it('uses only a project-local team image', () => {
    renderPage();

    const image = screen.getByRole('img', {
      name: 'A sales manager and representatives reviewing call activity together',
    });
    expect(image.getAttribute('src')).toContain('sales-team');
    expect(image.getAttribute('src')).not.toMatch(/^https?:\/\//);
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  it('keeps signed-in calls to action session-aware', () => {
    mocks.auth.user = { uid: 'user_1' };
    mocks.auth.claims = { orgId: 'org_1', role: 'org_admin' };
    renderPage();

    expect(screen.getAllByRole('link', { name: /Open dashboard/ }).every((link) => link.getAttribute('href') === '/dashboard')).toBe(true);
    expect(within(screen.getByRole('banner')).queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('opens and closes the keyboard-accessible mobile navigation', async () => {
    const user = userEvent.setup();
    renderPage();

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    await user.click(trigger);
    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(mobileNavigation).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
