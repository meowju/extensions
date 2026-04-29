# DataTable Component - Best Practices Demonstration

This React component demonstrates best practices for building production-ready React components, including proper TypeScript typing, state management, error handling, and performance optimization.

## Key Features

- **Type-safe Props** - Comprehensive TypeScript types with discriminated unions
- **Predictable State** - `useReducer` for complex state management
- **Result Types** - Functional error handling with `Result<T, E>` pattern
- **Performance** - Memoization with `useMemo` and `useCallback`
- **Error Boundaries** - Class-based error boundary for graceful error handling
- **Accessibility** - ARIA labels, keyboard navigation support

## Type System

### Branded Types

```typescript
type DataTableId = string & { readonly __brand: unique symbol };
```

Prevents mixing table IDs with regular strings.

### Discriminated Unions

```typescript
type ColumnType = 
  | { kind: 'string'; accessor: string }
  | { kind: 'number'; accessor: string; format?: Intl.NumberFormatOptions }
  | { kind: 'date'; accessor: string; format?: Intl.DateTimeFormatOptions }
  | { kind: 'currency'; accessor: string; currency?: string };
```

Enables exhaustive type checking when handling different column types.

### Result Types

```typescript
type Result<T, E = TableError> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Provides explicit error handling without exceptions for expected failures.

## State Management

### Reducer Pattern

Complex state transitions are managed through a reducer with discriminated union actions:

```typescript
type TableAction =
  | { type: 'SET_SORT'; columnId: string; direction: SortDirection }
  | { type: 'SET_FILTER'; columnId: string; value: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SELECT_ROW'; id: DataTableId }
  // ... other actions
```

### Readonly Data Structures

Props use `readonly` modifiers and `ReadonlyMap`/`ReadonlySet` for immutability signals.

## Performance Considerations

### Memoization Strategy

| Hook | When to Use |
|------|-------------|
| `useMemo` | Expensive computations (sorting, filtering) |
| `useCallback` | Event handlers passed to children |
| `React.memo` | Pure sub-components that re-render often |

### Callback Refs

For stable callback references that don't trigger re-renders:

```typescript
const onRowClickRef = useRef(onRowClick);
useEffect(() => {
  onRowClickRef.current = onRowClick;
}, [onRowClick]);
```

## Error Handling

### Validation Functions

```typescript
function validateData(data: unknown): Result<readonly Row[]> {
  if (!Array.isArray(data)) {
    return { ok: false, error: { type: 'InvalidData', reason: 'Data must be an array' } };
  }
  return { ok: true, value: data };
}
```

### Error Boundary

Class-based error boundary catches rendering errors:

```typescript
class DataTableErrorBoundary extends React.Component<Props, State> {
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to monitoring service
  }
}
```

## Usage Example

```tsx
import DataTable, { createTableId, type Column } from './DataTable';

const columns: readonly Column[] = [
  { id: 'name', header: 'Name', type: { kind: 'string', accessor: 'name' }, sortable: true },
  { id: 'age', header: 'Age', type: { kind: 'number', accessor: 'age' }, sortable: true },
];

const data: readonly Row[] = [
  { id: createTableId('1'), name: 'Alice', age: 30 },
  { id: createTableId('2'), name: 'Bob', age: 25 },
];

function App() {
  const handleRowClick = (row) => {
    console.log('Clicked:', row);
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      caption="User Directory"
      defaultPageSize={10}
      enablePagination
      enableSelection
      onRowClick={handleRowClick}
    />
  );
}
```

## Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `readonly Column[]` | Yes | - | Column definitions |
| `data` | `readonly Row[]` | Yes | - | Table data |
| `caption` | `string` | No | - | Table caption |
| `defaultPageSize` | `number` | No | `10` | Initial page size |
| `pageSizeOptions` | `readonly number[]` | No | `[5, 10, 25, 50]` | Available page sizes |
| `onRowClick` | `(row: Row) => void` | No | - | Row click handler |
| `onSelectionChange` | `(ids: ReadonlySet<DataTableId>) => void` | No | - | Selection change handler |
| `onError` | `(error: TableError) => void` | No | - | Error callback |
| `enablePagination` | `boolean` | No | `true` | Enable pagination |
| `enableSelection` | `boolean` | No | `true` | Enable row selection |
| `loading` | `boolean` | No | `false` | Show loading skeleton |
| `emptyMessage` | `string` | No | `'No data available'` | Empty state message |

## Testing

Run tests with:

```bash
npm test -- DataTable
```

The test suite covers:
- Props validation
- Sorting functionality
- Filtering functionality
- Pagination
- Row selection
- Error handling
- Accessibility
- Performance with large datasets

## Best Practices Summary

1. **Type Everything** - Use strict TypeScript with branded types and discriminated unions
2. **Immutability** - Use `readonly` modifiers and immutable data structures
3. **Predictable State** - Use `useReducer` for complex state logic
4. **Explicit Errors** - Return `Result<T, E>` instead of throwing for expected errors
5. **Memoize Wisely** - Only memoize expensive computations and callbacks
6. **Error Boundaries** - Wrap components to handle unexpected errors gracefully
7. **Accessibility** - Include ARIA attributes and keyboard support
8. **Test Thoroughly** - Cover happy paths, edge cases, and error scenarios
