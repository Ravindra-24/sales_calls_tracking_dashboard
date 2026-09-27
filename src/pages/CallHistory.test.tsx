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

const installApiMock = (savedFilters: unknown[] = []) => {
  mocks.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    if (url.includes('/users')) return Promise.resolve({ data: { data: [{
      id: 'rep-1', name: 'Asha', email: 'asha@example.com', role: 'sales_member', status: 'active', createdAt: '', updatedAt: '',
    }] } });
    if (url === '/calls/filters') return Promise.resolve({ data: { data: savedFilters } });
    if (url === '/calls/summary') return Promise.resolve({ data: { data: {
      totalCalls: 8,
      connectedCalls: 5,
      notConnectedCalls: 1,
      missedCalls: 2,
      uniqueIncomingCalls: 3,
      uniqueOutgoingCalls: 4,
      uniqueConnectedCalls: 5,
    } } });
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
    expect(screen.getByText('Unique incoming')).toBeInTheDocument();
    expect(screen.getByText('Unique outgoing')).toBeInTheDocument();
    expect(screen.getByText('Unique connected')).toBeInTheDocument();
    expect(document.querySelectorAll('.call-summary-card')).toHaveLength(7);
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
    const initialListRequests = mocks.get.mock.calls.filter(([url]) => url === '/calls').length;

    expect(screen.getByRole('button', { name: 'Hide filters' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'From' })).toHaveTextContent(format(new Date(), 'd MMM yyyy'));
    expect(screen.getByRole('group', { name: 'To' })).toHaveTextContent(format(new Date(), 'd MMM yyyy'));
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

  it('applies salesperson, call-time sort, and saved filters from outside the filter card', async () => {
    installApiMock([{
      id: 'saved-1',
      name: 'Missed follow-ups',
      filters: { direction: 'missed', from: '2026-07-01T00:00:00.000Z', to: '2026-07-22T23:59:59.999Z' },
    }]);
    const user = userEvent.setup();
    render(<CallHistory />);
    await screen.findByRole('option', { name: 'Asha' });
    const listParams = () => mocks.get.mock.calls.filter(([url]) => url === '/calls').map(([, config]) => config.params);

    expect(listParams()[0].sort).toBe('desc');
    const card = document.getElementById('call-history-filters')!;
    expect(within(card).queryByLabelText('Salesperson')).not.toBeInTheDocument();
    expect(within(card).queryByLabelText('Saved filter')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Salesperson'), 'rep-1');
    await waitFor(() => expect(listParams().at(-1).repId).toBe('rep-1'));

    await user.selectOptions(screen.getByLabelText('Sort by call time'), 'asc');
    await waitFor(() => expect(listParams().at(-1)).toMatchObject({ repId: 'rep-1', sort: 'asc' }));

    await user.selectOptions(screen.getByLabelText('Saved filter'), 'saved-1');
    await waitFor(() => expect(listParams().at(-1)).toMatchObject({ direction: 'missed', sort: 'asc' }));
    expect(listParams().at(-1).repId).toBeUndefined();
    expect(screen.getByLabelText('Saved filter')).toHaveValue('saved-1');
  });

  it('applies a date picked in the MUI From field immediately', async () => {
    installApiMock();
    const user = userEvent.setup();
    render(<CallHistory />);
    await screen.findByText('Call history');
    const year = within(screen.getByRole('group', { name: 'From' })).getByRole('spinbutton', { name: 'Year' });
    await user.click(year);
    await user.keyboard('{ArrowDown}');

    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const expectedFrom = new Date(`${format(lastYear, 'yyyy-MM-dd')}T00:00:00`).toISOString();
    await waitFor(() => expect(mocks.get.mock.calls.filter(([url]) => url === '/calls').at(-1)?.[1].params.from).toBe(expectedFrom));
  });
});

