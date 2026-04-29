/**
 * StatusCard Component
 *
 * Export module for StatusCard component and its types.
 * Single source of truth for all StatusCard exports.
 *
 * @module components/StatusCard
 * @version 1.0.0
 */

// Main component export
export { StatusCard, type StatusCardProps } from './StatusCard';

// Type re-exports for convenience
export type {
  StatusLevel,
  CardSize,
  IconPosition,
  AnimationVariant,
  StatusCardOnClick,
} from './StatusCard';

// Default export
export { default } from './StatusCard';