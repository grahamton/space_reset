import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import UploadAndAnalyze from '../UploadAndAnalyze';

const defaultProps = {
  onUpload: vi.fn(),
  onResume: vi.fn(),
  onUseFallback: vi.fn(),
  error: null,
  selectedPersonaId: 'direct',
  onPersonaChange: vi.fn(),
  hasSession: false
};

const renderComponent = (overrides = {}) =>
  render(<UploadAndAnalyze {...defaultProps} {...overrides} />);

describe('UploadAndAnalyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays validation error inline when non-image file is uploaded', async () => {
    const alertSpy = vi.spyOn(window, 'alert');

    renderComponent();

    // Get the file input
    const fileInput = screen.getByLabelText('Take a photo of the room');

    // Create a non-image file
    const nonImageFile = new File(['text content'], 'document.txt', {
      type: 'text/plain'
    });

    // Manually set the files property using Object.defineProperty
    Object.defineProperty(fileInput, 'files', {
      value: [nonImageFile],
      writable: false
    });

    // Fire change event with the non-image file
    fireEvent.change(fileInput);

    // Wait for the inline error message to appear
    await waitFor(() => {
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveTextContent("That file isn't a photo. Pick an image instead.");
    });

    // Check that window.alert was NOT called
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('does not call window.alert on validation error', async () => {
    const alertSpy = vi.spyOn(window, 'alert');

    renderComponent();

    const fileInput = screen.getByLabelText('Take a photo of the room');

    // Create a non-image file
    const nonImageFile = new File(['text content'], 'document.txt', {
      type: 'text/plain'
    });

    Object.defineProperty(fileInput, 'files', {
      value: [nonImageFile],
      writable: false
    });

    fireEvent.change(fileInput);

    // Even though we get an error, alert should NOT be called
    await waitFor(() => {
      expect(alertSpy).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('shows the info notice distinctly from an error, e.g. for a retake', () => {
    renderComponent({ info: 'Too blurry to see. Try again from the doorway.' });

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Too blurry to see. Try again from the doorway.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prefers the error over the info notice when both are present', () => {
    renderComponent({ info: 'Too blurry to see.', error: 'Analysis failed. Try again?' });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Analysis failed. Try again?');
  });
});
