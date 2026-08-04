import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccount } from './DeleteAccount';
import { FaqPage } from './FaqPage';
import { PrivacyPolicy } from './PrivacyPolicy';

vi.mock('../context/auth', () => ({
  useAuth: () => ({
    user: null,
    claims: { orgId: '', role: null },
    loading: false,
    refreshClaims: vi.fn(),
  }),
}));

afterEach(cleanup);

const renderPage = (page: React.ReactNode, path: string) => (
  render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>)
);

describe('public policy and FAQ content', () => {
  it('states that contacts stay on the device and explains optional collection', () => {
    renderPage(<PrivacyPolicy />, '/privacy');

    expect(screen.getByRole('heading', { level: 2, name: 'Call logs and on-device contacts' })).toBeInTheDocument();
    expect(screen.getByText(/address book and contact names are not uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Lead and follow-up data' })).toBeInTheDocument();
    expect(screen.getByText(/Raw location points.*90 days/i)).toBeInTheDocument();
  });

  it('covers the product, permission, download, and plan questions', () => {
    renderPage(<FaqPage />, '/faq');

    expect(screen.getByRole('heading', { level: 2, name: 'Product and workflow' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Permissions and privacy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Android downloads' })).toBeInTheDocument();
    expect(screen.getByText('Are my phone contacts uploaded?')).toBeInTheDocument();
    expect(screen.getByText('Which plans include call intelligence?')).toBeInTheDocument();
  });

  it('distinguishes deleted data from retained organization records', () => {
    renderPage(<DeleteAccount />, '/delete-account');

    expect(screen.getByRole('heading', { level: 2, name: 'What happens when deletion completes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What may be retained' })).toBeInTheDocument();
    expect(screen.getByText(/Organization-owned call and lead business records may remain/i)).toBeInTheDocument();
  });
});
