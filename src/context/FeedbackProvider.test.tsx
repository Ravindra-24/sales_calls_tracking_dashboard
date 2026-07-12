import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { FeedbackProvider } from './FeedbackProvider';
import { useFeedback } from './feedback';

afterEach(cleanup);

const ConfirmHarness = () => {
  const feedback = useFeedback();
  const [result, setResult] = useState('');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void feedback.confirm({ title: 'First queued action', message: 'First message' })
            .then((approved) => setResult((current) => `${current}first:${approved};`));
          void feedback.confirm({ title: 'Second queued action', message: 'Second message', variant: 'warning' })
            .then((approved) => setResult((current) => `${current}second:${approved};`));
        }}
      >
        Queue dialogs
      </button>
      <output>{result}</output>
    </>
  );
};

const PromptHarness = () => {
  const feedback = useFeedback();
  const [result, setResult] = useState('');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void feedback.requestText({
            title: 'Add rejection reason',
            label: 'Reason',
            minLength: 10,
            multiline: true,
          }).then((value) => setResult(value ?? 'cancelled'));
        }}
      >
        Open prompt
      </button>
      <output>{result}</output>
    </>
  );
};

const ToastHarness = () => {
  const { toast } = useFeedback();
  return (
    <button
      type="button"
      onClick={() => {
        toast({ message: 'Notification one' });
        toast({ message: 'Notification two', variant: 'success' });
        toast({ message: 'Notification three' });
        toast({ message: 'Notification four', variant: 'success' });
      }}
    >
      Show notifications
    </button>
  );
};

const DestructiveHarness = () => {
  const feedback = useFeedback();
  const [result, setResult] = useState('');
  return (
    <>
      <button
        type="button"
        onClick={() => void feedback.confirm({
          title: 'Delete API key',
          message: 'This cannot be undone.',
          confirmLabel: 'Delete key',
          variant: 'destructive',
        }).then((approved) => setResult(String(approved)))}
      >
        Open destructive action
      </button>
      <output>{result}</output>
    </>
  );
};

describe('FeedbackProvider', () => {
  it('queues dialogs, traps focus, restores focus, and cancels with Escape', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><ConfirmHarness /></FeedbackProvider>);
    const trigger = screen.getByRole('button', { name: 'Queue dialogs' });

    await user.click(trigger);
    const firstDialog = await screen.findByRole('dialog', { name: 'First queued action' });
    expect(screen.queryByText('Second queued action')).not.toBeInTheDocument();
    const primary = within(firstDialog).getByRole('button', { name: 'Confirm' });
    await waitFor(() => expect(primary).toHaveFocus());

    await user.tab();
    expect(within(firstDialog).getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(primary).toHaveFocus();

    await user.click(primary);
    const secondDialog = await screen.findByRole('alertdialog', { name: 'Second queued action' });
    expect(secondDialog).toBeInTheDocument();
    await waitFor(() => expect(within(secondDialog).getByRole('button', { name: 'Confirm' })).toHaveFocus());
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(screen.getByText(/first:true;/)).toBeInTheDocument();
      expect(screen.getByText(/second:false;/)).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
    });
  });

  it('keeps a text request open until prompt validation passes', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><PromptHarness /></FeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'Open prompt' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add rejection reason' });
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(within(dialog).getByText('This field is required.')).toBeInTheDocument();

    const reason = within(dialog).getByRole('textbox', { name: 'Reason' });
    await user.type(reason, 'Too short');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(within(dialog).getByText('Enter at least 10 characters.')).toBeInTheDocument();

    await user.type(reason, ' but now detailed');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByText('Too short but now detailed')).toBeInTheDocument());
  });

  it('cancels on backdrop interaction and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><DestructiveHarness /></FeedbackProvider>);
    const trigger = screen.getByRole('button', { name: 'Open destructive action' });

    await user.click(trigger);
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete API key' });
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByText('false')).toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('styles and resolves destructive confirmations explicitly', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><DestructiveHarness /></FeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'Open destructive action' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete API key' });
    const approve = within(dialog).getByRole('button', { name: 'Delete key' });
    expect(approve).toHaveClass('is-danger');
    await user.click(approve);

    await waitFor(() => expect(screen.getByText('true')).toBeInTheDocument());
  });

  it('announces no more than three visible toasts and keeps the newest ones', async () => {
    const user = userEvent.setup();
    render(<FeedbackProvider><ToastHarness /></FeedbackProvider>);

    await user.click(screen.getByRole('button', { name: 'Show notifications' }));
    const notifications = screen.getByLabelText('Notifications');
    expect(within(notifications).getAllByRole('status')).toHaveLength(3);
    expect(screen.queryByText('Notification one')).not.toBeInTheDocument();
    expect(screen.getByText('Notification four')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(3);
  });
});
