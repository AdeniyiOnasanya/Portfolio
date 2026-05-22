import { z } from 'zod';

/**
 * Shared draft shapes for the hero section.
 *
 * Three call sites consume these: the editor (`HeroEditor`), the section
 * page (`/admin/hero`), and the live preview (`/admin/preview`). Keeping
 * the types in one module means a future field addition lands once and the
 * three call sites stay aligned automatically.
 *
 * The Zod schema is intentionally permissive: every field is optional and
 * the shape is the in-progress draft, not the publish-time payload that
 * `lib/schema.ts` validates. The schema is exported so the server pages
 * can `safeParse` an unknown JSONB blob from the `drafts` table rather than
 * `as`-casting a record without inspection.
 */

export const HeroPersonDraftSchema = z
  .object({
    name: z.string().optional(),
    nameAccent: z.string().optional(),
    role: z.string().optional(),
    location: z.string().optional(),
    yearsExp: z.number().optional(),
    statement: z.string().optional(),
    longBio: z.array(z.string()).optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .partial();

export const HeroDraftSchema = z
  .object({
    person: HeroPersonDraftSchema.optional(),
    hidden: z.boolean().optional(),
  })
  .partial();

export type HeroPersonDraft = z.infer<typeof HeroPersonDraftSchema>;
export type HeroDraft = z.infer<typeof HeroDraftSchema>;

/**
 * Parse an unknown JSONB blob from the `drafts` table into a typed
 * `HeroDraft` or null. Returns null on any shape mismatch so the call site
 * can fall back to the seeded site content rather than render a corrupt
 * shape.
 */
export function parseHeroDraft(value: unknown): HeroDraft | null {
  const result = HeroDraftSchema.safeParse(value);
  return result.success ? result.data : null;
}
