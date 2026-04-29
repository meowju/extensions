// DataTable Component - React Best Practices Demonstration
// =========================================================
//
// This module exports a production-ready DataTable component
// that demonstrates modern React patterns and best practices.
//
// KEY BEST PRACTICES IMPLEMENTED:
// ------------------------------
//
// 1. CUSTOM HOOKS
//    - useTableSort: Manages sorting state and logic
//    - usePagination: Handles pagination calculations and state
//    These hooks encapsulate stateful logic, making it reusable
//    and testable in isolation.
//
// 2. COMPOUND COMPONENT PATTERN
//    - Export sub-components (HeaderCell, Row, Pagination)
//    - Allows advanced customization while providing sensible defaults
//    - Components can be composed together for custom behavior
//
// 3. TypeScript GENERICS
//    - Full type safety with generic data type <T>
//    - Column definitions are type-safe
//    - Proper type inference throughout
//
// 4. PERFORMANCE OPTIMIZATION
//    - React.memo on sub-components (HeaderCell, TableRow)
//    - useMemo for expensive computations
//    - useCallback for stable function references
//    - Proper key props to enable React's reconciliation
//
// 5. ACCESSIBILITY (a11y)
//    - ARIA attributes (aria-sort, aria-label, aria-current)
//    - Semantic HTML (nav, table, thead, tbody)
//    - Keyboard navigation support
//    - Screen reader announcements
//    - useId for stable, unique IDs
//
// 6. CONTROLLED vs UNCONTROLLED
//    - Supports both patterns
//    - selectedIds can be controlled or use internal state
//    - Flexible API design
//
// 7. ERROR BOUNDARIES & EDGE CASES
//    - Loading skeleton state
//    - Empty state with custom message
//    - Graceful handling of missing data
//
// 8. SEPARATION OF CONCERNS
//    - State management in hooks
//    - Component rendering in presentational components
//    - Business logic separated from UI
//
// USAGE:
// ------
// import { DataTable, Column } from './DataTable';
// import { FullFeaturedDataTableExample } from './DataTable.demo';

export { DataTable } from './DataTable';
export type { DataTableProps, Column, SortConfig, PaginationConfig } from './DataTable';

// Demo examples
export {
  BasicDataTableExample,
  PaginatedDataTableExample,
  SelectableDataTableExample,
  CustomRenderDataTableExample,
  ClickableDataTableExample,
  LoadingDataTableExample,
  EmptyDataTableExample,
  FullFeaturedDataTableExample,
} from './DataTable.demo';

export type { User } from './DataTable.demo';
