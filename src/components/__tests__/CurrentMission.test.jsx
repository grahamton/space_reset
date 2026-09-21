import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CurrentMission from '../CurrentMission';
import { saveTimer } from '../../modules/storageModule';
import * as timerAlerts from '../../modules/timerAlerts';

vi.mock('../../modules/timerAlerts', () => ({
  primeAudioContext: vi.fn(),
  fireTimesUpAlerts: vi.fn()
}));

const mission = {
  id: 'mission-1',
  title: 'Clear the counter',
  description: 'Sweep it into one pile.',
  type: 'Kitchen',
  strategy: 'Start left to right.',
  time: 5
};

const baseProps = {
  mission,
  onComplete: vi.fn(),
  onSkip: vi.fn(),
  totalMissions: 3,
  currentIndex: 0,
  queueLength: 3
};

const renderMission = (overrides = {}) => render(<CurrentMission {...baseProps} {...overrides} />);

describe('CurrentMission timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('counts down and starts the timer on a click', () => {
    renderMission();
    expect(screen.getByRole('timer')).toHaveTextContent('0:05');

    fireEvent.click(screen.getByLabelText('Start timer'));
    expect(timerAlerts.primeAudioContext).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('0:04');
  });

  it('shows the gentle time-up prompt at zero and fires alerts exactly once', () => {
    renderMission();
    fireEvent.click(screen.getByLabelText('Start timer'));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Time's up on this one.")).toBeInTheDocument();
    expect(timerAlerts.fireTimesUpAlerts).toHaveBeenCalledTimes(1);
    expect(timerAlerts.fireTimesUpAlerts).toHaveBeenCalledWith('Clear the counter');

    // Done and Skip remain available.
    expect(screen.getByLabelText('Done with this mission')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Skip for now. This mission moves to the back of the stack.')
    ).toBeInTheDocument();

    // No further re-render fires it again.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(timerAlerts.fireTimesUpAlerts).toHaveBeenCalledTimes(1);
  });

  it('"Keep going" dismisses the prompt and counts overtime up, calmly', () => {
    renderMission();
    fireEvent.click(screen.getByLabelText('Start timer'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    fireEvent.click(screen.getByLabelText('Keep going without a deadline'));
    expect(screen.queryByText("Time's up on this one.")).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('+0:00');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('+0:02');

    // Still exactly one alert firing, from the original zero-crossing.
    expect(timerAlerts.fireTimesUpAlerts).toHaveBeenCalledTimes(1);
  });

  it('"More time" restarts the countdown, and the next zero fires again', () => {
    renderMission();
    fireEvent.click(screen.getByLabelText('Start timer'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(timerAlerts.fireTimesUpAlerts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Add 5 more minutes and restart the timer'));
    expect(screen.getByRole('timer')).toHaveTextContent('5:00');

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByText("Time's up on this one.")).toBeInTheDocument();
    expect(timerAlerts.fireTimesUpAlerts).toHaveBeenCalledTimes(2);
  });

  it('Done completes the mission from the time-up state', () => {
    const onComplete = vi.fn();
    renderMission({ onComplete });
    fireEvent.click(screen.getByLabelText('Start timer'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    fireEvent.click(screen.getByLabelText('Done with this mission'));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('Skip still works during overtime', () => {
    const onSkip = vi.fn();
    renderMission({ onSkip });
    fireEvent.click(screen.getByLabelText('Start timer'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByLabelText('Keep going without a deadline'));

    fireEvent.click(
      screen.getByLabelText('Skip for now. This mission moves to the back of the stack.')
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('reloading an already-expired timer shows the prompt without re-firing alerts', () => {
    // Simulate a timer that already hit zero while the tab was closed.
    saveTimer('mission-1', 0, false, 'timesUp');

    renderMission();

    expect(screen.getByText("Time's up on this one.")).toBeInTheDocument();
    expect(timerAlerts.fireTimesUpAlerts).not.toHaveBeenCalled();
  });

  it('restores an in-progress overtime state on reload', () => {
    saveTimer('mission-1', 42, false, 'overtime');

    renderMission();

    expect(screen.getByRole('timer')).toHaveTextContent('+0:42');
    expect(timerAlerts.fireTimesUpAlerts).not.toHaveBeenCalled();
  });

  it('gives a skipped mission a fresh time box when it comes back around', () => {
    // Regression: Done/Skip used to save (0, stopped), which read back as
    // "time's up" when the same mission was shown again.
    saveTimer('mission-1', 0, false, 'done');

    renderMission();

    expect(screen.queryByText("Time's up on this one.")).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).not.toHaveTextContent('0:00');
  });
});
