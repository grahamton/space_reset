import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../Header';

describe('Header Component', () => {
  it('should render app title', () => {
    const mockHandlers = {
      onOpenSettings: vi.fn(),
      onReset: vi.fn()
    };

    render(
      <Header
        {...mockHandlers}
        sessionStatus="idle"
      />
    );

    expect(screen.getByText('Space Reset')).toBeInTheDocument();
  });

  it('should render settings button', () => {
    const mockHandlers = {
      onOpenSettings: vi.fn(),
      onReset: vi.fn()
    };

    render(
      <Header
        {...mockHandlers}
        sessionStatus="idle"
      />
    );

    const settingsButton = screen.getByLabelText('Open settings');
    expect(settingsButton).toBeInTheDocument();
  });

  it('should show quit button during active session', () => {
    const mockHandlers = {
      onOpenSettings: vi.fn(),
      onReset: vi.fn()
    };

    render(
      <Header
        {...mockHandlers}
        sessionStatus="active"
      />
    );

    const quitButton = screen.getByLabelText('End session');
    expect(quitButton).toBeInTheDocument();
  });

  it('should hide quit button when idle', () => {
    const mockHandlers = {
      onOpenSettings: vi.fn(),
      onReset: vi.fn()
    };

    render(
      <Header
        {...mockHandlers}
        sessionStatus="idle"
      />
    );

    const quitButton = screen.queryByLabelText('End session');
    expect(quitButton).not.toBeInTheDocument();
  });

  it('should call onOpenSettings when settings button is clicked', async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onOpenSettings: vi.fn(),
      onReset: vi.fn()
    };

    render(
      <Header
        {...mockHandlers}
        sessionStatus="idle"
      />
    );

    const settingsButton = screen.getByLabelText('Open settings');
    await user.click(settingsButton);

    expect(mockHandlers.onOpenSettings).toHaveBeenCalled();
  });

  it('should prompt before resetting session', async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onOpenSettings: vi.fn(),
      onReset: vi.fn()
    };

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(
      <Header
        {...mockHandlers}
        sessionStatus="active"
      />
    );

    const quitButton = screen.getByLabelText('End session');
    await user.click(quitButton);

    expect(window.confirm).toHaveBeenCalledWith(
      "End this session? It won't be saved to your history."
    );
    expect(mockHandlers.onReset).toHaveBeenCalled();
  });
});
