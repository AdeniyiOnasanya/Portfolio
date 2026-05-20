import { z } from 'zod';
import { SafeText } from '../text/safeText';

/**
 * Contact form payload schema, Phase 10 slice #59.
 *
 * The schema is the only thing standing between the public form and
 * Resend, so it validates every field independently:
 *
 *  - name and message run through `SafeText`, which already rejects
 *    U+2014 and `\p{Extended_Pictographic}` codepoints (the same
 *    refinement used by the admin publish pipeline and Auth.js sign-in
 *    emails). A submission with either character returns 422 from the
 *    route, never reaches Resend, and the client surfaces the error.
 *  - email is parsed with the built-in Zod `email` rule and capped at
 *    320 characters (the RFC 5321 path-+-domain ceiling) so a bug or
 *    abusive form fill cannot send unbounded strings into the email
 *    gateway.
 *  - turnstileToken is required and non-empty; full server-side
 *    verification of the token value lands in slice #60.
 *
 * The bodies are length-bounded:
 *   name    1-120 chars
 *   email   <= 320 chars
 *   message 1-4000 chars
 *
 * The same bounds are enforced client-side via the `<input maxLength>`
 * attributes on `<ContactForm>`, so a normal submission cannot trip
 * the parse step; the schema is the boundary, not the UI hint.
 */
export const ContactPayloadSchema = z.object({
  name: SafeText.max(120),
  email: z.string().email().max(320),
  message: SafeText.max(4000),
  turnstileToken: z.string().min(1),
});

export type ContactPayload = z.infer<typeof ContactPayloadSchema>;
