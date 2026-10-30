import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoRefresh } from './auto-refresh';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  refresh.mockReset();
});

describe('AutoRefresh', () => {
  it('refreshes every 30 seconds while the tab is visible', () => {
    render(<AutoRefresh />);
    vi.advanceTimersByTime(29_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not refresh a hidden tab', () => {
    render(<AutoRefresh />);
    setVisibility('hidden');
    vi.advanceTimersByTime(90_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes when the Player returns to the tab', () => {
    render(<AutoRefresh />);
    vi.advanceTimersByTime(10_000);
    window.dispatchEvent(new Event('focus'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops when unmounted', () => {
    const { unmount } = render(<AutoRefresh />);
    unmount();
    vi.advanceTimersByTime(120_000);
    window.dispatchEvent(new Event('focus'));
    expect(refresh).not.toHaveBeenCalled();
  });
});
