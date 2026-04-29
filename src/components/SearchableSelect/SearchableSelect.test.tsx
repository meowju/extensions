/**
 * SearchableSelect Component Tests
 *
 * Demonstrates testing best practices:
 * - Testing component behavior
 * - Testing user interactions
 * - Testing accessibility
 * - Testing keyboard navigation
 * - Testing edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect, Option } from './SearchableSelect';

// Test data
const options: Option<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry', disabled: true },
];

const groupedOptions: Option<string>[] = [
  { value: 'typescript', label: 'TypeScript', group: 'Languages' },
  { value: 'javascript', label: 'JavaScript', group: 'Languages' },
  { value: 'python', label: 'Python', group: 'Languages' },
  { value: 'react', label: 'React', group: 'Frameworks' },
  { value: 'vue', label: 'Vue', group: 'Frameworks' },
];

describe('SearchableSelect', () => {
  describe('Rendering', () => {
    it('renders with label', () => {
      render(
        <SearchableSelect
          label="Select fruit"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      expect(screen.getByText('Select fruit')).toBeInTheDocument();
    });

    it('renders placeholder when no value selected', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          placeholder="Choose..."
        />
      );

      expect(screen.getByText('Choose...')).toBeInTheDocument();
    });

    it('renders selected value when provided', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value="banana"
          onChange={() => {}}
        />
      );

      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          className="custom-class"
        />
      );

      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });

    it('shows required asterisk when required', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          required
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Opening and Closing', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByRole('listbox')).toBeVisible();
    });

    it('closes dropdown when clicked outside', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeVisible();

      await user.click(document.body);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeVisible();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onChange with selected value on single select', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={handleChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Banana'));

      expect(handleChange).toHaveBeenCalledWith('banana');
    });

    it('displays selected value after selection', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Banana'));

      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('closes dropdown after single selection', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Banana'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Multi-select', () => {
    it('calls onChange with array of values', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={[]}
          onChange={handleChange}
          mode="multiple"
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Apple'));
      await user.click(screen.getByText('Banana'));

      expect(handleChange).toHaveBeenLastCalledWith(['apple', 'banana']);
    });

    it('shows count when multiple items selected', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={['apple', 'banana']}
          onChange={() => {}}
          mode="multiple"
        />
      );

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('allows removing selected items', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={['apple', 'banana']}
          onChange={handleChange}
          mode="multiple"
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(handleChange).toHaveBeenCalledWith(['banana']);
    });
  });

  describe('Search', () => {
    it('filters options based on search query', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          searchable
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('ban');

      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    });

    it('shows empty state when no matches', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          searchable
          noOptionsMessage="No fruits found"
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('xyz');

      expect(screen.getByText('No fruits found')).toBeInTheDocument();
    });

    it('clears search on close', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          searchable
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('ban');
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('combobox'));

      expect(screen.queryByRole('textbox')).toHaveValue('');
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates options with arrow keys', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      await user.keyboard('{ArrowDown}');
      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveAttribute('data-highlighted', 'true');

      await user.keyboard('{ArrowDown}');
      const secondOption = screen.getAllByRole('option')[1];
      expect(secondOption).toHaveAttribute('data-highlighted', 'true');
    });

    it('selects highlighted option on Enter', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={handleChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith('banana');
    });

    it('wraps around when navigating past end', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      // Navigate to last item
      for (let i = 0; i < options.length; i++) {
        await user.keyboard('{ArrowDown}');
      }

      // Should wrap to first
      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveAttribute('data-highlighted', 'true');
    });

    it('goes to first option on Home', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Home}');

      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveAttribute('data-highlighted', 'true');
    });

    it('goes to last option on End', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{End}');

      const lastOption = screen.getAllByRole('option')[options.length - 1];
      expect(lastOption).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Typeahead', () => {
    it('jumps to matching option on type', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          typeahead
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('c');

      const cherryOption = screen.getByText('Cherry');
      expect(cherryOption.closest('li')).toHaveAttribute('data-highlighted', 'true');
    });

    it('continues matching with repeated keys', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          typeahead
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('b');
      await user.keyboard('a');

      const bananaOption = screen.getByText('Banana');
      expect(bananaOption.closest('li')).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Disabled Options', () => {
    it('does not select disabled option', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={handleChange}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Elderberry'));

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('skips disabled options during keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}'); // Apple
      await user.keyboard('{ArrowDown}'); // Banana
      await user.keyboard('{ArrowDown}'); // Cherry
      await user.keyboard('{ArrowDown}'); // Date
      // Next should skip Elderberry (disabled) and wrap to Apple

      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveAttribute('data-highlighted', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes when closed', () => {
      render(
        <SearchableSelect
          label="Select fruit"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has correct ARIA attributes when open', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select fruit"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });

    it('marks selected options with aria-selected', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value="banana"
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const bananaOption = screen.getByText('Banana').closest('li');
      expect(bananaOption).toHaveAttribute('aria-selected', 'true');
    });

    it('marks disabled options with aria-disabled', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      const elderberryOption = screen.getByText('Elderberry').closest('li');
      expect(elderberryOption).toHaveAttribute('aria-disabled', 'true');
    });

    it('has search input with aria-label', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          searchable
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search options');
    });
  });

  describe('Clear functionality', () => {
    it('shows clear button when value is selected', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value="banana"
          onChange={() => {}}
        />
      );

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('clears selection on clear button click', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value="banana"
          onChange={handleChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /clear/i }));

      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it('hides clear button when no value selected', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
        />
      );

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('applies error class when error prop provided', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          error="Selection required"
        />
      );

      expect(screen.getByRole('combobox').closest('.searchable-select')).toHaveClass(
        'searchable-select--error'
      );
    });

    it('displays error message', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          error="Selection required"
        />
      );

      expect(screen.getByText('Selection required')).toBeInTheDocument();
    });

    it('displays validation error message', () => {
      render(
        <SearchableSelect
          label="Select"
          options={options}
          value={null}
          onChange={() => {}}
          errorMessage="Please select an option"
        />
      );

      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={[]}
          value={null}
          onChange={() => {}}
          loading
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Grouped Options', () => {
    it('renders group labels', async () => {
      const user = userEvent.setup();
      render(
        <SearchableSelect
          label="Select"
          options={groupedOptions}
          value={null}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Frameworks')).toBeInTheDocument();
    });
  });
});