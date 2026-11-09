import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
const actions = vi.hoisted(() => ({ openOrganiserLinkAction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/court-board/organiser-actions', () => actions);

import { OrganiserLinkOpener } from './organiser-link-opener';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

beforeEach(() => {
  router.refresh.mockReset();
  router.replace.mockReset();
  actions.openOrganiserLinkAction.mockReset().mockResolvedValue({ ok: true });
  window.history.replaceState(null, '', '/labs/court-board/o');
});

afterEach(cleanup);

describe('OrganiserLinkOpener', () => {
  it('posts the token from after #, then drops it from the address bar and reloads', async () => {
    window.history.replaceState(null, '', `/labs/court-board/o?session=x#${TOKEN}`);
    render(<OrganiserLinkOpener fallback={<p>Not valid</p>} />);

    expect(screen.getByRole('status')).toHaveTextContent('Opening the organiser page…');
    expect(actions.openOrganiserLinkAction).toHaveBeenCalledTimes(1);
    expect(actions.openOrganiserLinkAction).toHaveBeenCalledWith(TOKEN);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith('/labs/court-board/o?session=x', {
      scroll: false,
    });
  });

  it('shows the fallback when there is no token, without calling the server', async () => {
    render(<OrganiserLinkOpener fallback={<p>Not valid</p>} />);
    expect(await screen.findByText('Not valid')).toBeInTheDocument();
    expect(actions.openOrganiserLinkAction).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('still reloads (to the fallback) when the server refuses the token', async () => {
    actions.openOrganiserLinkAction.mockResolvedValue({ ok: false, error: 'unauthorised' });
    window.history.replaceState(null, '', `/labs/court-board/o#${TOKEN}`);
    render(<OrganiserLinkOpener fallback={<p>Not valid</p>} />);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Not valid')).toBeInTheDocument();
  });

  it('opens a new link pasted while already on the page', async () => {
    render(<OrganiserLinkOpener />);
    expect(actions.openOrganiserLinkAction).not.toHaveBeenCalled();

    act(() => {
      window.history.replaceState(null, '', `/labs/court-board/o#${TOKEN}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(actions.openOrganiserLinkAction).toHaveBeenCalledWith(TOKEN);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith('/labs/court-board/o', { scroll: false });
  });
});
