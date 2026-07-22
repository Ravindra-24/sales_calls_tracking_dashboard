import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { CallHistory } from './CallHistory';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  toast: vi.fn(),
  requestFields: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: { get: mocks.get, post: mocks.post, patch: mocks.patch },
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../context/auth', () => ({
  useAuth: () => ({
    user: { uid: 'admin-1', email: 'admin@example.com', displayName: 'Admin' },
    claims: { orgId: 'org-1', role: 'manager' },
  }),
}));
vi.mock('../context/feedback', () => ({
  useFeedback: () => ({
    toast: mocks.toast,
    requestFields: mocks.requestFields,
    confirm: vi.fn(),
    requestText: vi.fn(),
  }),
}));

const call = (id: string, direction: 'incoming' | 'outgoing' | 'missed') => ({
  id,
  repId: 'rep-1',
  phoneNumber: '+919876543210',
  direction,
  startTime: '2026-07-22T10:00:00.000Z',
  endTime: null,
  durationSeconds: direction === 'missed' ? 0 : 60,
});

const installApiMock = () => {
  mocks.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    if (url.includes('/users')) return Promise.resolve({ data: { data: [{
      id: 'rep-1', name: 'Asha', email: 'asha@example.com', role: 'sales_member', status: 'active', createdAt: '', updatedAt: '',
    }] } });
    if (url === '/calls/filters') return Promise.resolve({ data: { data: [] } });
    if (url === '/calls/summary') return Promise.resolve({ data: { data: { totalCalls: 8, connectedCalls: 6, missedCalls: 2 } } });
    if (url === '/calls') {
      const secondPage = config?.params?.cursor === 'page-2';
      return Promise.resolve({ data: {
        data: secondPage ? [call('call-3', 'missed')] : [call('call-1', 'incoming'), call('call-2', 'outgoing')],
        meta: { nextCursor: secondPage ? undefined : 'page-2' },
      } });
    }
    return Promise.resolve({ data: { data: [] } });
  });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.style.overflow = '';
  window.sessionStorage.clear();
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe('CallHistory', () => {
  it('keeps draft filters local until Apply and numbers cursor pages continuously', async () => {
    installApiMock();
    const user = userEvent.setup();
    render(<CallHistory />);

    expect(await screen.findByText('8')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
    const initialListRequests = mocks.get.mock.calls.filter(([url]) => url === '/calls').length;

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByLabelText('From')).toHaveValue(format(new Date(), 'yyyy-MM-dd'));
    expect(screen.getByLabelText('To')).toHaveValue(format(new Date(), 'yyyy-MM-dd'));
    await user.selectOptions(screen.getByLabelText('Direction'), 'missed');
    expect(mocks.get.mock.calls.filter(([url]) => url === '/calls')).toHaveLength(initialListRequests);
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(mocks.get.mock.calls.filter(([url]) => (
      url === '/calls'
    )).some(([, config]) => config.params.direction === 'missed')).toBe(true));

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('cell', { name: '3' })).toBeInTheDocument();
  });

  it('uses a keyboard-accessible modal overlay on mobile', async () => {
    installApiMock();
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(max-width: 640px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const user = userEvent.setup();
    render(<CallHistory />);
    await screen.findByText('Call history');
    const trigger = screen.getByRole('button', { name: 'Filters' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toHaveClass('call-filter-overlay');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
      expect(trigger).toHaveFocus();
    });
    expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores applied filters after navigating away and back', async () => {
    installApiMock();
    const user = userEvent.setup();
    const view = render(<CallHistory />);
    await screen.findByText('Call history');
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.selectOptions(screen.getByLabelText('Direction'), 'missed');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(mocks.get.mock.calls.filter(([url]) => url === '/calls').some(([, config]) => (
      config.params.direction === 'missed'
    ))).toBe(true));

    view.unmount();
    mocks.get.mockClear();
    render(<CallHistory />);
    await waitFor(() => expect(mocks.get.mock.calls.filter(([url]) => url === '/calls').some(([, config]) => (
      config.params.direction === 'missed'
    ))).toBe(true));
  });
});
