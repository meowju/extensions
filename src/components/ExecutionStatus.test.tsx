/**
 * ExecutionStatus Component Tests
 *
 * Tests for the ExecutionStatus component covering:
 * - Rendering with different status types
 * - Accessibility attributes (ARIA)
 * - State transitions and animations
 * - Error message display
 * - Duration tracking
 *
 * @module components/ExecutionStatus.test
 * @version 1.0.0
 */

import React from 'react';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ExecutionStatus, type StatusType } from './ExecutionStatus';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock timer functions for animation testing
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalDateNow = Date.now;

let mockTime = 0;

beforeEach(() => {
  mockTime = 0;
  jest.useFakeTimers();
  global.Date.now = jest.fn(() => mockTime);
});

afterEach(() => {
  jest.useRealTimers();
  global.Date.now = originalDateNow;
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Render the component and return the container
 */
function render(props: Parameters<typeof ExecutionStatus>[0] = {}) {
  const { container } = require('@testing-library/react').render(
    <ExecutionStatus {...props} />
  );
  return container;
}

/**
 * Get the status badge element
 */
function getStatusBadge(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="status"]');
}

/**
 * Get all button elements
 */
function getAllButtons(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('button'));
}

// ============================================================================
// TESTS: RENDERING
// ============================================================================

