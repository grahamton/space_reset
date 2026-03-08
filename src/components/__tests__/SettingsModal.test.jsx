import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsModal from '../SettingsModal';

describe('SettingsModal Component', () => {
  const mockHandlers = {
    onClose: vi.fn(),
    onSaveKey: vi.fn()
  };

  it('should not render when closed', () => {
    render(
      <SettingsModal
        isOpen={false}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should display API key input', () => {
    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key-123"
        {...mockHandlers}
      />
    );

    const input = screen.getByDisplayValue('test-key-123');
    expect(input).toBeInTheDocument();
  });

  it('should have a save button', () => {
    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Save Key')).toBeInTheDocument();
  });

  it('should call onSaveKey when save button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    const saveButton = screen.getByText('Save Key');
    await user.click(saveButton);

    expect(mockHandlers.onSaveKey).toHaveBeenCalledWith('test-key');
  });

  it('should trim whitespace from key before saving', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <SettingsModal
        isOpen={true}
        apiKey="  test-key  "
        {...mockHandlers}
      />
    );

    const input = screen.getByDisplayValue('  test-key  ');
    await user.clear(input);
    await user.type(input, '  new-key  ');

    const saveButton = screen.getByText('Save Key');
    await user.click(saveButton);

    expect(mockHandlers.onSaveKey).toHaveBeenCalledWith('new-key');
  });

  it('should close modal when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    const closeButton = screen.getByLabelText('Close settings dialog');
    await user.click(closeButton);

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('should close modal when Escape key is pressed', async () => {
    const user = userEvent.setup();

    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    await user.keyboard('{Escape}');

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('should focus input on open', () => {
    render(
      <SettingsModal
        isOpen={true}
        apiKey="test-key"
        {...mockHandlers}
      />
    );

    const input = screen.getByDisplayValue('test-key');
    expect(document.activeElement).toBe(input);
  });
});
