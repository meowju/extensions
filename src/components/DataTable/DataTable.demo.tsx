/**
 * DataTable Demo & Usage Examples
 * 
 * This file demonstrates the React best practices implemented in DataTable.tsx:
 * 
 * 1. Custom Hooks (useTableSort, usePagination)
 *    - Encapsulate stateful logic
 *    - Separate concerns for reusability
 *    - Testable in isolation
 * 
 * 2. Compound Component Pattern
 *    - Export sub-components (HeaderCell, Row, Pagination)
 *    - Allow advanced customization
 * 
 * 3. TypeScript Generics
 *    - Type-safe data handling
 *    - Flexible column definitions
 *    - Proper inference
 * 
 * 4. Memoization (React.memo)
 *    - Prevent unnecessary re-renders
 *    - Performance optimization
 * 
 * 5. Accessibility (ARIA)
 *    - Screen reader support
 *    - Keyboard navigation
 *    - Proper semantic HTML
 * 
 * 6. Controlled vs Uncontrolled
 *    - Support both patterns
 *    - Flexible API design
 */

import React, { useState } from 'react';
import { DataTable, Column } from './DataTable';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', status: 'active', createdAt: '2024-01-15' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'editor', status: 'active', createdAt: '2024-01-20' },
  { id: '3', name: 'Carol White', email: 'carol@example.com', role: 'viewer', status: 'inactive', createdAt: '2024-02-01' },
  { id: '4', name: 'David Brown', email: 'david@example.com', role: 'editor', status: 'pending', createdAt: '2024-02-10' },
  { id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'viewer', status: 'active', createdAt: '2024-02-15' },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'admin', status: 'active', createdAt: '2024-03-01' },
  { id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'editor', status: 'inactive', createdAt: '2024-03-10' },
  { id: '8', name: 'Henry Wilson', email: 'henry@example.com', role: 'viewer', status: 'pending', createdAt: '2024-03-15' },
  { id: '9', name: 'Ivy Taylor', email: 'ivy@example.com', role: 'admin', status: 'active', createdAt: '2024-03-20' },
  { id: '10', name: 'Jack Anderson', email: 'jack@example.com', role: 'editor', status: 'active', createdAt: '2024-03-25' },
  { id: '11', name: 'Karen Thomas', email: 'karen@example.com', role: 'viewer', status: 'inactive', createdAt: '2024-04-01' },
  { id: '12', name: 'Leo Martinez', email: 'leo@example.com', role: 'admin', status: 'active', createdAt: '2024-04-05' },
];

// ============================================================================
// EXAMPLE 1: Basic Usage (Uncontrolled)
// ============================================================================

/**
 * Simplest usage - let the table manage its own state
 */
export function BasicDataTableExample() {
  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'createdAt', header: 'Created', sortable: true },
  ];

  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      rowKey="id"
      caption="List of users"
    />
  );
}

// ============================================================================
// EXAMPLE 2: With Pagination
// ============================================================================

/**
 * Add pagination for large datasets
 */
export function PaginatedDataTableExample() {
  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'status', header: 'Status' },
  ];

  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      rowKey="id"
      paginate
      pageSize={5}
      caption="Paginated user list"
    />
  );
}

// ============================================================================
// EXAMPLE 3: Controlled with Selection (Selection State)
// ============================================================================

/**
 * Control selection state from parent component
 * Useful when you need to perform bulk actions
 */
export function SelectableDataTableExample() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'status', header: 'Status' },
  ];

  const handleSelectionChange = (ids: Set<string>) => {
    setSelectedIds(ids);
    console.log('Selected IDs:', Array.from(ids));
  };

  const handleBulkDelete = () => {
    console.log('Delete selected:', Array.from(selectedIds));
    // Perform bulk delete action
  };

  return (
    <div>
      {selectedIds.size > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#e3f2fd', borderRadius: '4px' }}>
          <span>{selectedIds.size} item(s) selected</span>
          <button onClick={handleBulkDelete} style={{ marginLeft: '1rem' }}>
            Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: '0.5rem' }}>
            Clear Selection
          </button>
        </div>
      )}
      
      <DataTable
        columns={columns}
        data={sampleUsers}
        rowKey="id"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        caption="Selectable user list"
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Custom Cell Rendering
// ============================================================================

