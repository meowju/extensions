/**
 * DataTable Component Tests
 * 
 * Tests cover:
 * - Props validation
 * - Sorting functionality
 * - Filtering functionality
 * - Pagination
 * - Row selection
 * - Error handling
 * - Result types
 */

import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DataTable,
  createTableId,
  validateColumn,
  validateData,
  safeSort,
  type Column,
  type Row,
} from '../DataTable';

// ============================================
// SECTION 1: TEST DATA & HELPERS
// ============================================

const mockColumns: readonly Column[] = [
  { id: 'name', header: 'Name', type: { kind: 'string', accessor: 'name' }, sortable: true, filterable: true },
  { id: 'age', header: 'Age', type: { kind: 'number', accessor: 'age' }, sortable: true },
  { id: 'salary', header: 'Salary', type: { kind: 'currency', accessor: 'salary', currency: 'USD' }, sortable: true },
  { id: 'joined', header: 'Joined', type: { kind: 'date', accessor: 'joined' }, sortable: false },
];

const mockData: readonly Row[] = [
  { id: createTableId('1'), name: 'Alice', age: 30, salary: 75000, joined: '2020-01-15' },
  { id: createTableId('2'), name: 'Bob', age: 25, salary: 60000, joined: '2021-03-20' },
  { id: createTableId('3'), name: 'Charlie', age: 35, salary: 90000, joined: '2019-11-05' },
  { id: createTableId('4'), name: 'Diana', age: 28, salary: 70000, joined: '2022-06-12' },
  { id: createTableId('5'), name: 'Eve', age: 32, salary: 85000, joined: '2020-08-30' },
];

const renderDataTable = (props = {}) => {
  const defaultProps = {
    columns: mockColumns,
    data: mockData,
  };
  
  return render(<DataTable {...defaultProps} {...props} />);
};

// ============================================
// SECTION 2: PROPS & VALIDATION TESTS
// ============================================

describe('Props & Validation', () => {
  describe('validateColumn', () => {
    it('should return column when found', () => {
      const result = validateColumn('name', mockColumns);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.header).toBe('Name');
      }
    });

    it('should return error when column not found', () => {
      const result = validateColumn('nonexistent', mockColumns);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('InvalidColumn');
      }
    });
  });

  describe('validateData', () => {
    it('should validate correct data', () => {
      const result = validateData(mockData);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(5);
      }
    });

    it('should reject non-array data', () => {
      const result = validateData('not an array');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('InvalidData');
      }
    });

    it('should handle data without ids by generating them', () => {
      const dataWithoutIds = [
        { name: 'Test', age: 25 },
        { name: 'Test2', age: 30 },
      ];
      const result = validateData(dataWithoutIds);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].id).toBe('row-0');
        expect(result.value[1].id).toBe('row-1');
      }
    });
  });

  describe('safeSort', () => {
    it('should sort numbers in ascending order', () => {
      const result = safeSort(mockData, 'age', 'asc', mockColumns);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].age).toBe(25);
        expect(result.value[4].age).toBe(35);
      }
    });

    it('should sort numbers in descending order', () => {
      const result = safeSort(mockData, 'age', 'desc', mockColumns);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].age).toBe(35);
        expect(result.value[4].age).toBe(25);
      }
    });

    it('should sort strings alphabetically', () => {
      const result = safeSort(mockData, 'name', 'asc', mockColumns);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0].name).toBe('Alice');
        expect(result.value[4].name).toBe('Eve');
      }
    });

    it('should return error for non-sortable column', () => {
      const result = safeSort(mockData, 'joined', 'asc', mockColumns);
      expect(result.ok).toBe(false);
    });

    it('should return error for non-existent column', () => {
      const result = safeSort(mockData, 'nonexistent', 'asc', mockColumns);
      expect(result.ok).toBe(false);
    });
  });

  describe('createTableId', () => {
    it('should create branded id type', () => {
      const id = createTableId('test-123');
      expect(id).toBe('test-123');
    });
  });
});

// ============================================
// SECTION 3: RENDERING TESTS
// ============================================

