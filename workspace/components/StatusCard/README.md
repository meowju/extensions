# StatusCard Component

A production-ready, accessible status indicator card component following React best practices.

## 📦 Features

- **TypeScript-first**: Full type safety with exported TypeScript types
- **Memoized components**: `React.memo` on all sub-components for performance
- **Composable API**: Flexible props with sensible defaults
- **Accessible by default**: ARIA labels, keyboard navigation, screen reader support
- **Theming support**: CSS custom properties for easy customization
- **Animation variants**: Pulse, bounce, fade, or none
- **Multiple sizes**: sm, md, lg with consistent styling
- **Status variants**: success, warning, error, info, neutral

## 🏗️ Architecture

```
StatusCard/
├── index.ts              # Main export
├── StatusCard.tsx        # Component implementation
├── StatusCard.module.css # CSS Module styles
├── StatusCard.test.tsx   # Comprehensive test suite
├── StatusCard.demo.tsx   # Interactive demo
└── StatusCard.demo.css   # Demo styles
```

## 🎯 React Best Practices Implemented

### 1. **Component Architecture**
- **Single Responsibility**: Each component has one clear purpose
- **Memoization**: All sub-components wrapped with `React.memo`
- **Deterministic Rendering**: Stable references via `useCallback` and `useMemo`
- **Composition Pattern**: Composable props API with sensible defaults

### 2. **TypeScript Integration**
```typescript
// Exhaustive union types for type safety
export type StatusLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type CardSize = 'sm' | 'md' | 'lg';
export type AnimationVariant = 'none' | 'pulse' | 'bounce' | 'fade';
```

### 3. **State Management**
- **Minimal State**: Props control everything, internal state minimized
- **Stable Handlers**: `useCallback` for event handlers to prevent re-renders
- **Computed Values**: `useMemo` for expensive computations

### 4. **Performance Optimization**
```typescript
// Memoized button to prevent unnecessary re-renders
const CalculatorButton = memo<CalculatorButtonProps>(...);

// Memoized class names to avoid string concatenation on each render
const containerClassName = useMemo(
  () => ['status-card', STATUS_MAP[status], SIZE_MAP[size]].filter(Boolean).join(' '),
  [status, size]
);
```

### 5. **Accessibility (A11y)**
- Semantic HTML (`<button>` when clickable)
- ARIA attributes (`aria-label`, `aria-hidden`, `role`)
- Keyboard navigation (Enter/Space support)
- Focus management (`tabIndex`)

### 6. **CSS Architecture**
- **CSS Modules**: Scoped styles without conflicts
- **CSS Custom Properties**: Design tokens for theming
- **Mobile-first**: Responsive design patterns
- **Reduced motion**: `prefers-reduced-motion` support

### 7. **Testing Patterns**
- Component rendering tests
- User interaction tests (clicks, keyboard)
- Accessibility tests
- Snapshot tests
- Edge case coverage

## 📖 Usage

### Basic Usage
```tsx
import { StatusCard } from './StatusCard';

<StatusCard
  title="Deployment Active"
  description="Running for 2 hours"
  status="success"
/>
```

### Interactive with Click Handler
```tsx
import { StatusCard } from './StatusCard';

<StatusCard
  title="Server Status"
  status="info"
  onClick={() => console.log('Clicked!')}
  interactive
  data-testid="server-status"
/>
```

### With Custom Icon and Children
```tsx
import { StatusCard } from './StatusCard';
import { CustomIcon } from './icons';

<StatusCard
  title="API Health"
  status="warning"
  icon={<CustomIcon />}
  iconPosition="right"
  children={
    <div>
      <span>Latency: 45ms</span>
      <span>Uptime: 99.9%</span>
    </div>
  }
/>
```

### All Sizes
```tsx
<StatusCard title="Small" status="info" size="sm" />
<StatusCard title="Medium" status="success" size="md" />
<StatusCard title="Large" status="warning" size="lg" />
```

## 🎨 Theming

Override CSS custom properties to customize appearance:

```css
:root {
  /* Status colors */
  --color-success: #10b981;
  --color-success-bg: #ecfdf5;
  
  /* Component tokens */
  --status-card-radius: 12px;
  --status-card-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

## 🔧 Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | Required | Primary label text |
| `description` | `string` | - | Secondary description |
| `status` | `StatusLevel` | Required | Status severity level |
| `size` | `CardSize` | `'md'` | Size variant |
| `icon` | `React.ReactNode` | - | Custom icon |
| `iconPosition` | `IconPosition` | `'left'` | Icon position |
| `onClick` | `() => void` | - | Click handler |
| `interactive` | `boolean` | `false` | Enable interactions |
| `animation` | `AnimationVariant` | `'pulse'` | Animation type |
| `className` | `string` | - | Custom class name |
| `data-testid` | `string` | - | Test identifier |
| `ariaLabel` | `string` | `title` | Accessibility label |
| `children` | `React.ReactNode` | - | Body content |

## 🧪 Running Tests

```bash
# Run tests
bun test StatusCard.test.tsx

# Run with coverage
bun test --coverage StatusCard.test.tsx

# Run in watch mode
bun test --watch StatusCard.test.tsx
```

## 🔍 Best Practices Checklist

- [x] TypeScript-first with strict typing
- [x] Memoized components to prevent unnecessary re-renders
- [x] Composable props API with sensible defaults
- [x] Accessible by default (ARIA labels, keyboard nav)
- [x] CSS custom properties for theming flexibility
- [x] Deterministic rendering with stable references
- [x] Comprehensive test coverage
- [x] Documentation and JSDoc comments

---

*Version 1.0.0 • Part of the Sovereign Palace React Component Suite*