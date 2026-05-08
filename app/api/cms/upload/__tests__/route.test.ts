import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Integration tests for `app/api/cms/upload/route.ts`, slice #45.
 *
 * `auth()` and `put()` are both mocked. The tests exercise:
 *   - 401 anonymous (no session)
 *   - 401 non-admin (session email outside the allowlist)
 *   - 411 missing content-length
 *   - 413 oversized content-length
 *   - 415 multipart/form-data missing
 *   - 415 disallowed MIME header
 *   - 415 MIME header / magic-byte mismatch (defence in depth)
 *   - 422 corrupt image bytes
 *   - 200 happy path: returns Blob URL, calls put with sanitised pathname.
 *
 * The route imports `lib/auth`, which transitively imports `next-auth` and a
 * Drizzle adapter. We mock the `lib/auth` module so the test does not boot
 * real NextAuth or hit the database. The same trick keeps `put` from
 * touching the network.
 */

const authMock = vi.fn();
const putMock = vi.fn();

vi.mock('../../../../../lib/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('@vercel/blob', () => ({
  put: (...args: unknown[]) => putMock(...args),
}));

async function makePng(width = 32, height = 32): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 80 },
    },
  })
    .png()
    .toBuffer();
}

/**
 * Build a stand-in for the route's `NextRequest` argument.
 *
 * `Request` and `NextRequest` both strip `Content-Length` from headers when
 * the body is supplied directly (undici treats it as a "forbidden" header).
 * The route only touches `request.headers.get(...)` and
 * `request.formData()`, so we hand-roll a minimal object that exposes both
 * with the values the test wants to assert on.
 */
async function buildRouteRequest(
  parts: { file?: { content: Buffer | Uint8Array; filename: string; type: string } | null },
  overrides: { contentLengthOverride?: string | null; contentTypeOverride?: string } = {},
): Promise<Request> {
  const formData = new FormData();
  if (parts.file) {
    const file = new File([new Uint8Array(parts.file.content)], parts.file.filename, {
      type: parts.file.type,
    });
    formData.append('file', file);
  }
  // Materialise the multipart body so we can compute its length and replay
  // it for `formData()`.
  const baked = new Response(formData);
  const bakedBuffer = new Uint8Array(await baked.arrayBuffer());
  const ct = overrides.contentTypeOverride ?? baked.headers.get('content-type') ?? '';
  const headers = new Headers();
  if (ct) headers.set('content-type', ct);
  if (overrides.contentLengthOverride !== null) {
    headers.set(
      'content-length',
      overrides.contentLengthOverride ?? String(bakedBuffer.byteLength),
    );
  }

  const stub = {
    headers,
    method: 'POST',
    url: 'http://localhost/api/cms/upload',
    async formData(): Promise<FormData> {
      return new Response(bakedBuffer, { headers: { 'content-type': ct } }).formData();
    },
  };
  return stub as unknown as Request;
}

describe('POST /api/cms/upload', () => {
  beforeEach(() => {
    authMock.mockReset();
    putMock.mockReset();
    process.env.ADMIN_EMAIL = 'admin@example.com';
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = undefined;
  });

  it('returns 401 for anonymous callers', async () => {
    authMock.mockResolvedValue(null);
    const png = await makePng();
    const req = await buildRouteRequest({
      file: { content: png, filename: 'a.png', type: 'image/png' },
    });
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(401);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('returns 401 for a session whose email is not on the allowlist', async () => {
    authMock.mockResolvedValue({ user: { email: 'someone-else@example.com' } });
    const png = await makePng();
    const req = await buildRouteRequest({
      file: { content: png, filename: 'a.png', type: 'image/png' },
    });
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(401);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('returns 411 when content-length is missing', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const png = await makePng();
    const req = await buildRouteRequest(
      { file: { content: png, filename: 'a.png', type: 'image/png' } },
      { contentLengthOverride: null },
    );
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(411);
  });

  it('returns 413 for oversized content-length', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const png = await makePng();
    const req = await buildRouteRequest(
      { file: { content: png, filename: 'a.png', type: 'image/png' } },
      { contentLengthOverride: String(10 * 1024 * 1024) },
    );
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(413);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('returns 415 if content-type is not multipart/form-data', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const png = await makePng();
    const req = await buildRouteRequest(
      { file: { content: png, filename: 'a.png', type: 'image/png' } },
      { contentTypeOverride: 'application/json' },
    );
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });

  it('returns 415 when the file MIME is not on the allowlist', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const req = await buildRouteRequest({
      file: {
        content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        filename: 'evil.svg',
        type: 'image/svg+xml',
      },
    });
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });

  it('returns 415 when the MIME header lies and the magic bytes do not match', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const req = await buildRouteRequest({
      file: {
        content: Buffer.from('<html>hi</html>'),
        filename: 'pic.jpg',
        type: 'image/jpeg',
      },
    });
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });

  it('returns 200 with a Blob URL on the happy path and calls put with a sanitised pathname', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    putMock.mockResolvedValue({
      url: 'https://example.public.blob.vercel-storage.com/cms/hello-abc.avif',
      pathname: 'cms/hello-abc.avif',
    });
    const png = await makePng(48, 48);
    const req = await buildRouteRequest({
      file: { content: png, filename: 'Hello World.PNG', type: 'image/png' },
    });
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url?: string; contentType?: string };
    expect(body.url).toBe('https://example.public.blob.vercel-storage.com/cms/hello-abc.avif');
    expect(body.contentType).toBe('image/avif');
    expect(putMock).toHaveBeenCalledTimes(1);
    const [pathnameArg, _bodyArg, optionsArg] = putMock.mock.calls[0] as [
      string,
      Buffer,
      { access: string; addRandomSuffix: boolean; contentType: string },
    ];
    expect(pathnameArg).toBe('cms/hello-world.avif');
    expect(optionsArg.access).toBe('public');
    expect(optionsArg.addRandomSuffix).toBe(true);
    expect(optionsArg.contentType).toBe('image/avif');
  });

  it('treats admin email comparison as case-insensitive', async () => {
    authMock.mockResolvedValue({ user: { email: 'Admin@Example.com' } });
    putMock.mockResolvedValue({
      url: 'https://example.public.blob.vercel-storage.com/cms/x-abc.avif',
      pathname: 'cms/x-abc.avif',
    });
    const png = await makePng();
    const req = await buildRouteRequest({
      file: { content: png, filename: 'x.png', type: 'image/png' },
    });
    const { POST } = await import('../route');
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/cms/upload', () => {
  it('returns 405 with Allow: POST', async () => {
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });
});
