import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AndroidAppPage } from './AndroidAppPage';

const mocks = vi.hoisted(() => ({
  fetchRelease: vi.fn(),
  auth: {
    user: null,
    claims: { orgId: '', role: null },
    loading: false,
    refreshClaims: vi.fn(),
  },
}));

vi.mock('../api/mobile', () => ({ fetchAndroidRelease: mocks.fetchRelease }));
vi.mock('../api/client', () => ({ BACKEND_URL: 'https://api.smartlymanage.test' }));
vi.mock('../context/auth', () => ({ useAuth: () => mocks.auth }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  mocks.fetchRelease.mockReset();
});

const renderPage = () => render(<MemoryRouter initialEntries={['/download']}><AndroidAppPage /></MemoryRouter>);

describe('AndroidAppPage', () => {
  it('renders live store-style version details, release notes, and checksum', async () => {
    vi.stubEnv('VITE_APK_DOWNLOAD_URL', '/downloads/smartly-manage.apk');
    mocks.fetchRelease.mockResolvedValue({
      versionCode: 8,
      versionName: '1.4',
      sha256: 'a'.repeat(64),
      releaseNotes: 'Faster call sync\nImproved shift readiness',
      publishedAt: '2026-07-30T10:00:00.000Z',
    });
    renderPage();

    expect(await screen.findByRole('heading', { level: 2, name: 'Version 1.4' })).toBeInTheDocument();
    expect(screen.getByText('Faster call sync')).toBeInTheDocument();
    expect(screen.getByText('Improved shift readiness')).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download current APK/ })).toHaveAttribute('href', '/downloads/smartly-manage.apk');
  });

  it('shows bundled version details and a safe unavailable state without a release', async () => {
    mocks.fetchRelease.mockResolvedValue(null);
    renderPage();

    await waitFor(() => expect(screen.getByText(/Android download coming soon/)).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: 'Version 1.4' })).toBeInTheDocument();
    expect(screen.getByText('8', { selector: '.lw-store-metadata strong' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download current APK/ })).not.toBeInTheDocument();
  });
});
