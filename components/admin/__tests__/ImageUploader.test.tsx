import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageUploader } from '../ImageUploader';

/*
 * RTL coverage for `components/admin/ImageUploader.tsx`, slice #45.
 *
 * Asserts the design contract from `admin-shared.jsx#L136-L170` is mirrored:
 *   - empty state shows the NO IMAGE pill
 *   - the dropzone is a focusable button with the design copy
 *   - oversized files are caught client-side without a network round trip
 *   - disallowed MIME types are caught client-side
 *   - a happy upload posts to /api/cms/upload and calls onChange with the URL
 *   - server failures show an inline error
 *
 * `fetch` is mocked per test; the route handler is exercised in its own
 * integration spec.
 */

const ORIGINAL_FETCH = global.fetch;

describe('ImageUploader', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  it('shows the NO IMAGE pill in the empty state', () => {
    render(<ImageUploader value={null} onChange={vi.fn()} />);
    expect(screen.getByText('NO IMAGE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /drop image or click/i })).toBeInTheDocument();
  });

  it('renders the preview thumbnail when a value is supplied', () => {
    const url = 'https://example.public.blob.vercel-storage.com/cms/hero.avif';
    render(<ImageUploader value={url} onChange={vi.fn()} />);
    const preview = screen.getByRole('img', { name: /preview/i });
    expect(preview).toHaveStyle({ backgroundImage: `url(${url})` });
    expect(screen.queryByText('NO IMAGE')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('calls onChange(null) when Clear is pressed', () => {
    const onChange = vi.fn();
    render(<ImageUploader value="https://x.com/y.avif" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('rejects an oversized file client-side without calling fetch', () => {
    const onChange = vi.fn();
    render(<ImageUploader value={null} onChange={onChange} />);
    // 2 MiB synthetic file (over the 1.5 MiB cap).
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, { target: { files: [big] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/1\.5\s?MiB/);
  });

  it('rejects a disallowed MIME type client-side', () => {
    const onChange = vi.fn();
    render(<ImageUploader value={null} onChange={onChange} />);
    const svg = new File(['<svg/>'], 'evil.svg', { type: 'image/svg+xml' });
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    fireEvent.change(input as HTMLInputElement, { target: { files: [svg] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/jpeg|png|webp|avif/i);
  });

  it('posts a multipart body to /api/cms/upload and forwards the returned URL', async () => {
    const onChange = vi.fn();
    const url = 'https://example.public.blob.vercel-storage.com/cms/hero-abc.avif';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ url }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    render(<ImageUploader value={null} onChange={onChange} />);
    const file = new File([new Uint8Array(1024)], 'hero.png', { type: 'image/png' });
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(url));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe('/api/cms/upload');
    expect(calledInit.method).toBe('POST');
    expect(calledInit.body).toBeInstanceOf(FormData);
    const fd = calledInit.body as FormData;
    expect(fd.get('file')).toBeInstanceOf(File);
  });

  it('surfaces a server-side rejection as an inline error', async () => {
    const onChange = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: 'unsupported_media' }), { status: 415 }),
    );
    render(<ImageUploader value={null} onChange={onChange} />);
    const file = new File([new Uint8Array(1024)], 'hero.png', { type: 'image/png' });
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('surfaces a network failure as an inline error', async () => {
    const onChange = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    render(<ImageUploader value={null} onChange={onChange} />);
    const file = new File([new Uint8Array(1024)], 'hero.png', { type: 'image/png' });
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });
});
