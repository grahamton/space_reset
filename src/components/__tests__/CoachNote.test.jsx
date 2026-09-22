import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoachNote from '../CoachNote';

describe('CoachNote', () => {
  it('renders nothing when there is no note', () => {
    const { container } = render(<CoachNote note={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the note text', () => {
    render(<CoachNote note="Alright, let's move." />);
    expect(screen.getByRole('status')).toHaveTextContent("Alright, let's move.");
  });

  it('can be dismissed', () => {
    render(<CoachNote note="Alright, let's move." />);
    fireEvent.click(screen.getByLabelText('Dismiss coach note'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
