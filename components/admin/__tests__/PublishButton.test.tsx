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

  it('renders the draft-updated copy when the API reports reused=true', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          pullRequestUrl: 'https://github.com/owner/repo/pull/42',
          pullRequestNumber: 42,
          branchName: 'cms/hero-3a4f9b2c',
          reused: true,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/draft updated/i)).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /pull request/i });
    expect(link).toHaveAttribute('href', 'https://github.com/owner/repo/pull/42');
  });

  /*
   * Token + repo configuration mappings, slice #51.
   *
   * The server tags structured failures with a stable `error` string the
   * button forwards to the modal. The button's own status fallback only
   * fires when the body shape is missing or unrecognised, so each named
   * code here is asserted via the JSON body, not the HTTP status.
   */

  it('shows token_invalid copy when the server returns error: token_invalid', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'token_invalid' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/token is invalid or revoked/i)).toBeInTheDocument();
  });

  it('shows token_scope copy when the server returns error: token_scope', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'token_scope' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/lacks required scope/i)).toBeInTheDocument();
  });

  it('shows repo_not_found copy when the server returns error: repo_not_found', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'repo_not_found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/repo not found/i)).toBeInTheDocument();
  });

  it('forwards a forbidden_character field from the 422 body to the modal', async () => {
    // The route handler distinguishes a forbidden-char throw from the
    // generic 'unprocessable' code by emitting `error: 'forbidden_character'`
    // plus a `field` key. The button must read both and pass them through
    // so the operator sees the offending field path.
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: 'forbidden_character',
          field: 'hero.person.name',
        }),
        { status: 422, headers: { 'content-type': 'application/json' } },
      ),
    );
    render(<PublishButton section="hero" />);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(await screen.findByText(/hero\.person\.name/)).toBeInTheDocument();
    expect(screen.getByText(/em-dash or emoji/i)).toBeInTheDocument();
  });
});
