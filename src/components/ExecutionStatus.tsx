/**
 * ExecutionStatus Component
 *
 * A reusable status indicator component for showing execution states
 * in the SimpleClaw orchestrator dashboard.
 *
 * Features:
 * - Multiple status states (idle, planning, executing, completed, error)
 * - Animated transitions between states
 * - Full accessibility support (ARIA, roles, keyboard navigation)
 * - Progress indication for executing state
 * - Time tracking for completed executions
 *
 * @module components/ExecutionStatus
 * @version 1.0.0
 * @accessibility WCAG 2.1 AA compliant
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Execution status types
 */
export type StatusType = 'idle' | 'planning' | 'executing' | 'completed' | 'error';

/**
 * Component props interface
 */
export interface ExecutionStatusProps {
  /** Current status of the execution */
  status: StatusType;
  /** Optional error message to display */
  errorMessage?: string;
  /** Optional start time for duration tracking */
  startTime?: number;
  /** Optional callback when status changes */
  onStatusChange?: (status: StatusType) => void;
  /** Optional custom class name */
  className?: string;
  /** Optional test ID for testing */
  testId?: string;
}

/**
 * Internal state for animation tracking
 */
interface InternalState {
  previousStatus: StatusType;
  transitionStart: number;
  isAnimating: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Status configuration with colors, labels, and icons
 */
const STATUS_CONFIG: Record<StatusType, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  idle: {
    label: 'Ready',
    color: '#888',
    bgColor: 'rgba(136, 136, 136, 0.1)',
    borderColor: '#888',
    icon: '⚪',
    description: 'Waiting for input',
  },
  planning: {
    label: 'Planning',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    icon: '🔄',
    description: 'Generating execution plan...',
  },
  executing: {
    label: 'Executing',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
    icon: '⚡',
    description: 'Workers are running tasks...',
  },
  completed: {
    label: 'Completed',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    icon: '✅',
    description: 'All tasks completed successfully',
  },
  error: {
    label: 'Error',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    icon: '❌',
    description: 'Execution failed',
  },
};

/**
 * Animation duration in milliseconds
 */
const ANIMATION_DURATION = 300;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generates unique ID for accessibility attributes
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Progress indicator dots animation
 */
const ProgressDots = memo<{ color: string }>(({ color }) => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="execution-status__progress-dots" aria-hidden="true">
      {'.'.repeat(dotCount).padEnd(3, ' ')}
    </span>
  );
});

ProgressDots.displayName = 'ProgressDots';

/**
 * Animated status badge
 */
