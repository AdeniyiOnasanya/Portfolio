import { z } from 'zod';

const EM_DASH = /\u2014/u;
const EMOJI = /\p{Extended_Pictographic}/u;

export const SafeText = z
  .string()
  .min(1)
  .superRefine((value, ctx) => {
    if (EM_DASH.test(value)) {
      ctx.addIssue({
        code: 'custom',
        message:
          'must not contain U+2014 em-dash; use a comma, colon, semicolon, or pair of parentheses instead.',
      });
    }
    if (EMOJI.test(value)) {
      ctx.addIssue({
        code: 'custom',
        message: 'must not contain an emoji (Extended_Pictographic codepoint).',
      });
    }
  });