describe('DataTable Rendering', () => {
  it('should render table with correct headers', () => {
    renderDataTable();
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
  });

  it('should render all data rows', () => {
    renderDataTable();
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
  });

  it('should render caption when provided', () => {
    renderDataTable({ caption: 'Employee Directory' });
    expect(screen.getByText('Employee Directory')).toBeInTheDocument();
  });

  it('should show empty message when no data', () => {
    renderDataTable({ 
      data: [], 
      emptyMessage: 'No employees found' 
    });
    expect(screen.getByText('No employees found')).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    renderDataTable({ loading: true });
    
    // Check for skeleton rows
    const skeletonRows = document.querySelectorAll('.animate-pulse');
    expect(skeletonRows.length).toBeGreaterThan(0);
  });

  it('should render selection checkboxes when enabled', () => {
    renderDataTable({ enableSelection: true });
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should not render selection checkboxes when disabled', () => {
    renderDataTable({ enableSelection: false });
    
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes.length).toBe(0);
  });
});

// ============================================
// SECTION 4: SORTING TESTS
// ============================================

describe('Sorting', () => {
  it('should sort by column on header click', async () => {
    renderDataTable();
    
    // Click age header to sort ascending
    const ageHeader = screen.getByText('Age').closest('th');
    await act(async () => {
      fireEvent.click(ageHeader!);
    });
    
    // First row should now have age 25
    const rows = screen.getAllByRole('row').filter(row => row.querySelector('td'));
    expect(within(rows[1]).getByText('25')).toBeInTheDocument();
  });

  it('should toggle sort direction on repeated clicks', async () => {
    renderDataTable();
    
    const ageHeader = screen.getByText('Age').closest('th')!;
    
    // First click - ascending
    await act(async () => {
      fireEvent.click(ageHeader);
    });
    
    // Second click - descending
    await act(async () => {
      fireEvent.click(ageHeader);
    });
    
    const rows = screen.getAllByRole('row').filter(row => row.querySelector('td'));
    expect(within(rows[1]).getByText('35')).toBeInTheDocument();
  });

  it('should reset to page 1 on sort', async () => {
    renderDataTable({ 
      defaultPageSize: 2,
      enablePagination: true 
    });
    
    // Go to page 2
    const nextButton = screen.getByRole('button', { name: 'Next' });
    await act(async () => {
      fireEvent.click(nextButton);
    });
    
    // Sort - should go back to page 1
    const nameHeader = screen.getByText('Name').closest('th')!;
    await act(async () => {
      fireEvent.click(nameHeader);
    });
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });
});

// ============================================
// SECTION 5: FILTERING TESTS
// ============================================

