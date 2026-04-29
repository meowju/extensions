/**
 * StatusCard Component
 *
 * A reusable status indicator card following React best practices:
 * - TypeScript-first with strict typing
 * - Memoized components to prevent unnecessary re-renders
 * - Composable props API with sensible defaults
 * - Accessible by default (ARIA labels, keyboard nav)
 * - CSS custom properties for theming flexibility
 * - Deterministic rendering with stable references
 *
 * @module components/StatusCard
 * @version 1.0.0
 */

import React, { memo, useMemo, useCallback } from 'react';
import styles from './StatusCard.module.css';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Status severity levels with semantic meaning */
export type StatusLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** Card size variants */
export type CardSize = 'sm' | 'md' | 'lg';

/** Icon position options */
export type IconPosition = 'left' | 'right' | 'icon-only';

/** Animation variants */
export type AnimationVariant = 'none' | 'pulse' | 'bounce' | 'fade';

/** Click handler type */
export interface StatusCardOnClick {
  (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>): void;
}

/** StatusCard component props */
export interface StatusCardProps {
  /** Primary label text */
  title: string;
  /** Optional secondary description */
  description?: string;
  /** Status severity level (affects color scheme) */
  status: StatusLevel;
  /** Size variant */
  size?: CardSize;
  /** Icon configuration */
  icon?: React.ReactNode;
  /** Icon position relative to text */
  iconPosition?: IconPosition;
  /** Enable interactive click behavior */
  onClick?: StatusCardOnClick;
  /** Make card focusable and interactive */
  interactive?: boolean;
  /** Animation variant for status indicator */
  animation?: AnimationVariant;
  /** Override CSS class name */
  className?: string;
  /** Test identifier for testing */
  'data-testid'?: string;
  /** Aria label override (defaults to title) */
  ariaLabel?: string;
  /** Children elements rendered in card body */
  children?: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Mapping of status levels to semantic CSS class suffixes */
const STATUS_MAP: Record<StatusLevel, string> = {
  success: 'status-card--success',
  warning: 'status-card--warning',
  error: 'status-card--error',
  info: 'status-card--info',
  neutral: 'status-card--neutral',
};

/** Mapping of size variants to CSS class suffixes */
const SIZE_MAP: Record<CardSize, string> = {
  sm: 'status-card--sm',
  md: 'status-card--md',
  lg: 'status-card--lg',
};

/** Mapping of animation variants to CSS class suffixes */
const ANIMATION_MAP: Record<AnimationVariant, string> = {
  none: '',
  pulse: 'status-card__indicator--pulse',
  bounce: 'status-card__indicator--bounce',
  fade: 'status-card__indicator--fade',
};

// ============================================================================
// DEFAULT ICONS (Optional - can be overridden with custom icons)
// ============================================================================

/** SVG icon components for each status level */
const StatusIcons: Record<StatusLevel, React.FC<{ className?: string }>> = {
  success: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  warning: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  neutral: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Status indicator dot component */
interface StatusIndicatorProps {
  status: StatusLevel;
  animation: AnimationVariant;
}

const StatusIndicator = memo<StatusIndicatorProps>(({ status, animation }) => {
  const className = useMemo(
    () =>
      [
        'status-card__indicator',
        `status-card__indicator--${status}`,
        ANIMATION_MAP[animation],
      ]
        .filter(Boolean)
        .join(' '),
    [status, animation]
  );

  return <span className={className} aria-hidden="true" />;
});

StatusIndicator.displayName = 'StatusIndicator';

/** Icon wrapper component */
interface IconWrapperProps {
  icon?: React.ReactNode;
  status: StatusLevel;
  position: IconPosition;
  size: CardSize;
}

const IconWrapper = memo<IconWrapperProps>(({ icon, status, position, size }) => {
  // When icon is provided, use it directly; otherwise use StatusIcons component
  if (icon) {
    return (
      <span className={`status-card__icon status-card__icon--${position} status-card__icon--${size}`}>
        {icon}
      </span>
    );
  }
  
  const StatusIcon = StatusIcons[status];
  if (position === 'icon-only') {
    return (
      <span className="status-card__icon status-card__icon--icon-only">
        <StatusIcon className="status-card__icon-svg" />
      </span>
    );
  }

  return (
    <span
      className={`status-card__icon status-card__icon--${position} status-card__icon--${size}`}
    >
      <StatusIcon className="status-card__icon-svg" />
    </span>
  );
});

IconWrapper.displayName = 'IconWrapper';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * StatusCard Component
 *
 * A composable status indicator card that displays state information
 * with consistent styling and accessibility features.
 *
 * @example
 * ```tsx
 * <StatusCard
 *   title="Deployment Active"
 *   description="Running since 2 hours ago"
 *   status="success"
 *   size="md"
 *   onClick={() => console.log('Clicked')}
 * />
 * ```
 */
export const StatusCard = memo<StatusCardProps>(
  ({
    title,
    description,
    status,
    size = 'md',
    icon,
    iconPosition = 'left',
    onClick,
    interactive = false,
    animation = 'pulse',
    className,
    'data-testid': testId,
    ariaLabel,
    children,
  }) => {
    // Compute stable class names using useMemo
    const containerClassName = useMemo(
      () =>
        [
          'status-card',
          STATUS_MAP[status],
          SIZE_MAP[size],
          interactive && 'status-card--interactive',
          onClick && 'status-card--clickable',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      [status, size, interactive, onClick, className]
    );

    // Memoize click handler wrapper
    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement | HTMLDivElement>);
      },
      [onClick]
    );

    // Determine if card should be a button or div
    const isButton = interactive && onClick && !children;

    const content = (
      <>
        <StatusIndicator status={status} animation={animation} />
        <div className="status-card__content">
          <div className="status-card__header">
            {iconPosition !== 'right' && (
              <IconWrapper
                icon={icon}
                status={status}
                position={iconPosition}
                size={size}
              />
            )}
            <div className="status-card__text">
              <span className="status-card__title">{title}</span>
              {description && (
                <span className="status-card__description">{description}</span>
              )}
            </div>
            {iconPosition === 'right' && (
              <IconWrapper
                icon={icon}
                status={status}
                position={iconPosition}
                size={size}
              />
            )}
          </div>
          {children && <div className="status-card__body">{children}</div>}
        </div>
      </>
    );

    if (isButton) {
      return (
        <button
          type="button"
          className={containerClassName}
          onClick={handleClick}
          aria-label={ariaLabel || title}
          data-testid={testId}
        >
          {content}
        </button>
      );
    }

    return (
      <div
        className={containerClassName}
        onClick={onClick ? handleClick : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick || interactive ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        aria-label={ariaLabel || title}
        data-testid={testId}
      >
        {content}
      </div>
    );
  }
);

StatusCard.displayName = 'StatusCard';

// ============================================================================
// EXPORTS
// ============================================================================

export default StatusCard;