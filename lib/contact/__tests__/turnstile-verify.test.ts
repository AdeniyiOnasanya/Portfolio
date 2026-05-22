import { describe, expect, it, vi } from 'vitest';
import {
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_TEST_SECRET,
  verifyTurnstileToken,
} from '../turnstile-verify';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verifyTurnstileToken', () => {
  it('returns ok with hostname + challengeTs on a successful verification', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        success: true,
        hostname: 'davidonasanya.com',
        challenge_ts: '2026-05-20T12:00:00Z',
      }),
    );
    const result = await verifyTurnstileToken('t-stub', {
      secret: TURNSTILE_TEST_SECRET,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hostname).toBe('davidonasanya.com');
      expect(result.challengeTs).toBe('2026-05-20T12:00:00Z');
    }
  });

  it('posts secret + response + remoteip as form-urlencoded to the siteverify endpoint', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true }));
    await verifyTurnstileToken('t-stub', {
      secret: 'srv-secret',
      remoteIp: '203.0.113.5',
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(TURNSTILE_SITEVERIFY_URL);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    const body = new URLSearchParams(init?.body as string);
    expect(body.get('secret')).toBe('srv-secret');
    expect(body.get('response')).toBe('t-stub');
    expect(body.get('remoteip')).toBe('203.0.113.5');
  });

  it('omits remoteip when none is supplied', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true }));
    await verifyTurnstileToken('t-stub', {
      secret: 'srv-secret',
      fetchImpl,
    });
    const init = fetchImpl.mock.calls[0]?.[1];
    const body = new URLSearchParams(init?.body as string);
    expect(body.has('remoteip')).toBe(false);
  });

  it('returns ok:false rejected with error codes on a failed verification', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    );
    const result = await verifyTurnstileToken('t-stub', {
      secret: TURNSTILE_TEST_SECRET,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('rejected');
      expect(result.errorCodes).toEqual(['invalid-input-response']);
    }
  });

  it('classifies timeout-or-duplicate as a rejected verification (rapid resubmit)', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        success: false,
        'error-codes': ['timeout-or-duplicate'],
      }),
    );
    const result = await verifyTurnstileToken('t-stub', {
      secret: TURNSTILE_TEST_SECRET,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCodes[0]).toBe('timeout-or-duplicate');
    }
  });

  it('returns ok:false transport_error when the fetch rejects', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const result = await verifyTurnstileToken('t-stub', {
      secret: TURNSTILE_TEST_SECRET,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('transport_error');
    }
  });

  it('returns ok:false transport_error when the response body is unparseable', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('<<<not json>>>', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const result = await verifyTurnstileToken('t-stub', {
      secret: TURNSTILE_TEST_SECRET,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('transport_error');
    }
  });
});
