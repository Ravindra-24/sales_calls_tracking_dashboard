import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
});

describe('Reveal', () => {
  it('shows content immediately without constructing an observer for reduced motion', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const observer = vi.fn();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: observer,
    });

    const { container } = render(<Reveal>Visible content</Reveal>);

    await waitFor(() => expect(container.firstElementChild).toHaveClass('is-visible'));
    expect(observer).not.toHaveBeenCalled();
  });
});
