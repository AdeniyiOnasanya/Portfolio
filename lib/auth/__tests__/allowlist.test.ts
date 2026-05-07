import { describe, expect, it } from 'vitest';
import { assertAllowlistConfigured, isAllowedAdminEmail } from '../allowlist';

/*
 * Allowlist tests, Phase 6 magic-link sign-in (#36, #37).
 *
 * The admin allowlist is the single decision point that distinguishes "send a
 * magic link" from "no-op silently". Any leak in case-sensitivity, whitespace,
 * or empty-config handling is a security bug, so the cases below are
 * exhaustive on those axes.
 */

describe('isAllowedAdminEmail()', () => {
  const admin = 'admin@example.com';

  it('returns true for an exact match', () => {
    expect(isAllowedAdminEmail('admin@example.com', admin)).toBe(true);
  });

  it('returns true for an uppercase variant (case-insensitive)', () => {
    expect(isAllowedAdminEmail('ADMIN@EXAMPLE.COM', admin)).toBe(true);
  });

  it('returns true when the input is padded with whitespace', () => {
    expect(isAllowedAdminEmail('  admin@example.com  ', admin)).toBe(true);
  });

  it('returns true when the configured value is padded with whitespace', () => {
    expect(isAllowedAdminEmail('admin@example.com', '  admin@example.com  ')).toBe(true);
  });

  it('returns false for a different email', () => {
    expect(isAllowedAdminEmail('attacker@example.com', admin)).toBe(false);
  });

  it('returns false for an empty input string', () => {
    expect(isAllowedAdminEmail('', admin)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isAllowedAdminEmail(null, admin)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isAllowedAdminEmail(undefined, admin)).toBe(false);
  });

  it('returns false when the configured admin is undefined (fail-closed)', () => {
    expect(isAllowedAdminEmail('admin@example.com', undefined)).toBe(false);
  });

  it('returns false when the configured admin is an empty string (fail-closed)', () => {
    expect(isAllowedAdminEmail('admin@example.com', '')).toBe(false);
  });

  it('returns false when the configured admin is whitespace-only (fail-closed)', () => {
    expect(isAllowedAdminEmail('admin@example.com', '   ')).toBe(false);
  });
});

describe('assertAllowlistConfigured()', () => {
  it('throws when the configured value is undefined', () => {
    expect(() => assertAllowlistConfigured(undefined)).toThrow(/ADMIN_EMAIL is not configured/);
  });

  it('throws when the configured value is an empty string', () => {
    expect(() => assertAllowlistConfigured('')).toThrow(/ADMIN_EMAIL is not configured/);
  });

  it('throws when the configured value is whitespace-only', () => {
    expect(() => assertAllowlistConfigured('   ')).toThrow(/ADMIN_EMAIL is not configured/);
  });

  it('does not throw when the configured value is a non-empty string', () => {
    expect(() => assertAllowlistConfigured('admin@example.com')).not.toThrow();
  });

  it('does not include the configured value in the error message (no leak)', () => {
    let message = '';
    try {
      assertAllowlistConfigured('');
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toBe('ADMIN_EMAIL is not configured');
  });
});
