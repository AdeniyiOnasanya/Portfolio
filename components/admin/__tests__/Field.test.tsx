import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from '../Field';

describe('<Field />', () => {
  it('associates the label with the input via htmlFor and id', () => {
    render(
      <Field
        id="hero-headline"
        label="Headline"
        renderInput={({ inputId }) => <input id={inputId} type="text" defaultValue="" />}
      />,
    );
    const input = screen.getByLabelText('Headline');
    expect(input).toHaveAttribute('id', 'hero-headline');
  });

  it('renders an optional hint inside the label and points aria-describedby at it', () => {
    render(
      <Field
        id="hero-headline"
        label="Headline"
        hint="Up to 80 characters"
        renderInput={({ inputId, describedBy }) => (
          <input id={inputId} type="text" aria-describedby={describedBy} defaultValue="" />
        )}
      />,
    );
    const input = screen.getByLabelText(/Headline/);
    expect(input).toHaveAttribute('aria-describedby', 'hero-headline-hint');
    expect(screen.getByText('Up to 80 characters')).toHaveAttribute('id', 'hero-headline-hint');
  });

  it('renders the inline error with role="alert" and adds it to aria-describedby', () => {
    render(
      <Field
        id="hero-headline"
        label="Headline"
        error="Headline is required"
        renderInput={({ inputId, describedBy, invalid }) => (
          <input
            id={inputId}
            type="text"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            defaultValue=""
          />
        )}
      />,
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Headline is required');
    expect(error).toHaveAttribute('id', 'hero-headline-error');
    const input = screen.getByLabelText('Headline');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('hero-headline-error');
  });

  it('chains hint and error ids in aria-describedby when both are present', () => {
    render(
      <Field
        id="bio"
        label="Bio"
        hint="No em-dash, no emoji"
        error="must not contain U+2014 em-dash; use a comma, colon, or semicolon."
        renderInput={({ inputId, describedBy, invalid }) => (
          <textarea
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            defaultValue=""
          />
        )}
      />,
    );
    const input = screen.getByLabelText(/Bio/);
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toEqual(['bio-hint', 'bio-error']);
  });

  it('does not render the error node when no error is supplied', () => {
    render(
      <Field
        id="hero-headline"
        label="Headline"
        renderInput={({ inputId }) => <input id={inputId} type="text" defaultValue="" />}
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
