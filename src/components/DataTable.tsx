/**
 * DataTable Component - React Best Practices Demonstration
 * 
 * Demonstrates:
 * - Proper TypeScript prop typing with discriminated unions
 * - Result types for error handling
 * - useReducer for predictable state management
 * - Performance optimization with useMemo/useCallback
 * - Error boundaries for graceful error handling
 * - Input validation patterns
 */

import React, {
  useReducer,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FC,
  type ChangeEvent,
} from 'react';

// ============================================
// SECTION 1: TYPE DEFINITIONS
// ============================================

// Branded types for type safety
type DataTableId = string & { readonly __brand: unique symbol };
type SortDirection = 'asc' | 'desc';
type CellAlignment = 'left' | 'center' | 'right';

// Discriminated union for column types
type ColumnType = 
  | { kind: 'string'; accessor: string }
  | { kind: 'number'; accessor: string; format?: Intl.NumberFormatOptions }
  | { kind: 'date'; accessor: string; format?: Intl.DateTimeFormatOptions }
  | { kind: 'currency'; accessor: string; currency?: string };

interface Column {
  readonly id: string;
  readonly header: string;
  readonly type: ColumnType;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly width?: string;
  readonly align?: CellAlignment;
}

interface Row {
  readonly id: DataTableId;
  readonly [key: string]: unknown;
}

// Result type for operations that can fail
type Result<T, E = TableError> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

// Error types with discriminated union
type TableError =
  | { type: 'InvalidColumn'; columnId: string }
  | { type: 'InvalidData'; reason: string }
  | { type: 'SortError'; message: string }
  | { type: 'FilterError'; message: string };

// Action types for reducer (discriminated union)
type TableAction =
  | { type: 'SET_SORT'; columnId: string; direction: SortDirection }
  | { type: 'SET_FILTER'; columnId: string; value: string }
  | { type: 'CLEAR_FILTER'; columnId: string }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_PAGE_SIZE'; size: number }
  | { type: 'SELECT_ROW'; id: DataTableId }
  | { type: 'DESELECT_ROW'; id: DataTableId }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_DATA'; data: readonly Row[] };

// State interface
interface TableState {
  readonly sortColumnId: string | null;
  readonly sortDirection: SortDirection;
  readonly filters: ReadonlyMap<string, string>;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly selectedRowIds: ReadonlySet<DataTableId>;
  readonly data: readonly Row[];
}

// Props interface with comprehensive typing
interface DataTableProps {
  readonly columns: readonly Column[];
  readonly data: readonly Row[];
  readonly caption?: string;
  readonly defaultPageSize?: number;
  readonly pageSizeOptions?: readonly number[];
  readonly onRowClick?: (row: Row) => void;
  readonly onSelectionChange?: (selectedIds: ReadonlySet<DataTableId>) => void;
  readonly onError?: (error: TableError) => void;
  readonly enablePagination?: boolean;
  readonly enableSelection?: boolean;
  readonly loading?: boolean;
  readonly emptyMessage?: string;
  readonly className?: string;
}

// ============================================
// SECTION 2: HELPER FUNCTIONS & VALIDATORS
// ============================================

// Safe ID creation with branded type
function createTableId(id: string): DataTableId {
  return id as DataTableId;
}

// Validation functions using Result pattern
function validateColumn(columnId: string, columns: readonly Column[]): Result<Column> {
  const column = columns.find(col => col.id === columnId);
  if (!column) {
    return { ok: false, error: { type: 'InvalidColumn', columnId } };
  }
  return { ok: true, value: column };
}

