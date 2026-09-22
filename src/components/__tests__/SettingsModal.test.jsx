import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from '../SettingsModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  roomType: 'bedroom',
  onRoomTypeChange: vi.fn(),
  difficulty: 'medium',
  onDifficultyChange: vi.fn(),
  missionCount: 'auto',
  onMissionCountChange: vi.fn(),
  streakIncludesSkips: true,
  onStreakIncludesSkipsChange: vi.fn()
};

const renderModal = (overrides = {}) => render(<SettingsModal {...defaultProps} {...overrides} />);

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders as an accessible dialog when open', () => {
    renderModal();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('offers both room type and difficulty', () => {
    renderModal();

    expect(screen.getByText('Which room?')).toBeInTheDocument();
    expect(screen.getByText('How much energy today?')).toBeInTheDocument();
    expect(screen.getByText('Bedroom')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('reports a room type selection', () => {
    renderModal();

    fireEvent.click(screen.getByText('Kitchen'));
    expect(defaultProps.onRoomTypeChange).toHaveBeenCalledWith('kitchen');
  });

  it('reports a difficulty selection', () => {
    renderModal();

    fireEvent.click(screen.getByText('Easy'));
    expect(defaultProps.onDifficultyChange).toHaveBeenCalledWith('easy');
  });

  it('offers a mission count control, defaulting to Auto', () => {
    renderModal();

    expect(screen.getByText('How many missions?')).toBeInTheDocument();
    const autoChip = screen.getByRole('button', { name: 'Auto' });
    expect(autoChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports a mission count selection', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(defaultProps.onMissionCountChange).toHaveBeenCalledWith(3);
  });

  it('marks a fixed mission count as pressed, not Auto', () => {
    renderModal({ missionCount: 4 });

    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks a fixed mission count loaded back as a string as pressed', () => {
    // MISSION_COUNT round-trips through localStorage as a string.
    renderModal({ missionCount: '4' });

    expect(screen.getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers the streak toggle, on by default', () => {
    renderModal();

    expect(screen.getByText('Skipped missions still count')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /Skipped missions still count/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/finishing at least one mission/i)).toBeInTheDocument();
  });

  it('reports a streak toggle change', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Skipped missions still count/ }));
    expect(defaultProps.onStreakIncludesSkipsChange).toHaveBeenCalledWith(false);
  });

  it('shows the all-done copy when the streak toggle is off', () => {
    renderModal({ streakIncludesSkips: false });

    const toggle = screen.getByRole('button', { name: /Skipped missions still count/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/every mission in a session has to be done/i)).toBeInTheDocument();
  });

  it('closes on the close button', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Close settings'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    renderModal();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not listen for Escape while closed', () => {
    renderModal({ isOpen: false });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('moves focus into the dialog on open', () => {
    renderModal();

    expect(screen.getByLabelText('Close settings')).toHaveFocus();
  });

  it('keeps focus on the control just used when a setting change re-renders it', () => {
    const { rerender } = renderModal();
    const hard = screen.getAllByRole('button').find((b) => /hard/i.test(b.textContent));
    hard.focus();

    // App re-renders with a new onClose identity and the updated setting.
    rerender(<SettingsModal {...defaultProps} difficulty="hard" onClose={vi.fn()} />);

    expect(document.activeElement).toBe(hard);
  });

  it('calls the latest onClose on Escape after re-renders', () => {
    const { rerender } = renderModal();
    const latest = vi.fn();
    rerender(<SettingsModal {...defaultProps} onClose={latest} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(latest).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('returns focus to the opener when it closes', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = renderModal();
    rerender(<SettingsModal {...defaultProps} isOpen={false} />);

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
