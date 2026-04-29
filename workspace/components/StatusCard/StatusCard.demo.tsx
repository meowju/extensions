/**
 * StatusCard Demo
 *
 * Interactive demonstration of the StatusCard component
 * showcasing various configurations and use cases.
 *
 * @module components/StatusCard/StatusCard.demo
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { StatusCard, type StatusLevel } from './StatusCard';
import './StatusCard.demo.css';

/**
 * Demo data for showcasing different status configurations
 */
const DEMO_ITEMS: Array<{
  title: string;
  description: string;
  status: StatusLevel;
}> = [
  {
    title: 'Deployment Active',
    description: 'Running in production • 2 hours uptime',
    status: 'success',
  },
  {
    title: 'Cache Warming',
    description: 'Populating cache for model queries',
    status: 'warning',
  },
  {
    title: 'Connection Failed',
    description: 'Unable to reach database server',
    status: 'error',
  },
  {
    title: 'System Ready',
    description: 'All services operational',
    status: 'info',
  },
  {
    title: 'Idle State',
    description: 'Waiting for input',
    status: 'neutral',
  },
];

/**
 * StatusCardDemo Component
 *
 * Demonstrates the StatusCard component with:
 * - All status variants
 * - Interactive state management
 * - Custom click handling
 * - Size variations
 * - Icon position variations
 */
export function StatusCardDemo() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [animation, setAnimation] = useState<'none' | 'pulse' | 'bounce' | 'fade'>('pulse');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');

  const handleCardClick = (title: string) => {
    setSelectedCard(prev => prev === title ? null : title);
    console.log(`Card clicked: ${title}`);
  };

  return (
    <div className="status-card-demo">
      <h2 className="status-card-demo__title">StatusCard Component Demo</h2>
      
      {/* Controls */}
      <div className="status-card-demo__controls">
        <fieldset className="status-card-demo__fieldset">
          <legend className="status-card-demo__legend">Size</legend>
          <label>
            <input
              type="radio"
              name="size"
              value="sm"
              checked={size === 'sm'}
              onChange={() => setSize('sm')}
            />
            Small
          </label>
          <label>
            <input
              type="radio"
              name="size"
              value="md"
              checked={size === 'md'}
              onChange={() => setSize('md')}
            />
            Medium
          </label>
          <label>
            <input
              type="radio"
              name="size"
              value="lg"
              checked={size === 'lg'}
              onChange={() => setSize('lg')}
            />
            Large
          </label>
        </fieldset>

        <fieldset className="status-card-demo__fieldset">
          <legend className="status-card-demo__legend">Animation</legend>
          <label>
            <input
              type="radio"
              name="animation"
              value="pulse"
              checked={animation === 'pulse'}
              onChange={() => setAnimation('pulse')}
            />
            Pulse
          </label>
          <label>
            <input
              type="radio"
              name="animation"
              value="bounce"
              checked={animation === 'bounce'}
              onChange={() => setAnimation('bounce')}
            />
            Bounce
          </label>
          <label>
            <input
              type="radio"
              name="animation"
              value="fade"
              checked={animation === 'fade'}
              onChange={() => setAnimation('fade')}
            />
            Fade
          </label>
          <label>
            <input
              type="radio"
              name="animation"
              value="none"
              checked={animation === 'none'}
              onChange={() => setAnimation('none')}
            />
            None
          </label>
        </fieldset>
      </div>

      {/* Status Variants Grid */}
      <section className="status-card-demo__section">
        <h3 className="status-card-demo__subtitle">Status Variants</h3>
        <div className="status-card-demo__grid">
          {DEMO_ITEMS.map((item) => (
            <StatusCard
              key={item.title}
              title={item.title}
              description={item.description}
              status={item.status}
              size={size}
              animation={animation}
              onClick={() => handleCardClick(item.title)}
              interactive={selectedCard === item.title}
              data-testid={`status-card-${item.status}`}
            />
          ))}
        </div>
      </section>

      {/* Icon Positions */}
      <section className="status-card-demo__section">
        <h3 className="status-card-demo__subtitle">Icon Positions</h3>
        <div className="status-card-demo__grid status-card-demo__grid--columns">
          <StatusCard
            title="Icon Left"
            description="Icon positioned on the left"
            status="success"
            size={size}
            iconPosition="left"
            animation={animation}
          />
          <StatusCard
            title="Icon Right"
            description="Icon positioned on the right"
            status="info"
            size={size}
            iconPosition="right"
            animation={animation}
          />
          <StatusCard
            title="Icon Only"
            description="Icon only variant"
            status="warning"
            size={size}
            iconPosition="icon-only"
            animation={animation}
          />
        </div>
      </section>

      {/* With Children */}
      <section className="status-card-demo__section">
        <h3 className="status-card-demo__subtitle">With Children Content</h3>
        <div className="status-card-demo__grid status-card-demo__grid--columns">
          <StatusCard
            title="Deployment Details"
            description="Current deployment information"
            status="success"
            size={size}
            animation={animation}
            children={
              <div className="status-card-demo__children">
                <span>Version: 2.4.1</span>
                <span>Region: us-east-1</span>
                <span>Instances: 3</span>
              </div>
            }
          />
          <StatusCard
            title="Error Details"
            description="Error information and stack trace"
            status="error"
            size={size}
            animation={animation}
            children={
              <div className="status-card-demo__children">
                <span>Error Code: E503</span>
                <span>Endpoint: /api/v1/users</span>
                <span>Request ID: abc123</span>
              </div>
            }
          />
        </div>
      </section>

      {/* Selected State Display */}
      {selectedCard && (
        <div className="status-card-demo__selected">
          Selected: <strong>{selectedCard}</strong>
        </div>
      )}
    </div>
  );
}

export default StatusCardDemo;