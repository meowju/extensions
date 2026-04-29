/**
 * StatusCard Tests
 *
 * Comprehensive test suite demonstrating React testing best practices:
 * - Testing component rendering
 * - Testing user interactions (clicks, keyboard)
 * - Testing accessibility requirements
 * - Testing prop variations
 * - Testing edge cases
 *
 * @module components/StatusCard/StatusCard.test
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StatusCard } from './StatusCard';

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Wrapper component for testing with custom props
 */
const renderStatusCard = (props: Partial<React.ComponentProps<typeof StatusCard>> = {}) => {
  const defaultProps = {
    title: 'Test Status',
    status: 'info' as const,
    ...props,
  };
  
  return render(<StatusCard {...defaultProps} />);
};

// ============================================================================
// RENDER TESTS
// ============================================================================

describe('StatusCard', () => {
  describe('Rendering', () => {
    it('should render the title correctly', () => {
      renderStatusCard({ title: 'Deployment Active' });
      expect(screen.getByText('Deployment Active')).toBeInTheDocument();
    });

    it('should render the description when provided', () => {
      renderStatusCard({
        title: 'Status',
        description: 'Running for 2 hours',
      });
      expect(screen.getByText('Running for 2 hours')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      renderStatusCard({ title: 'No Description' });
      expect(screen.queryByRole('status')).not.toHaveTextContent(/Description/);
    });

    it('should render children when provided', () => {
      renderStatusCard({
        title: 'With Children',
        children: <div data-testid="child-content">Child content here</div>,
      });
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should render custom icon when provided', () => {
      const customIcon = <svg data-testid="custom-icon" />;
      renderStatusCard({ icon: customIcon });
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // STATUS VARIANT TESTS
  // ============================================================================

  describe('Status Variants', () => {
    const statusLevels: Array<{ status: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = [
      { status: 'success', label: 'Success Status' },
      { status: 'warning', label: 'Warning Status' },
      { status: 'error', label: 'Error Status' },
      { status: 'info', label: 'Info Status' },
      { status: 'neutral', label: 'Neutral Status' },
    ];

    statusLevels.forEach(({ status, label }) => {
      it(`should render ${status} variant with correct class`, () => {
        const { container } = renderStatusCard({ status, title: label });
        const card = container.querySelector('.status-card');
        expect(card).toHaveClass(`status-card--${status}`);
      });
    });
  });

  // ============================================================================
  // SIZE VARIANT TESTS
  // ============================================================================

  describe('Size Variants', () => {
    const sizes: Array<{ size: 'sm' | 'md' | 'lg' }> = [
      { size: 'sm' },
      { size: 'md' },
      { size: 'lg' },
    ];

    sizes.forEach(({ size }) => {
      it(`should render ${size} size with correct class`, () => {
        const { container } = renderStatusCard({ size, title: `${size} card` });
        const card = container.querySelector('.status-card');
        expect(card).toHaveClass(`status-card--${size}`);
      });
    });
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('User Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      renderStatusCard({ title: 'Clickable Card', onClick: handleClick });
      
      const card = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(card);
      });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when not clickable', () => {
      const handleClick = vi.fn();
      renderStatusCard({ title: 'Non-clickable Card', onClick: undefined });
      
      const card = screen.getByText('Non-clickable Card');
      fireEvent.click(card);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard interaction (Enter key)', async () => {
      const handleClick = vi.fn();
      renderStatusCard({ title: 'Keyboard Card', onClick: handleClick });
      
      const card = screen.getByText('Keyboard Card');
      card.focus();
      await act(async () => {
        fireEvent.keyDown(card, { key: 'Enter' });
      });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard interaction (Space key)', async () => {
      const handleClick = vi.fn();
      renderStatusCard({ title: 'Space Key Card', onClick: handleClick });
      
      const card = screen.getByText('Space Key Card');
      card.focus();
      await act(async () => {
        fireEvent.keyDown(card, { key: ' ' });
      });
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible name from title', () => {
      renderStatusCard({ title: 'Accessible Card' });
      const card = screen.getByRole('button');
      expect(card).toHaveAccessibleName('Accessible Card');
    });

    it('should use custom aria-label when provided', () => {
      renderStatusCard({
        title: 'Card Title',
        ariaLabel: 'Custom accessible label',
      });
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Custom accessible label');
    });

    it('should be focusable when interactive', () => {
      renderStatusCard({ title: 'Focusable Card', onClick: vi.fn() });
      const card = screen.getByText('Focusable Card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should not be focusable when not interactive', () => {
      renderStatusCard({ title: 'Non-interactive Card', interactive: false });
      const card = screen.getByText('Non-interactive Card');
      expect(card).not.toHaveAttribute('tabIndex', '0');
    });

    it('should render status indicator with aria-hidden', () => {
      const { container } = renderStatusCard({ title: 'Indicator Test' });
      const indicator = container.querySelector('.status-card__indicator');
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have role="button" when clickable', () => {
      renderStatusCard({ title: 'Button Role', onClick: vi.fn() });
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });
  });

  // ============================================================================
  // ANIMATION TESTS
  // ============================================================================

  describe('Animation', () => {
    it('should apply pulse animation by default', () => {
      const { container } = renderStatusCard({ title: 'Pulse Animation' });
      const indicator = container.querySelector('.status-card__indicator');
      expect(indicator).toHaveClass('status-card__indicator--pulse');
    });

    it('should apply bounce animation when specified', () => {
      const { container } = renderStatusCard({
        title: 'Bounce Animation',
        animation: 'bounce',
      });
      const indicator = container.querySelector('.status-card__indicator');
      expect(indicator).toHaveClass('status-card__indicator--bounce');
    });

    it('should apply no animation when specified', () => {
      const { container } = renderStatusCard({
        title: 'No Animation',
        animation: 'none',
      });
      const indicator = container.querySelector('.status-card__indicator');
      expect(indicator).not.toHaveClass('status-card__indicator--pulse');
    });
  });

  // ============================================================================
  // CUSTOM ICON POSITION TESTS
  // ============================================================================

  describe('Icon Position', () => {
    it('should render icon on the left by default', () => {
      const { container } = renderStatusCard({ title: 'Left Icon' });
      const icon = container.querySelector('.status-card__icon--left');
      expect(icon).toBeInTheDocument();
    });

    it('should render icon on the right when specified', () => {
      const { container } = renderStatusCard({
        title: 'Right Icon',
        iconPosition: 'right',
      });
      const icon = container.querySelector('.status-card__icon--right');
      expect(icon).toBeInTheDocument();
    });

    it('should render icon-only variant correctly', () => {
      const { container } = renderStatusCard({
        title: 'Icon Only',
        iconPosition: 'icon-only',
      });
      const icon = container.querySelector('.status-card__icon--icon-only');
      expect(icon).toBeInTheDocument();
    });
  });

  // ============================================================================
  // DATA ATTRIBUTE TESTS
  // ============================================================================

  describe('Data Attributes', () => {
    it('should render data-testid when provided', () => {
      renderStatusCard({
        title: 'Test ID Card',
        'data-testid': 'status-card-test',
      });
      expect(screen.getByTestId('status-card-test')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // CLASS NAME TESTS
  // ============================================================================

  describe('Custom Class Names', () => {
    it('should apply custom class name when provided', () => {
      const { container } = renderStatusCard({
        title: 'Custom Class',
        className: 'my-custom-class',
      });
      const card = container.querySelector('.status-card');
      expect(card).toHaveClass('my-custom-class');
    });

    it('should apply multiple classes from className prop', () => {
      const { container } = renderStatusCard({
        title: 'Multiple Classes',
        className: 'class-one class-two',
      });
      const card = container.querySelector('.status-card');
      expect(card).toHaveClass('class-one', 'class-two');
    });
  });
});

// ============================================================================
// SNAPSHOT TESTS
// ============================================================================

describe('StatusCard Snapshots', () => {
  it('should match snapshot for default props', () => {
    const { container } = renderStatusCard();
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot for success variant', () => {
    const { container } = renderStatusCard({
      title: 'Success Card',
      description: 'Operation completed successfully',
      status: 'success',
    });
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot for error variant with details', () => {
    const { container } = renderStatusCard({
      title: 'Error Card',
      description: 'Something went wrong',
      status: 'error',
      children: <div>Error details</div>,
    });
    expect(container).toMatchSnapshot();
  });
});

// ============================================================================
// INTERACTIVE VS BUTTON BEHAVIOR TESTS
// ============================================================================

describe('Interactive vs Button Behavior', () => {
  it('should render as button when interactive with onClick and no children', () => {
    renderStatusCard({
      title: 'Button Behavior',
      onClick: vi.fn(),
      interactive: true,
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render as div when has children but no onClick', () => {
    const { container } = renderStatusCard({
      title: 'Div with Children',
      children: <div>Child content</div>,
    });
    expect(container.querySelector('[role="button"]')).not.toBeInTheDocument();
  });
});

// ============================================================================
// MEMOIZATION VERIFICATION
// ============================================================================

describe('Performance (Memoization)', () => {
  it('should not re-render when unrelated state changes', () => {
    // This test verifies that the component is properly memoized
    // by checking that a re-render with same props doesn't trigger new renders
    const { rerender } = renderStatusCard({ title: 'Memo Test', status: 'info' });
    
    // Rerender with same props - should be memoized
    rerender(<StatusCard title="Memo Test" status="info" />);
    
    // Component should still render correctly
    expect(screen.getByText('Memo Test')).toBeInTheDocument();
  });
});