function validateData(data: unknown): Result<readonly Row[]> {
  if (!Array.isArray(data)) {
    return { ok: false, error: { type: 'InvalidData', reason: 'Data must be an array' } };
  }
  
  // Validate each row has an id
  const validatedRows = data.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Row at index ${index} is not an object`);
    }
    const row = item as Record<string, unknown>;
    if (!('id' in row) || typeof row.id !== 'string') {
      return { ...row, id: `row-${index}` };
    }
    return row;
  }) as Row[];
  
  return { ok: true, value: validatedRows };
}

// Sorting function with Result type
function safeSort<T extends Record<string, unknown>>(
  data: readonly T[],
  columnId: string,
  direction: SortDirection,
  columns: readonly Column[]
): Result<readonly T[]> {
  const columnResult = validateColumn(columnId, columns);
  if (!columnResult.ok) {
    return columnResult;
  }
  
  const column = columnResult.value;
  if (!column.sortable) {
    return { ok: false, error: { type: 'SortError', message: 'Column is not sortable' } };
  }
  
  const accessor = column.type.accessor;
  
  const sorted = [...data].sort((a, b) => {
    const valueA = a[accessor];
    const valueB = b[accessor];
    
    // Handle null/undefined
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return direction === 'asc' ? 1 : -1;
    if (valueB == null) return direction === 'asc' ? -1 : 1;
    
    // Compare based on type
    let comparison = 0;
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      comparison = valueA - valueB;
    } else {
      comparison = String(valueA).localeCompare(String(valueB));
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  return { ok: true, value: sorted };
}

// ============================================
// SECTION 3: REDUCER & STATE MANAGEMENT
// ============================================

function createInitialState(
  data: readonly Row[],
  defaultPageSize: number
): TableState {
  return {
    sortColumnId: null,
    sortDirection: 'asc',
    filters: new Map(),
    currentPage: 1,
    pageSize: defaultPageSize,
    selectedRowIds: new Set(),
    data,
  };
}

function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'SET_SORT':
      return {
        ...state,
        sortColumnId: action.columnId,
        sortDirection: action.direction,
        currentPage: 1, // Reset to first page on sort
      };
    
    case 'SET_FILTER': {
      const newFilters = new Map(state.filters);
      newFilters.set(action.columnId, action.value);
      return {
        ...state,
        filters: newFilters,
        currentPage: 1, // Reset to first page on filter
      };
    }
    
    case 'CLEAR_FILTER': {
      const newFilters = new Map(state.filters);
      newFilters.delete(action.columnId);
      return {
        ...state,
        filters: newFilters,
        currentPage: 1,
      };
    }
    
    case 'CLEAR_ALL_FILTERS':
      return {
        ...state,
        filters: new Map(),
        currentPage: 1,
      };
    
    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.page,
      };
    
    case 'SET_PAGE_SIZE':
      return {
        ...state,
        pageSize: action.size,
        currentPage: 1, // Reset to first page on size change
      };
    
    case 'SELECT_ROW': {
      const newSelection = new Set(state.selectedRowIds);
      newSelection.add(action.id);
      return {
        ...state,
        selectedRowIds: newSelection,
      };
    }
    
    case 'DESELECT_ROW': {
      const newSelection = new Set(state.selectedRowIds);
      newSelection.delete(action.id);
      return {
        ...state,
        selectedRowIds: newSelection,
      };
    }
    
    case 'SELECT_ALL':
      return {
        ...state,
        selectedRowIds: new Set(state.data.map(row => row.id)),
      };
    
    case 'DESELECT_ALL':
      return {
        ...state,
        selectedRowIds: new Set(),
      };
    
    case 'SET_DATA':
      return {
        ...state,
        data: action.data,
        currentPage: 1,
        selectedRowIds: new Set(), // Clear selection on data change
      };
    
    default:
      return state;
  }
}

// ============================================
// SECTION 4: CUSTOM HOOKS
// ============================================

function useDataTable(props: DataTableProps) {
  const {
    data: rawData,
    defaultPageSize = 10,
    onError,
  } = props;
  
  // Validate data on mount/change
  useEffect(() => {
    const result = validateData(rawData);
    if (!result.ok) {
      onError?.(result.error);
    }
  }, [rawData, onError]);
  
  const validatedData = useMemo(() => {
    const result = validateData(rawData);
    return result.ok ? result.value : [];
  }, [rawData]);
  
  // Initialize reducer with validated data
  const [state, dispatch] = useReducer(
    tableReducer,
    validatedData,
    () => createInitialState(validatedData, defaultPageSize)
  );
  
  // Sync external data changes
  useEffect(() => {
    dispatch({ type: 'SET_DATA', data: validatedData });
  }, [validatedData]);
  
  return { state, dispatch };
}

// ============================================
// SECTION 5: SUB-COMPONENTS
// ============================================

// Header Cell Component
interface HeaderCellProps {
  column: Column;
  sortDirection: SortDirection | null;
  isSorted: boolean;
  onSort: (columnId: string) => void;
}

const HeaderCell: FC<HeaderCellProps> = React.memo(({
  column,
  sortDirection,
  isSorted,
  onSort,
}) => {
  const handleClick = useCallback(() => {
    if (column.sortable) {
      onSort(column.id);
    }
  }, [column.id, column.sortable, onSort]);
  
  const alignStyle = column.align ?? 'left';
  
  return (
    <th
      className={`px-4 py-3 text-${alignStyle} text-sm font-semibold text-gray-700 
        bg-gray-50 border-b border-gray-200 ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
      style={{ width: column.width }}
      onClick={handleClick}
      aria-sort={isSorted ? sortDirection : undefined}
    >
      <div className="flex items-center gap-2">
        <span>{column.header}</span>
        {column.sortable && (
          <SortIcon isSorted={isSorted} direction={sortDirection} />
        )}
      </div>
    </th>
  );
});

