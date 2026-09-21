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
  onDifficultyChange: vi.fn()
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
});
