/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublishButton } from '../PublishButton';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PublishButton', () => {
  it('posts to /api/cms/save with the configured section', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, pullRequestUrl: 'https://x', pullRequestNumber: 1 }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cms/save',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
        body: JSON.stringify({ section: 'hero' }),
      }),
    );
  });

  it('disables the button while a publish is in flight to block double-clicks', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<PublishButton section="hero" />);
    const button = screen.getByRole('button', { name: /publish/i });
    fireEvent.click(button);
    // Second click while the first is in flight must not trigger another fetch.
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch?.(
      new Response(
        JSON.stringify({ ok: true, pullRequestUrl: 'https://x', pullRequestNumber: 1 }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('opens the result modal with the PR URL on success', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          pullRequestUrl: 'https://github.com/owner/repo/pull/42',
          pullRequestNumber: 42,
          branchName: 'cms/1-hero',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    const link = await screen.findByRole('link', { name: /pull request/i });
    expect(link).toHaveAttribute('href', 'https://github.com/owner/repo/pull/42');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('opens the result modal with a readable error on a structured failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'unprocessable' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      }),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/em-dash or emoji/i)).toBeInTheDocument();
  });

  it('opens the result modal with a generic error on a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/could not reach the publish endpoint/i)).toBeInTheDocument();
  });
});