HeaderCell.displayName = 'HeaderCell';

// Sort Icon Component
interface SortIconProps {
  isSorted: boolean;
  direction: SortDirection | null;
}

const SortIcon: FC<SortIconProps> = ({ isSorted, direction }) => {
  if (!isSorted) {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  
  return direction === 'asc' ? (
    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
};

SortIcon.displayName = 'SortIcon';

// Filter Input Component
interface FilterInputProps {
  columnId: string;
  value: string;
  onChange: (columnId: string, value: string) => void;
  onClear: (columnId: string) => void;
}

const FilterInput: FC<FilterInputProps> = React.memo(({ columnId, value, onChange, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onChange(columnId, e.target.value);
  }, [columnId, onChange]);
  
  const handleClear = useCallback(() => {
    onClear(columnId);
    inputRef.current?.focus();
  }, [columnId, onClear]);
  
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Filter..."
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={`Filter for ${columnId}`}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear filter"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

FilterInput.displayName = 'FilterInput';

// Pagination Component
interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination: FC<PaginationProps> = React.memo(({
  currentPage,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  const handlePageSizeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange(Number(e.target.value));
  }, [onPageSizeChange]);
  
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <span className="text-sm text-gray-700">
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
      </div>
      
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          First
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          Previous
        </button>
        
        <span className="px-3 py-1 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          Next
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          Last
        </button>
      </nav>
    </div>
  );
});

Pagination.displayName = 'Pagination';

// Loading Skeleton Component
interface LoadingSkeletonProps {
  rows: number;
  columns: number;
}

const LoadingSkeleton: FC<LoadingSkeletonProps> = ({ rows, columns }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

// Empty State Component
interface EmptyStateProps {
  message: string;
  columns: number;
}

const EmptyState: FC<EmptyStateProps> = ({ message, columns }) => {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-12 text-center text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-lg">{message}</p>
      </td>
    </tr>
  );
};

// ============================================
// SECTION 6: MAIN COMPONENT
// ============================================

const DataTable: FC<DataTableProps> = (props) => {
  const {
    columns,
    caption,
    pageSizeOptions = [5, 10, 25, 50],
    onRowClick,
    onSelectionChange,
    onError,
    enablePagination = true,
    enableSelection = true,
    loading = false,
    emptyMessage = 'No data available',
    className = '',
  } = props;
  
  const { state, dispatch } = useDataTable(props);
  
  // Callback refs for stable references
  const onRowClickRef = useRef(onRowClick);
  const onSelectionChangeRef = useRef(onSelectionChange);
  
  useEffect(() => {
    onRowClickRef.current = onRowClick;
    onSelectionChangeRef.current = onSelectionChange;
  }, [onRowClick, onSelectionChange]);
  
  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let result = state.data;
    
    // Apply filters
    state.filters.forEach((filterValue, columnId) => {
      if (!filterValue.trim()) return;
      
      const column = columns.find(col => col.id === columnId);
      if (!column) return;
      
      const accessor = column.type.accessor;
      const lowerFilter = filterValue.toLowerCase();
      
      result = result.filter(row => {
        const cellValue = row[accessor];
        if (cellValue == null) return false;
        return String(cellValue).toLowerCase().includes(lowerFilter);
      });
    });
    
    // Apply sorting
    if (state.sortColumnId) {
      const sortResult = safeSort(result, state.sortColumnId, state.sortDirection, columns);
      if (sortResult.ok) {
        result = sortResult.value;
      } else {
        onError?.(sortResult.error);
      }
    }
    
    return result;
  }, [state.data, state.filters, state.sortColumnId, state.sortDirection, columns, onError]);
  
  // Memoized paginated data
  const paginatedData = useMemo(() => {
    if (!enablePagination) return processedData;
    
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    return processedData.slice(start, end);
  }, [processedData, state.currentPage, state.pageSize, enablePagination]);
  
  // Callbacks with useCallback for stable references
  const handleSort = useCallback((columnId: string) => {
    const newDirection = 
      state.sortColumnId === columnId && state.sortDirection === 'asc' 
        ? 'desc' 
        : 'asc';
    dispatch({ type: 'SET_SORT', columnId, direction: newDirection });
  }, [state.sortColumnId, state.sortDirection]);
  
  const handleFilterChange = useCallback((columnId: string, value: string) => {
    dispatch({ type: 'SET_FILTER', columnId, value });
  }, []);
  
  const handleFilterClear = useCallback((columnId: string) => {
    dispatch({ type: 'CLEAR_FILTER', columnId });
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);
  
  const handlePageSizeChange = useCallback((size: number) => {
    dispatch({ type: 'SET_PAGE_SIZE', size });
  }, []);
  
  const handleRowClick = useCallback((row: Row) => {
    onRowClickRef.current?.(row);
  }, []);
  
  const handleRowSelect = useCallback((id: DataTableId) => {
    if (state.selectedRowIds.has(id)) {
      dispatch({ type: 'DESELECT_ROW', id });
    } else {
      dispatch({ type: 'SELECT_ROW', id });
    }
  }, [state.selectedRowIds]);
  
  const handleSelectAll = useCallback(() => {
    if (state.selectedRowIds.size === paginatedData.length) {
      dispatch({ type: 'DESELECT_ALL' });
    } else {
      dispatch({ type: 'SELECT_ALL' });
    }
  }, [state.selectedRowIds.size, paginatedData.length]);
  
  // Notify selection changes
  useEffect(() => {
    onSelectionChangeRef.current?.(state.selectedRowIds);
  }, [state.selectedRowIds]);
  
  // Helper to format cell values
  const formatCellValue = useCallback((value: unknown, columnType: ColumnType): string => {
    if (value == null) return '-';
    
    switch (columnType.kind) {
      case 'number':
        return new Intl.NumberFormat('en-US', columnType.format).format(value as number);
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: columnType.currency ?? 'USD',
        }).format(value as number);
      case 'date':
        return new Intl.DateTimeFormat('en-US', columnType.format).format(new Date(value as string | number));
      case 'string':
      default:
        return String(value);
    }
  }, []);
  
  const allSelected = paginatedData.length > 0 && 
    paginatedData.every(row => state.selectedRowIds.has(row.id));
  const someSelected = paginatedData.some(row => state.selectedRowIds.has(row.id));
  
  return (
    <div className={`data-table-container ${className}`}>
      {/* Filter bar */}
      {columns.some(col => col.filterable) && (
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          {columns
            .filter(col => col.filterable)
            .map(column => (
              <div key={column.id} className="flex-1 min-w-[150px] max-w-[300px]">
                <label className="block mb-1 text-xs font-medium text-gray-600">
                  Filter {column.header}
                </label>
                <FilterInput
                  columnId={column.id}
                  value={state.filters.get(column.id) ?? ''}
                  onChange={handleFilterChange}
                  onClear={handleFilterClear}
                />
              </div>
            ))}
          {state.filters.size > 0 && (
            <button
              onClick={() => dispatch({ type: 'CLEAR_ALL_FILTERS' })}
              className="self-end px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left divide-y divide-gray-200">
          {caption && (
            <caption className="px-4 py-3 text-sm text-gray-600 bg-gray-50">
              {caption}
            </caption>
          )}
          
          <thead className="bg-gray-50">
            <tr>
              {enableSelection && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map(column => (
                <HeaderCell
                  key={column.id}
                  column={column}
                  sortDirection={state.sortColumnId === column.id ? state.sortDirection : null}
                  isSorted={state.sortColumnId === column.id}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <LoadingSkeleton rows={state.pageSize} columns={columns.length} />
            ) : paginatedData.length === 0 ? (
              <EmptyState message={emptyMessage} columns={columns.length + (enableSelection ? 1 : 0)} />
            ) : (
              paginatedData.map(row => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} 
                    ${state.selectedRowIds.has(row.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => handleRowClick(row)}
                >
                  {enableSelection && (
                    <td className="px-4 py-3 w-12" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={state.selectedRowIds.has(row.id)}
                        onChange={() => handleRowSelect(row.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        aria-label={`Select row ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map(column => {
                    const alignStyle = column.align ?? 
                      (column.type.kind === 'number' || column.type.kind === 'currency' ? 'right' : 'left');
                    
                    return (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-sm text-gray-900 text-${alignStyle}`}
                      >
                        {formatCellValue(row[column.type.accessor], column.type)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {enablePagination && !loading && (
        <Pagination
          currentPage={state.currentPage}
          pageSize={state.pageSize}
          totalItems={processedData.length}
          pageSizeOptions={pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
};

// ============================================
// SECTION 7: ERROR BOUNDARY COMPONENT
// ============================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class DataTableErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('DataTable Error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// SECTION 8: WRAPPED COMPONENT WITH ERROR BOUNDARY
// ============================================

interface DataTableWithBoundaryProps extends DataTableProps {
  enableErrorBoundary?: boolean;
}

const DataTableWithBoundary: FC<DataTableWithBoundaryProps> = ({
  enableErrorBoundary = true,
  ...props
}) => {
  const [error, setError] = useState<Error | null>(null);
  
  const handleError = useCallback((error: TableError) => {
    console.error('Table Error:', error);
    setError(new Error(`${error.type}: ${JSON.stringify(error)}`));
  }, []);
  
  const handleBoundaryError = useCallback((error: Error) => {
    setError(error);
  }, []);
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Table Error
        </h3>
        <p className="text-red-600 mb-4">{error.message}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>
    );
  }
  
  if (enableErrorBoundary) {
    return (
      <DataTableErrorBoundary onError={handleBoundaryError}>
        <DataTable {...props} onError={handleError} />
      </DataTableErrorBoundary>
    );
  }
  
  return <DataTable {...props} onError={handleError} />;
};

// ============================================
// SECTION 9: EXPORTS
// ============================================

export {
  DataTable,
  DataTableWithBoundary,
  DataTableErrorBoundary,
  createTableId,
  validateColumn,
  validateData,
  safeSort,
  type Column,
  type ColumnType,
  type Row,
  type TableState,
  type TableAction,
  type TableError,
  type DataTableProps,
  type DataTableId,
  type Result,
};

export default DataTableWithBoundary;