/**
 * Use render function for custom cell content
 * Great for badges, actions, images, etc.
 */
export function CustomRenderDataTableExample() {
  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { 
      key: 'role', 
      header: 'Role', 
      sortable: true,
      render: (value) => {
        const colors: Record<string, string> = {
          admin: '#7c3aed',
          editor: '#2563eb',
          viewer: '#6b7280',
        };
        return (
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'white',
            background: colors[String(value)] || '#6b7280',
          }}>
            {String(value).toUpperCase()}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (value) => {
        const status = String(value);
        const isActive = status === 'active';
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isActive ? '#10b981' : status === 'pending' ? '#f59e0b' : '#6b7280',
            }} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      }
    },
    { 
      key: 'id', 
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={() => console.log('Edit', row.id)}>Edit</button>
          <button onClick={() => console.log('Delete', row.id)}>Delete</button>
        </div>
      )
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      rowKey="id"
      onRowClick={(row) => console.log('Row clicked:', row)}
      caption="User list with custom rendering"
    />
  );
}

// ============================================================================
// EXAMPLE 5: With Row Click Handler
// ============================================================================

/**
 * Handle row clicks for navigation or detail views
 */
export function ClickableDataTableExample() {
  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'status', header: 'Status' },
  ];

  return (
    <DataTable
      columns={columns}
      data={sampleUsers}
      rowKey="id"
      onRowClick={(row, index) => {
        console.log(`Navigate to user detail: ${row.id} (index: ${index})`);
        // navigation?.push(`/users/${row.id}`);
      }}
      caption="Clickable user list (click a row)"
    />
  );
}

// ============================================================================
// EXAMPLE 6: Loading State
// ============================================================================

/**
 * Show loading skeleton while fetching data
 */
export function LoadingDataTableExample() {
  const [isLoading, setIsLoading] = useState(true);

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'status', header: 'Status' },
  ];

  // Simulate data fetching
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <button onClick={() => setIsLoading(true)} style={{ marginBottom: '1rem' }}>
        Simulate Reload
      </button>
      
      <DataTable
        columns={columns}
        data={isLoading ? [] : sampleUsers}
        rowKey="id"
        isLoading={isLoading}
        caption="Loading state example"
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Empty State
// ============================================================================

/**
 * Customize the empty state message
 */
export function EmptyDataTableExample() {
  const columns: Column<User>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
  ];

  return (
    <DataTable
      columns={columns}
      data={[]}
      rowKey="id"
      emptyMessage="No users found. Try adjusting your filters."
      caption="Empty state example"
    />
  );
}

// ============================================================================
// EXAMPLE 8: Full Featured Table
// ============================================================================

/**
 * Combines all features for a complete implementation
 */
export function FullFeaturedDataTableExample() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name', sortable: true, width: '200px' },
    { key: 'email', header: 'Email', sortable: true },
    { 
      key: 'role', 
      header: 'Role', 
      sortable: true,
      render: (value) => {
        const colors: Record<string, string> = {
          admin: '#7c3aed',
          editor: '#2563eb',
          viewer: '#6b7280',
        };
        return (
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'white',
            background: colors[String(value)] || '#6b7280',
          }}>
            {String(value).toUpperCase()}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (value) => {
        const status = String(value);
        const isActive = status === 'active';
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isActive ? '#10b981' : status === 'pending' ? '#f59e0b' : '#6b7280',
            }} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      }
    },
    { key: 'createdAt', header: 'Created', sortable: true, align: 'right' },
  ];

  const handleSort = (key: keyof User, direction: 'asc' | 'desc' | null) => {
    console.log(`Sort by ${String(key)} ${direction}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>User Management</h2>
        {selectedIds.size > 0 && (
          <div>
            <span>{selectedIds.size} selected</span>
            <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: '0.5rem' }}>
              Clear
            </button>
          </div>
        )}
      </div>
      
      <DataTable
        id="users-table"
        columns={columns}
        data={sampleUsers}
        rowKey="id"
        paginate
        pageSize={5}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
        onSort={handleSort}
        onRowClick={(row) => console.log('View user:', row.id)}
        caption="Full-featured user table with sorting, pagination, and selection"
      />
    </div>
  );
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default FullFeaturedDataTableExample;
