import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionSummaryDrawer from '../SessionSummaryDrawer';

const sessionState = {
  completedCount: 1,
  missionQueue: [
    { id: 'm1', title: 'Mugs out', description: 'All mugs to the sink.' },
    { id: 'm2', title: 'Floor clothes', description: 'Clothes into the basket.' }
  ]
};

describe('SessionSummaryDrawer', () => {
  it('hides the off-screen list from screen readers and focus until opened', () => {
    render(<SessionSummaryDrawer sessionState={sessionState} />);
    const toggle = screen.getByRole('button', { name: /your missions: 1 of 2 done/i });

    // Collapsed: the list is inert, so it isn't read after every mission.
    expect(screen.queryByRole('heading', { name: /floor clothes/i })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Now: Floor clothes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done: Mugs out' })).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<SessionSummaryDrawer sessionState={sessionState} />);
    const toggle = screen.getByRole('button', { name: /your missions/i });

    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
