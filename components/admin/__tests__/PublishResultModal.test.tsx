/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublishResultModal } from '../PublishResultModal';

/*
 * PublishResultModal tests, Phase 8 slice #49.
 *
 * The forbidden-character path is the operator's clearest fix-it loop:
 * the modal must name the offending field so the editor knows which
 * input to clean. The other error states are covered indirectly by the
 * PublishButton tests; the cases here pin the field-named copy because
 * that is the new surface this slice ships.
 */

describe('PublishResultModal forbidden_character', () => {
  it('renders the field name passed alongside the errorCode', () => {
    render(
      <PublishResultModal
        outcome={{ ok: false, errorCode: 'forbidden_character', field: 'hero.person.name' }}
        onClose={vi.fn()}
      />,
    );
    // The field path is rendered verbatim so the operator can scan and
    // jump to the correct input.
    expect(screen.getByText(/hero\.person\.name/)).toBeInTheDocument();
  });

  it('explains that an em-dash or emoji caused the failure', () => {
    render(
      <PublishResultModal
        outcome={{
          ok: false,
          errorCode: 'forbidden_character',
          field: 'hero.person.statement',
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/em-dash or emoji/i)).toBeInTheDocument();
  });

  it('falls back to a generic message when forbidden_character has no field', () => {
    // Defence in depth: if the server ever returns the code without a
    // field (parse error, future schema change), the modal still renders
    // a readable error rather than crashing on undefined.
    render(
      <PublishResultModal
        outcome={{ ok: false, errorCode: 'forbidden_character' }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/em-dash or emoji/i)).toBeInTheDocument();
  });
});
