import { describe, expect, it } from 'vitest';
import { POST } from '../route';

// The stub route lives in slice #58. Slice #59 will swap the body for
// a Resend send + Zod payload guard; slice #60 will layer the Turnstile
// verifier on top. The tests below pin the contract the client form
// relies on so later swaps cannot regress the protocol silently.

function makeJsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(body: string): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('POST /api/contact', () => {
  it('returns 202 ok queued when the Turnstile token is present', async () => {
    const response = await POST(
      makeJsonRequest({
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello.',
        turnstileToken: 't-stub',
      }),
    );
    expect(response.status).toBe(202);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: true, queued: true });
  });

  it('rejects requests with no Turnstile token (400 missing_turnstile_token)', async () => {
    const response = await POST(
      makeJsonRequest({ name: 'Ada', email: 'ada@example.com', message: 'Hello.' }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'missing_turnstile_token' });
  });

  it('rejects requests with an empty-string Turnstile token (400 missing_turnstile_token)', async () => {
    const response = await POST(
      makeJsonRequest({
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello.',
        turnstileToken: '',
      }),
    );
    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON (400 invalid_json)', async () => {
    const response = await POST(makeRawRequest('{not json'));
    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'invalid_json' });
  });
});
