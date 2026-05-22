import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../Modal';

describe('<Modal />', () => {
  it('renders as role="dialog" with aria-modal and labelled by the title', () => {
    render(
      <Modal title="Discard draft?" onClose={() => {}}>
        <p>Unsaved changes will be lost.</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Discard draft?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders the children and the action row', () => {
    render(
      <Modal
        title="Confirm"
        onClose={() => {}}
        actions={
          <>
            <button type="button">Cancel</button>
            <button type="button">Discard</button>
          </>
        }
      >
        <p>Body copy.</p>
      </Modal>,
    );
    expect(screen.getByText('Body copy.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('invokes onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal title="Confirm" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when the mask close button is clicked but not when the card is', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Confirm" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    const card = container.querySelector('.modal') as HTMLElement;
    fireEvent.click(card);
    expect(onClose).not.toHaveBeenCalled();
    const close = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses a custom closeLabel when supplied', () => {
    render(
      <Modal title="Confirm" onClose={() => {}} closeLabel="Dismiss">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('moves focus to the dialog card on mount', () => {
    render(
      <Modal title="Confirm" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });
});