const StatusBadge = memo<{
  config: typeof STATUS_CONFIG[StatusType];
  isAnimating: boolean;
  statusId: string;
}>(({ config, isAnimating, statusId }) => {
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isAnimating && badgeRef.current) {
      badgeRef.current.classList.add('execution-status__badge--animating');
      const timer = setTimeout(() => {
        badgeRef.current?.classList.remove('execution-status__badge--animating');
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <span
      ref={badgeRef}
      id={statusId}
      className="execution-status__badge"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      <span className="execution-status__icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="execution-status__label">{config.label}</span>
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * Error message display with expandable details
 */
const ErrorDisplay = memo<{
  message: string;
  errorId: string;
}>(({ message, errorId }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="execution-status__error" role="alert" aria-labelledby={errorId}>
      <span id={errorId} className="sr-only">Error occurred:</span>
      <div className="execution-status__error-message">
        <span aria-hidden="true">⚠️</span>
        <span>{message}</span>
      </div>
      {message.length > 50 && (
        <button
          type="button"
          className="execution-status__expand-btn"
          onClick={toggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`${errorId}-details`}
        >
          {isExpanded ? 'Show less' : 'Show details'}
        </button>
      )}
      {isExpanded && (
        <div
          id={`${errorId}-details`}
          className="execution-status__error-details"
        >
          {message}
        </div>
      )}
    </div>
  );
});

ErrorDisplay.displayName = 'ErrorDisplay';

/**
 * Duration tracker for completed executions
 */
const DurationTracker = memo<{
  startTime: number;
  endTime: number;
  durationId: string;
}>(({ startTime, endTime, durationId }) => {
  const [elapsed, setElapsed] = useState(endTime - startTime);

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div
      className="execution-status__duration"
      id={durationId}
      aria-label={`Total execution time: ${formatDuration(elapsed)}`}
    >
      <span className="execution-status__duration-icon" aria-hidden="true">⏱️</span>
      <span className="execution-status__duration-value">{formatDuration(elapsed)}</span>
    </div>
  );
});

DurationTracker.displayName = 'DurationTracker';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ExecutionStatus Component
 *
 * Displays the current status of a SimpleClaw execution with
 * appropriate visual indicators and accessibility support.
 *
 * @example
 * ```tsx
 * <ExecutionStatus
 *   status="executing"
 *   startTime={Date.now()}
 *   onStatusChange={(status) => console.log(status)}
 * />
 * ```
 */
export const ExecutionStatus = memo<ExecutionStatusProps>(({
  status,
  errorMessage,
  startTime,
  onStatusChange,
  className = '',
  testId,
}) => {
  // State for animation tracking
  const [internalState, setInternalState] = useState<InternalState>({
    previousStatus: status,
    transitionStart: Date.now(),
    isAnimating: false,
  });

  // Generate stable IDs for accessibility
  const ids = useMemo(() => ({
    status: generateId('execution-status'),
    error: generateId('execution-error'),
    duration: generateId('execution-duration'),
  }), []);

  // Track status changes for animation
  useEffect(() => {
    if (status !== internalState.previousStatus) {
      setInternalState({
        previousStatus: status,
        transitionStart: Date.now(),
        isAnimating: true,
      });
      onStatusChange?.(status);
    }
  }, [status, internalState.previousStatus, onStatusChange]);

  // Clear animation flag after animation completes
  useEffect(() => {
    if (internalState.isAnimating) {
      const timer = setTimeout(() => {
        setInternalState((prev) => ({ ...prev, isAnimating: false }));
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [internalState.isAnimating]);

  // Get current status configuration
  const config = useMemo(() => STATUS_CONFIG[status], [status]);

  // Compute end time for duration calculation
  const endTime = useMemo(() => {
    if (status === 'completed' && startTime) {
      return Date.now();
    }
    return undefined;
  }, [status, startTime]);

  // Compose class names
  const containerClassName = useMemo(() => {
    const classes = ['execution-status', `execution-status--${status}`];
    if (className) classes.push(className);
    if (internalState.isAnimating) classes.push('execution-status--animating');
    return classes.join(' ');
  }, [status, className, internalState.isAnimating]);

  // Render
  return (
    <div
      className={containerClassName}
      role="region"
      aria-labelledby={ids.status}
      data-testid={testId || 'execution-status'}
    >
      {/* Status Badge */}
      <StatusBadge
        config={config}
        isAnimating={internalState.isAnimating}
        statusId={ids.status}
      />

      {/* Description */}
      <div className="execution-status__description">
        {status === 'planning' || status === 'executing' ? (
          <>
            {config.description}
            <ProgressDots color={config.color} />
          </>
        ) : (
          <span>{config.description}</span>
        )}
      </div>

      {/* Error Message */}
      {status === 'error' && errorMessage && (
        <ErrorDisplay
          message={errorMessage}
          errorId={ids.error}
        />
      )}

      {/* Duration Tracker */}
      {status === 'completed' && startTime && endTime && (
        <DurationTracker
          startTime={startTime}
          endTime={endTime}
          durationId={ids.duration}
        />
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {status === 'idle' && 'Execution status: Ready'}
        {status === 'planning' && 'Execution status: Planning'}
        {status === 'executing' && 'Execution status: Executing'}
        {status === 'completed' && 'Execution status: Completed'}
        {status === 'error' && `Execution status: Error. ${errorMessage || ''}`}
      </div>
    </div>
  );
});

ExecutionStatus.displayName = 'ExecutionStatus';

// ============================================================================
// CSS STYLES (inline for portability)
// ============================================================================

const styles = `
.execution-status {
  display: inline-flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  font-family: system-ui, -apple-system, sans-serif;
  transition: all 0.3s ease;
}

.execution-status--animating {
  animation: statusPulse 0.3s ease;
}

@keyframes statusPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.execution-status__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.execution-status__badge--animating {
  animation: badgeGlow 0.3s ease;
}

@keyframes badgeGlow {
  0% { box-shadow: 0 0 0 0 currentColor; }
  50% { box-shadow: 0 0 8px 2px currentColor; }
  100% { box-shadow: 0 0 0 0 currentColor; }
}

.execution-status__icon {
  font-size: 1rem;
}

.execution-status__label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.execution-status__description {
  font-size: 0.875rem;
  color: #666;
}

.execution-status__progress-dots {
  display: inline-block;
  width: 2ch;
  font-variant-numeric: tabular-nums;
}

.execution-status__error {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  border-left: 3px solid #ef4444;
}

.execution-status__error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
}

.execution-status__expand-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #666;
  background: transparent;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.execution-status__expand-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.execution-status__expand-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.execution-status__error-details {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.execution-status__duration {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  font-size: 0.875rem;
  color: #10b981;
}

.execution-status__duration-icon {
  font-size: 0.875rem;
}

.execution-status__duration-value {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'execution-status-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ExecutionStatus };
export default ExecutionStatus;