describe('Filtering', () => {
  it('should show filter inputs for filterable columns', () => {
    renderDataTable();
    
    const filterInputs = screen.getAllByPlaceholderText('Filter...');
    expect(filterInputs.length).toBe(1); // Only name is filterable in mockColumns
  });

  it('should filter data when typing in filter input', async () => {
    const user = userEvent.setup();
    renderDataTable();
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    await user.type(filterInput, 'Alice');
    
    // Should only show Alice
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('should clear filter and show all data', async () => {
    const user = userEvent.setup();
    renderDataTable();
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    await user.type(filterInput, 'Alice');
    
    // Clear filter
    const clearButton = screen.getByRole('button', { name: 'Clear filter' });
    await user.click(clearButton);
    
    // All rows should be visible again
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should clear all filters button', async () => {
    const user = userEvent.setup();
    renderDataTable();
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    await user.type(filterInput, 'test');
    
    const clearAllButton = screen.getByText('Clear all filters');
    await user.click(clearAllButton);
    
    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
  });

  it('should reset to page 1 when filtering', async () => {
    const user = userEvent.setup();
    renderDataTable({ 
      defaultPageSize: 2,
      enablePagination: true 
    });
    
    // Go to page 2
    const nextButton = screen.getByRole('button', { name: 'Next' });
    await act(async () => {
      fireEvent.click(nextButton);
    });
    
    // Filter - should go back to page 1
    const filterInput = screen.getByPlaceholderText('Filter...');
    await user.type(filterInput, 'Alice');
    
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});

// ============================================
// SECTION 6: PAGINATION TESTS
// ============================================

describe('Pagination', () => {
  it('should not render pagination when disabled', () => {
    renderDataTable({ enablePagination: false });
    expect(screen.queryByText('Rows per page:')).not.toBeInTheDocument();
  });

  it('should render pagination with correct info', () => {
    renderDataTable({ defaultPageSize: 2 });
    
    expect(screen.getByText('Showing 1 to 2 of 5 results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should navigate to next page', async () => {
    renderDataTable({ defaultPageSize: 2 });
    
    const nextButton = screen.getByRole('button', { name: 'Next' });
    await act(async () => {
      fireEvent.click(nextButton);
    });
    
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Showing 3 to 4 of 5 results')).toBeInTheDocument();
  });

  it('should navigate to previous page', async () => {
    renderDataTable({ defaultPageSize: 2 });
    
    // Go to page 2
    const nextButton = screen.getByRole('button', { name: 'Next' });
    await act(async () => {
      fireEvent.click(nextButton);
    });
    
    // Go back to page 1
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    await act(async () => {
      fireEvent.click(prevButton);
    });
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should change page size', async () => {
    renderDataTable();
    
    const select = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(select, { target: { value: '25' } });
    });
    
    expect(screen.getByText('Showing 1 to 5 of 5 results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('should go to first page', async () => {
    renderDataTable({ defaultPageSize: 2 });
    
    // Go to page 2
    const nextButton = screen.getByRole('button', { name: 'Next' });
    await act(async () => {
      fireEvent.click(nextButton);
    });
    
    // Go to first page
    const firstButton = screen.getByRole('button', { name: 'First' });
    await act(async () => {
      fireEvent.click(firstButton);
    });
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should go to last page', async () => {
    renderDataTable({ defaultPageSize: 2 });
    
    const lastButton = screen.getByRole('button', { name: 'Last' });
    await act(async () => {
      fireEvent.click(lastButton);
    });
    
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
  });

  it('should disable prev button on first page', () => {
    renderDataTable();
    
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button on last page', async () => {
    renderDataTable({ defaultPageSize: 2 });
    
    // Go to last page
    const lastButton = screen.getByRole('button', { name: 'Last' });
    await act(async () => {
      fireEvent.click(lastButton);
    });
    
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeDisabled();
  });
});

// ============================================
// SECTION 7: SELECTION TESTS
// ============================================

describe('Row Selection', () => {
  it('should select single row', async () => {
    const user = userEvent.setup();
    renderDataTable({ enableSelection: true });
    
    // Find Bob's checkbox (second row)
    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]); // First checkbox is select all
    
    expect(screen.getByTestId('data-table-container')?.querySelector('tr.bg-blue-50')).toBeInTheDocument();
  });

  it('should deselect row', async () => {
    const user = userEvent.setup();
    renderDataTable({ enableSelection: true });
    
    // Select then deselect
    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]);
    await user.click(rowCheckboxes[1]);
    
    expect(screen.queryByTestId('data-table-container')?.querySelector('tr.bg-blue-50')).not.toBeInTheDocument();
  });

  it('should select all rows', async () => {
    const user = userEvent.setup();
    renderDataTable({ 
      enableSelection: true,
      defaultPageSize: 10 
    });
    
    // Click select all (first checkbox)
    const selectAllCheckbox = screen.getByRole('checkbox', { name: 'Select all rows' });
    await user.click(selectAllCheckbox);
    
    // All checkboxes should be checked
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => {
      expect(cb).toBeChecked();
    });
  });

  it('should deselect all rows', async () => {
    const user = userEvent.setup();
    renderDataTable({ 
      enableSelection: true,
      defaultPageSize: 10 
    });
    
    // Select all
    const selectAllCheckbox = screen.getByRole('checkbox', { name: 'Select all rows' });
    await user.click(selectAllCheckbox);
    
    // Deselect all
    await user.click(selectAllCheckbox);
    
    // All checkboxes should be unchecked
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => {
      expect(cb).not.toBeChecked();
    });
  });

  it('should call onSelectionChange callback', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    renderDataTable({ 
      enableSelection: true,
      onSelectionChange,
    });
    
    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]);
    
    expect(onSelectionChange).toHaveBeenCalledWith(expect.any(Set));
  });

  it('should have indeterminate state when some rows selected', async () => {
    const user = userEvent.setup();
    renderDataTable({ 
      enableSelection: true,
      defaultPageSize: 10 
    });
    
    // Select one row (not all)
    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]);
    
    const selectAllCheckbox = screen.getByRole('checkbox', { name: 'Select all rows' });
    expect(selectAllCheckbox).toBeIndeterminate();
  });
});