describe('ExecutionStatus', () => {
  describe('Rendering', () => {
    it('renders with idle status', () => {
      const container = render({ status: 'idle' });
      expect(container).toBeInTheDocument();
      expect(getStatusBadge(container)).toBeInTheDocument();
    });

    it('renders with planning status', () => {
      const container = render({ status: 'planning' });
      expect(container).toBeInTheDocument();
      const badge = getStatusBadge(container);
      expect(badge?.textContent).toContain('Planning');
    });

    it('renders with executing status', () => {
      const container = render({ status: 'executing' });
      expect(container).toBeInTheDocument();
      const badge = getStatusBadge(container);
      expect(badge?.textContent).toContain('Executing');
    });

    it('renders with completed status', () => {
      const container = render({ status: 'completed' });
      expect(container).toBeInTheDocument();
      const badge = getStatusBadge(container);
      expect(badge?.textContent).toContain('Completed');
    });

    it('renders with error status', () => {
      const container = render({ status: 'error', errorMessage: 'Test error' });
      expect(container).toBeInTheDocument();
      const badge = getStatusBadge(container);
      expect(badge?.textContent).toContain('Error');
    });

    it('displays error message when status is error', () => {
      const errorMessage = 'Something went wrong during execution';
      const container = render({ status: 'error', errorMessage });
      const errorEl = container.querySelector('[role="alert"]');
      expect(errorEl).toBeInTheDocument();
      expect(errorEl?.textContent).toContain(errorMessage);
    });

    it('displays duration tracker when completed with startTime', () => {
      const startTime = Date.now() - 5000;
      const container = render({ status: 'completed', startTime });
      const durationEl = container.querySelector('[aria-label*="execution time"]');
      expect(durationEl).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const container = render({ status: 'idle', className: 'custom-class' });
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TESTS: STATUS CONFIGURATION
  // ============================================================================

  describe('Status Configuration', () => {
    const statusTypes: StatusType[] = ['idle', 'planning', 'executing', 'completed', 'error'];

    it.each(statusTypes)('renders all status types correctly', (status) => {
      const container = render({ status });
      expect(container).toBeInTheDocument();
      
      const badge = getStatusBadge(container);
      expect(badge).toBeInTheDocument();
      
      // Badge should have proper styling
      expect(badge?.className).toContain('execution-status__badge');
    });

    it('shows correct icon for each status', () => {
      const icons: Record<StatusType, string> = {
        idle: '⚪',
        planning: '🔄',
        executing: '⚡',
        completed: '✅',
        error: '❌',
      };

      statusTypes.forEach((status) => {
        const container = render({ status });
        const iconEl = container.querySelector('.execution-status__icon');
        expect(iconEl?.textContent).toBe(icons[status]);
      });
    });
  });

  // ============================================================================
  // TESTS: ACCESSIBILITY
  // ============================================================================

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      const container = render({ status: 'idle' });
      expect(container.getAttribute('role')).toBe('region');
    });

    it('has aria-labelledby referencing status badge', () => {
      const container = render({ status: 'idle' });
      const labelledBy = container.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(document.getElementById(labelledBy!)).toBeInTheDocument();
    });

    it('status badge has role="status"', () => {
      const container = render({ status: 'planning' });
      const badge = getStatusBadge(container);
      expect(badge?.getAttribute('role')).toBe('status');
    });

    it('status badge has aria-live="polite"', () => {
      const container = render({ status: 'executing' });
      const badge = getStatusBadge(container);
      expect(badge?.getAttribute('aria-live')).toBe('polite');
    });

    it('status badge has aria-atomic="true"', () => {
      const container = render({ status: 'completed' });
      const badge = getStatusBadge(container);
      expect(badge?.getAttribute('aria-atomic')).toBe('true');
    });

    it('error state has role="alert"', () => {
      const container = render({ status: 'error', errorMessage: 'Error occurred' });
      const errorEl = container.querySelector('[role="alert"]');
      expect(errorEl).toBeInTheDocument();
    });

    it('has screen-reader-only announcement region', () => {
      const container = render({ status: 'idle' });
      const srAnnouncement = container.querySelector('.sr-only[role="status"][aria-live="polite"]');
      expect(srAnnouncement).toBeInTheDocument();
    });

    it('description includes current status for screen readers', () => {
      const container = render({ status: 'executing' });
      const srText = container.querySelector('.sr-only');
      expect(srText?.textContent).toContain('Executing');
    });
  });

  // ============================================================================
  // TESTS: INTERACTIONS
  // ============================================================================

  describe('Interactions', () => {
    it('expand button toggles error details visibility', () => {
      const longErrorMessage = 'This is a very long error message that should be expandable because it exceeds the 50 character threshold for showing details.';
      const container = render({ status: 'error', errorMessage: longErrorMessage });
      
      const expandBtn = container.querySelector('.execution-status__expand-btn');
      expect(expandBtn).toBeInTheDocument();
      
      // Initially details should be hidden
      expect(expandBtn?.getAttribute('aria-expanded')).toBe('false');
      
      // Click to expand
      expandBtn?.click();
      
      // Now details should be visible
      expect(expandBtn?.getAttribute('aria-expanded')).toBe('true');
      const details = container.querySelector('.execution-status__error-details');
      expect(details).toBeInTheDocument();
    });

    it('expand button not shown for short error messages', () => {
      const shortErrorMessage = 'Short error';
      const container = render({ status: 'error', errorMessage: shortErrorMessage });
      
      const expandBtn = container.querySelector('.execution-status__expand-btn');
      expect(expandBtn).not.toBeInTheDocument();
    });

    it('onStatusChange callback is called when status changes', () => {
      const onStatusChange = jest.fn<void, [StatusType]>();
      const { rerender } = require('@testing-library/react');
      
      const { container } = require('@testing-library/react').render(
        <ExecutionStatus status="idle" onStatusChange={onStatusChange} />
      );
      
      rerender(<ExecutionStatus status="planning" onStatusChange={onStatusChange} />);
      
      expect(onStatusChange).toHaveBeenCalledWith('planning');
    });
  });

  // ============================================================================
  // TESTS: ANIMATIONS
  // ============================================================================

  describe('Animations', () => {
    it('adds animating class when status changes', () => {
      const { rerender } = require('@testing-library/react');
      
      const { container } = require('@testing-library/react').render(
        <ExecutionStatus status="idle" />
      );
      
      expect(container.querySelector('.execution-status--animating')).not.toBeInTheDocument();
      
      rerender(<ExecutionStatus status="planning" />);
      
      expect(container.querySelector('.execution-status--animating')).toBeInTheDocument();
    });

    it('removes animating class after animation completes', () => {
      const { rerender } = require('@testing-library/react');
      
      const { container } = require('@testing-library/react').render(
        <ExecutionStatus status="idle" />
      );
      
      rerender(<ExecutionStatus status="planning" />);
      
      // Advance timers to complete animation
      jest.advanceTimersByTime(400);
      
      expect(container.querySelector('.execution-status--animating')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // TESTS: DURATION TRACKING
  // ============================================================================

  describe('Duration Tracking', () => {
    it('formats duration in milliseconds', () => {
      const startTime = Date.now() - 500;
      const container = render({ status: 'completed', startTime });
      
      const durationEl = container.querySelector('[aria-label*="execution time"]');
      expect(durationEl?.textContent).toContain('ms');
    });

    it('formats duration in seconds', () => {
      const startTime = Date.now() - 5000;
      const container = render({ status: 'completed', startTime });
      
      const durationEl = container.querySelector('[aria-label*="execution time"]');
      expect(durationEl?.textContent).toContain('s');
    });

    it('formats duration in minutes and seconds', () => {
      const startTime = Date.now() - 65000;
      const container = render({ status: 'completed', startTime });
      
      const durationEl = container.querySelector('[aria-label*="execution time"]');
      expect(durationEl?.textContent).toContain('m');
    });
  });

  // ============================================================================
  // TESTS: CUSTOM CLASS NAME
  // ============================================================================

  describe('Custom Class Name', () => {
    it('applies custom class to container', () => {
      const container = render({ className: 'my-custom-class' });
      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });

    it('preserves base classes with custom class', () => {
      const container = render({ className: 'custom' });
      expect(container.querySelector('.execution-status')).toBeInTheDocument();
      expect(container.querySelector('.custom')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TESTS: TEST ID
  // ============================================================================

  describe('Test ID', () => {
    it('applies data-testid to container', () => {
      const container = render({ testId: 'my-test-id' });
      expect(container.getAttribute('data-testid')).toBe('my-test-id');
    });

    it('uses default testid when not provided', () => {
      const container = render();
      expect(container.getAttribute('data-testid')).toBe('execution-status');
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('ExecutionStatus Integration', () => {
  it('handles full execution lifecycle', () => {
    const { rerender } = require('@testing-library/react');
    const onStatusChange = jest.fn<void, [StatusType]>();
    
    // Start idle
    let { container } = require('@testing-library/react').render(
      <ExecutionStatus status="idle" onStatusChange={onStatusChange} testId="lifecycle-test" />
    );
    expect(container.querySelector('[data-testid="lifecycle-test"]')).toBeInTheDocument();
    
    // Move to planning
    rerender(<ExecutionStatus status="planning" onStatusChange={onStatusChange} testId="lifecycle-test" />);
    expect(onStatusChange).toHaveBeenLastCalledWith('planning');
    
    // Move to executing
    rerender(<ExecutionStatus status="executing" onStatusChange={onStatusChange} testId="lifecycle-test" />);
    expect(onStatusChange).toHaveBeenLastCalledWith('executing');
    
    // Move to completed
    const startTime = Date.now() - 3000;
    rerender(<ExecutionStatus status="completed" startTime={startTime} onStatusChange={onStatusChange} testId="lifecycle-test" />);
    expect(onStatusChange).toHaveBeenLastCalledWith('completed');
    
    // Verify duration is shown
    const duration = container.querySelector('.execution-status__duration');
    expect(duration).toBeInTheDocument();
  });

  it('handles error flow with expandable details', () => {
    const longError = 'This is a detailed error message that explains exactly what went wrong during the execution process including specific failure points and suggestions for resolution.';
    
    const { container } = require('@testing-library/react').render(
      <ExecutionStatus status="error" errorMessage={longError} />
    );
    
    // Error should be visible
    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl).toBeInTheDocument();
    
    // Expand button should be present
    const expandBtn = container.querySelector('.execution-status__expand-btn');
    expect(expandBtn).toBeInTheDocument();
    
    // Click to expand
    expandBtn?.click();
    
    // Details should now be visible
    const details = container.querySelector('.execution-status__error-details');
    expect(details).toBeInTheDocument();
    expect(details?.textContent).toBe(longError);
  });
});

// ============================================================================
// SNAPSHOT TESTS
// ============================================================================

describe('ExecutionStatus Snapshots', () => {
  const statuses: StatusType[] = ['idle', 'planning', 'executing', 'completed', 'error'];

  it.each(statuses)('matches snapshot for %s status', (status) => {
    const { container } = require('@testing-library/react').render(
      <ExecutionStatus status={status} />
    );
    
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot for error with message', () => {
    const { container } = require('@testing-library/react').render(
      <ExecutionStatus status="error" errorMessage="Something went wrong" />
    );
    
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot for completed with duration', () => {
    const startTime = Date.now() - 5000;
    const { container } = require('@testing-library/react').render(
      <ExecutionStatus status="completed" startTime={startTime} />
    );
    
    expect(container).toMatchSnapshot();
  });
});