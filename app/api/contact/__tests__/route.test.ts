import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/contact/send', async () => {
  const actual = await vi.importActual<typeof import('@/lib/contact/send')>('@/lib/contact/send');
  return {
    ...actual,
    sendContactMessage: vi.fn(async () => ({ id: 'stub-msg-id' })),
  };
});

import {
  ContactSendConfigError,
  ContactSendDeliveryError,
  sendContactMessage,
} from '@/lib/contact/send';
import { POST } from '../route';

const sendMock = vi.mocked(sendContactMessage);

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

const validPayload = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Hello there.',
  turnstileToken: 't-stub',
};

describe('POST /api/contact', () => {
  it('returns 202 queued + delegated id on a valid submission', async () => {
    sendMock.mockResolvedValueOnce({ id: 'msg-123' });
    const response = await POST(makeJsonRequest(validPayload));
    expect(response.status).toBe(202);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: true, queued: true, id: 'msg-123' });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
    });
  });

  it('rejects malformed JSON (400 invalid_json)', async () => {
    const response = await POST(makeRawRequest('{not json'));
    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'invalid_json' });
  });

  it('rejects a missing turnstileToken with 422 invalid_payload', async () => {
    const { turnstileToken: _drop, ...rest } = validPayload;
    const response = await POST(makeJsonRequest(rest));
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe('invalid_payload');
  });

  it('rejects a U+2014 em-dash in name with 422 forbidden_character', async () => {
    const response = await POST(
      makeJsonRequest({ ...validPayload, name: `Ada${String.fromCodePoint(0x2014)}L` }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'forbidden_character', field: 'name' });
  });

  it('rejects an emoji in message with 422 forbidden_character', async () => {
    const response = await POST(
      makeJsonRequest({ ...validPayload, message: `Hello ${String.fromCodePoint(0x1f600)}` }),
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'forbidden_character', field: 'message' });
  });

  it('rejects a malformed email with 422 invalid_payload', async () => {
    const response = await POST(makeJsonRequest({ ...validPayload, email: 'not-an-email' }));
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe('invalid_payload');
  });

  it('returns 503 contact_send_unavailable when Resend config is missing', async () => {
    sendMock.mockRejectedValueOnce(new ContactSendConfigError('RESEND_API_KEY'));
    const response = await POST(makeJsonRequest(validPayload));
    expect(response.status).toBe(503);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'contact_send_unavailable' });
  });

  it('returns 502 contact_send_failed when Resend delivery fails', async () => {
    sendMock.mockRejectedValueOnce(new ContactSendDeliveryError('upstream rate limit'));
    const response = await POST(makeJsonRequest(validPayload));
    expect(response.status).toBe(502);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: false, error: 'contact_send_failed' });
  });
});