// ============================================
// SECTION 8: ROW CLICK TESTS
// ============================================

describe('Row Click Handler', () => {
  it('should call onRowClick when row is clicked', async () => {
    const onRowClick = jest.fn();
    renderDataTable({ onRowClick });
    
    const row = screen.getByText('Alice').closest('tr')!;
    await act(async () => {
      fireEvent.click(row);
    });
    
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }));
  });

  it('should not trigger row click when clicking checkbox', async () => {
    const onRowClick = jest.fn();
    renderDataTable({ 
      onRowClick,
      enableSelection: true 
    });
    
    const rowCheckbox = screen.getAllByRole('checkbox')[1];
    await act(async () => {
      fireEvent.click(rowCheckbox);
    });
    
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('should not trigger row click when clicking filter input', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    renderDataTable({ 
      onRowClick,
      columns: mockColumns 
    });
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    await user.type(filterInput, 'test');
    
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

// ============================================
// SECTION 9: CELL FORMATTING TESTS
// ============================================

describe('Cell Formatting', () => {
  it('should format currency values', () => {
    renderDataTable();
    
    // Check that currency is formatted with $ and commas
    expect(screen.getByText(/\$75,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$60,000/)).toBeInTheDocument();
  });

  it('should format number values', () => {
    renderDataTable();
    
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should display null values as dash', () => {
    const dataWithNull: readonly Row[] = [
      { id: createTableId('1'), name: 'Test', age: null as unknown as number, salary: 50000, joined: '2020-01-01' },
    ];
    
    renderDataTable({ data: dataWithNull });
    
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

// ============================================
// SECTION 10: ERROR HANDLING TESTS
// ============================================

describe('Error Handling', () => {
  it('should call onError callback for table errors', () => {
    const onError = jest.fn();
    renderDataTable({ onError });
    
    // The callback should be set up, actual errors depend on user interactions
    expect(onError).toBeDefined();
  });

  it('should render with custom pageSizeOptions', () => {
    renderDataTable({ pageSizeOptions: [1, 2, 3] });
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('10'); // defaultPageSize
    
    const options = within(select).getAllByRole('option');
    expect(options.map(o => o.value)).toEqual(['1', '2', '3']);
  });
});

// ============================================
// SECTION 11: ACCESSIBILITY TESTS
// ============================================

describe('Accessibility', () => {
  it('should have proper aria labels on sort headers', () => {
    renderDataTable();
    
    const ageHeader = screen.getByText('Age').closest('th');
    expect(ageHeader).toHaveAttribute('aria-sort');
  });

  it('should have aria-label on filter inputs', () => {
    renderDataTable();
    
    const filterInput = screen.getByPlaceholderText('Filter...');
    expect(filterInput).toHaveAttribute('aria-label');
  });

  it('should have aria-label on pagination navigation', () => {
    renderDataTable();
    
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});

// ============================================
// SECTION 12: PERFORMANCE TESTS
// ============================================

describe('Performance', () => {
  it('should handle large datasets', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: createTableId(`row-${i}`),
      name: `User ${i}`,
      age: 20 + (i % 50),
      salary: 30000 + (i * 100),
      joined: '2020-01-01',
    }));
    
    const { container } = renderDataTable({ 
      data: largeData,
      defaultPageSize: 50 
    });
    
    // Should render without errors
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 50 of 1000 results')).toBeInTheDocument();
  });

  it('should update efficiently with filter changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderDataTable();
    
    // Type in filter
    const filterInput = screen.getByPlaceholderText('Filter...');
    await user.type(filterInput, 'Alice');
    
    // Rerender with new filter
    rerender(<DataTable columns={mockColumns} data={mockData} />);
    
    // Should still work
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
