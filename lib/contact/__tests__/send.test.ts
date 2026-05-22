import { describe, expect, it, vi } from 'vitest';
import { ContactSendConfigError, ContactSendDeliveryError, sendContactMessage } from '../send';

const validPayload = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Line one.\nLine two.',
  turnstileToken: 't-stub',
};

function makeSender() {
  const send = vi.fn(async () => ({ data: { id: 'msg-123' }, error: null }));
  return {
    send,
    factory: vi.fn(() => ({ emails: { send } })),
  };
}

describe('sendContactMessage', () => {
  it('throws ContactSendConfigError when the Resend API key is missing', async () => {
    await expect(
      sendContactMessage(validPayload, {
        resendApiKey: undefined,
        fromAddress: 'from@example.com',
        toAddress: 'admin@example.com',
      }),
    ).rejects.toBeInstanceOf(ContactSendConfigError);
  });

  it('throws ContactSendConfigError when the from address is missing', async () => {
    await expect(
      sendContactMessage(validPayload, {
        resendApiKey: 'key',
        fromAddress: undefined,
        toAddress: 'admin@example.com',
      }),
    ).rejects.toBeInstanceOf(ContactSendConfigError);
  });

  it('throws ContactSendConfigError when the admin email is missing', async () => {
    await expect(
      sendContactMessage(validPayload, {
        resendApiKey: 'key',
        fromAddress: 'from@example.com',
        toAddress: undefined,
      }),
    ).rejects.toBeInstanceOf(ContactSendConfigError);
  });

  it('passes the rendered payload to the Resend sender and returns the message id', async () => {
    const sender = makeSender();
    const result = await sendContactMessage(validPayload, {
      resendApiKey: 'key',
      fromAddress: 'from@example.com',
      toAddress: 'admin@example.com',
      createSender: sender.factory,
    });
    expect(result.id).toBe('msg-123');
    expect(sender.factory).toHaveBeenCalledWith('key');
    expect(sender.send).toHaveBeenCalledOnce();
    const call = sender.send.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      from: 'from@example.com',
      to: 'admin@example.com',
      subject: 'Contact form: Ada Lovelace',
      replyTo: 'ada@example.com',
    });
    expect(call?.text).toContain('From: Ada Lovelace <ada@example.com>');
    expect(call?.text).toContain('Line one.');
    expect(call?.html).toContain('ada@example.com');
  });

  it('escapes HTML control characters before they reach the email body', async () => {
    const sender = makeSender();
    await sendContactMessage(
      {
        ...validPayload,
        name: 'Ada <script>',
        message: 'A & B',
      },
      {
        resendApiKey: 'key',
        fromAddress: 'from@example.com',
        toAddress: 'admin@example.com',
        createSender: sender.factory,
      },
    );
    const html = (sender.send.mock.calls[0]?.[0]?.html ?? '') as string;
    expect(html).toContain('Ada &lt;script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).not.toContain('<script>');
  });

  it('throws ContactSendDeliveryError when Resend reports an error', async () => {
    const sender = makeSender();
    sender.send.mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } });
    await expect(
      sendContactMessage(validPayload, {
        resendApiKey: 'key',
        fromAddress: 'from@example.com',
        toAddress: 'admin@example.com',
        createSender: sender.factory,
      }),
    ).rejects.toBeInstanceOf(ContactSendDeliveryError);
  });
});
