/**
 * SearchableSelect Component
 *
 * A production-ready, accessible search/filter select component.
 * Demonstrates modern React best practices.
 *
 * Features:
 * - Search/filter functionality
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Typeahead support
 * - Multi-select support
 * - Async data loading
 * - Comprehensive accessibility
 *
 * Best Practices Demonstrated:
 * - Custom hooks for encapsulated logic
 * - useReducer for complex state management
 * - useMemo/useCallback for performance
 * - Proper TypeScript with discriminated unions
 * - ARIA patterns for combobox
 * - Focus management
 * - Memoized sub-components
 */

import React, {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
  memo,
  KeyboardEvent,
  FocusEvent,
  MouseEvent,
  ChangeEvent,
} from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SelectMode = 'single' | 'multiple';

type SelectState<T> = {
  isOpen: boolean;
  searchQuery: string;
  highlightedIndex: number;
  selectedValues: Set<T>;
  isLoading: boolean;
  error: string | null;
};

type SelectAction<T> =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_HIGHLIGHTED'; payload: number }
  | { type: 'HIGHLIGHT_NEXT'; payload: number }
  | { type: 'HIGHLIGHT_PREV'; payload: number }
  | { type: 'SELECT'; payload: T }
  | { type: 'DESELECT'; payload: T }
  | { type: 'SELECT_ALL'; payload: T[] }
  | { type: 'CLEAR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

interface Option<T> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface SearchableSelectProps<T> {
  /** Unique identifier */
  id?: string;
  /** Available options */
  options: Option<T>[];
  /** Currently selected values */
  value: T | T[] | null;
  /** Callback when selection changes */
  onChange: (value: T | T[] | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Selection mode */
  mode?: SelectMode;
  /** Enable search */
  searchable?: boolean;
  /** Enable typeahead (jump to match on keypress) */
  typeahead?: boolean;
  /** Loading state for async options */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Label text */
  label: string;
  /** Helper text below the select */
  helperText?: string;
  /** Error message for validation */
  errorMessage?: string;
  /** Clear button label */
  clearLabel?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** No options message */
  noOptionsMessage?: string;
  /** Maximum height of dropdown */
  maxHeight?: string;
  /** Additional CSS classes */
  className?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

// ============================================================================
// CUSTOM HOOK: useSelectSearch
// ============================================================================

/**
 * Custom hook for managing searchable select state using useReducer
 * Encapsulates all selection business logic
 */
function useSelectSearch<T>(options: Option<T>[], mode: SelectMode = 'single') {
  const initialState: SelectState<T> = {
    isOpen: false,
    searchQuery: '',
    highlightedIndex: -1,
    selectedValues: new Set(),
    isLoading: false,
    error: null,
  };

  const reducer = useCallback(
    (state: SelectState<T>, action: SelectAction<T>): SelectState<T> => {
      switch (action.type) {
        case 'OPEN':
          return { ...state, isOpen: true, highlightedIndex: -1 };

        case 'CLOSE':
          return { ...state, isOpen: false, searchQuery: '', highlightedIndex: -1 };

        case 'TOGGLE':
          return {
            ...state,
            isOpen: !state.isOpen,
            searchQuery: state.isOpen ? '' : state.searchQuery,
            highlightedIndex: state.isOpen ? -1 : state.highlightedIndex,
          };

        case 'SET_SEARCH':
          return {
            ...state,
            searchQuery: action.payload,
            highlightedIndex: 0,
          };

        case 'SET_HIGHLIGHTED':
          return { ...state, highlightedIndex: action.payload };

        case 'HIGHLIGHT_NEXT': {
          const nextIndex = Math.min(action.payload, options.length - 1);
          return { ...state, highlightedIndex: nextIndex };
        }

        case 'HIGHLIGHT_PREV': {
          const prevIndex = Math.max(action.payload, 0);
          return { ...state, highlightedIndex: prevIndex };
        }

        case 'SELECT': {
          if (mode === 'single') {
            return {
              ...state,
              selectedValues: new Set([action.payload]),
              isOpen: false,
              searchQuery: '',
            };
          }
          const newValues = new Set(state.selectedValues);
          newValues.add(action.payload);
          return { ...state, selectedValues: newValues };
        }

        case 'DESELECT': {
          const newValues = new Set(state.selectedValues);
          newValues.delete(action.payload);
          return { ...state, selectedValues: newValues };
        }

        case 'SELECT_ALL':
          return {
            ...state,
            selectedValues: new Set(action.payload),
          };

        case 'CLEAR':
          return { ...state, selectedValues: new Set(), searchQuery: '' };

        case 'SET_LOADING':
          return { ...state, isLoading: action.payload };

        case 'SET_ERROR':
          return { ...state, error: action.payload };

        case 'RESET':
          return initialState;

        default:
          return state;
      }
    },
    [options.length, mode]
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Expose actions as memoized callbacks
  const actions = useMemo(
    () => ({
      open: () => dispatch({ type: 'OPEN' }),
      close: () => dispatch({ type: 'CLOSE' }),
      toggle: () => dispatch({ type: 'TOGGLE' }),
      setSearch: (query: string) => dispatch({ type: 'SET_SEARCH', payload: query }),
      setHighlighted: (index: number) =>
        dispatch({ type: 'SET_HIGHLIGHTED', payload: index }),
      highlightNext: (current: number) =>
        dispatch({ type: 'HIGHLIGHT_NEXT', payload: current + 1 }),
      highlightPrev: (current: number) =>
        dispatch({ type: 'HIGHLIGHT_PREV', payload: current - 1 }),
      select: (value: T) => dispatch({ type: 'SELECT', payload: value }),
      deselect: (value: T) => dispatch({ type: 'DESELECT', payload: value }),
      selectAll: (values: T[]) => dispatch({ type: 'SELECT_ALL', payload: values }),
      clear: () => dispatch({ type: 'CLEAR' }),
      setLoading: (loading: boolean) =>
        dispatch({ type: 'SET_LOADING', payload: loading }),
      setError: (error: string | null) =>
        dispatch({ type: 'SET_ERROR', payload: error }),
    }),
    []
  );

  return { state, actions };
}

// ============================================================================
// CUSTOM HOOK: useTypeahead
// ============================================================================

/**
 * Handles typeahead behavior - jumps to matching option on keypress
 */
function useTypeahead<T>(
  options: Option<T>[],
  filteredOptions: Option<T>[],
  onHighlight: (index: number) => void
) {
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [typeaheadBuffer, setTypeaheadBuffer] = useState('');

  const handleTypeahead = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const key = event.key;
      const now = Date.now();

      // Reset buffer if too much time has passed
      if (now - lastKeyTime > 500) {
        setTypeaheadBuffer('');
      }

      setLastKeyTime(now);

      // Only handle printable characters
      if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const newBuffer = typeaheadBuffer + key.toLowerCase();
        setTypeaheadBuffer(newBuffer);

        // Find matching option
        const matchIndex = filteredOptions.findIndex((option) =>
          option.label.toLowerCase().startsWith(newBuffer)
        );

        if (matchIndex !== -1) {
          onHighlight(matchIndex);
          event.preventDefault();
        }
      } else {
        setTypeaheadBuffer('');
      }
    },
    [filteredOptions, lastKeyTime, onHighlight, typeaheadBuffer]
  );

  return { handleTypeahead };
}

// ============================================================================
// SUB-COMPONENTS: SearchInput
// ============================================================================

const SearchInput = memo(function SearchInput({
  query,
  onChange,
  onKeyDown,
  placeholder,
  inputRef,
  disabled,
}: {
  query: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <div className="searchable-select__search">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="searchable-select__search-input"
        aria-label="Search options"
      />
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

// ============================================================================
// SUB-COMPONENTS: SelectTag
// ============================================================================

const SelectTag = memo(function SelectTag<T>({
  label,
  onRemove,
  removeLabel,
}: {
  label: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="searchable-select__tag">
      <span className="searchable-select__tag-label">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="searchable-select__tag-remove"
        aria-label={removeLabel}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
});

SelectTag.displayName = 'SelectTag';

// ============================================================================
// SUB-COMPONENTS: OptionList
// ============================================================================

const OptionList = memo(function OptionList<T>({
  options,
  highlightedIndex,
  selectedValues,
  onSelect,
  onHighlight,
  isLoading,
  emptyMessage,
  maxHeight,
}: {
  options: Option<T>[];
  highlightedIndex: number;
  selectedValues: Set<T>;
  onSelect: (value: T) => void;
  onHighlight: (index: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
}) {
  // Group options
  const groupedOptions = useMemo(() => {
    const groups: Map<string, Option<T>[]> = new Map();
    const ungrouped: Option<T>[] = [];

    options.forEach((option) => {
      if (option.group) {
        const existing = groups.get(option.group) || [];
        groups.set(option.group, [...existing, option]);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  }, [options]);

  const renderOption = useCallback(
    (option: Option<T>, index: number) => {
      const isSelected = selectedValues.has(option.value);
      const isHighlighted = highlightedIndex === index;
      const isDisabled = option.disabled;

      return (
        <li
          key={String(option.value)}
          role="option"
          aria-selected={isSelected}
          aria-disabled={isDisabled}
          data-highlighted={isHighlighted}
          className={`searchable-select__option ${isSelected ? 'searchable-select__option--selected' : ''} ${isHighlighted ? 'searchable-select__option--highlighted' : ''} ${isDisabled ? 'searchable-select__option--disabled' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            if (!isDisabled) {
              onSelect(option.value);
            }
          }}
          onMouseEnter={() => onHighlight(index)}
        >
          <span className="searchable-select__option-label">{option.label}</span>
          {isSelected && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </li>
      );
    },
    [highlightedIndex, selectedValues, onSelect, onHighlight]
  );

  if (isLoading) {
    return (
      <div className="searchable-select__loading" role="status" aria-live="polite">
        <span className="searchable-select__spinner" aria-hidden="true" />
        <span>Loading...</span>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div
        className="searchable-select__empty"
        role="status"
        aria-live="polite"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul
      role="listbox"
      className="searchable-select__options"
      style={{ maxHeight }}
      aria-label="Options"
    >
      {/* Ungrouped options first */}
      {groupedOptions.ungrouped.map((option, index) => renderOption(option, index))}

      {/* Grouped options */}
      {Array.from(groupedOptions.groups.entries()).map(([group, groupOptions]) => (
        <li key={group} role="group" aria-label={group}>
          <div className="searchable-select__group-label">{group}</div>
          <ul role="none">
            {groupOptions.map((option) => {
              const originalIndex = options.indexOf(option);
              return (
                <React.Fragment key={String(option.value)}>
                  {renderOption(option, originalIndex)}
                </React.Fragment>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
});

OptionList.displayName = 'OptionList';

// ============================================================================
// MAIN COMPONENT: SearchableSelect
// ============================================================================

/**
 * A production-ready searchable select component
 * Supports single/multi-select, keyboard navigation, and typeahead
 */
function SearchableSelect<T extends string | number>({
  id: providedId,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  mode = 'single',
  searchable = true,
  typeahead = true,
  loading = false,
  error: errorProp,
  disabled = false,
  required = false,
  label,
  helperText,
  errorMessage,
  clearLabel = 'Clear selection',
  searchPlaceholder = 'Search...',
  noOptionsMessage = 'No options available',
  maxHeight = '300px',
  className = '',
  autoFocus = false,
}: SearchableSelectProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Generate stable ID for accessibility
  const generatedId = useMemo(() => `searchable-select-${Math.random().toString(36).slice(2, 9)}`, []);
  const selectId = providedId || generatedId;
  const labelId = `${selectId}-label`;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  // Get initial value(s)
  const initialValues = useMemo(() => {
    if (value === null || value === undefined) return new Set<T>();
    if (Array.isArray(value)) return new Set(value);
    return new Set([value]);
  }, [value]);

  const { state, actions } = useSelectSearch<T>(options, mode);

  // Sync external value with internal state
  useEffect(() => {
    if (initialValues.size > 0) {
      actions.selectAll(Array.from(initialValues));
    }
  }, [initialValues, actions]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!state.searchQuery) return options;
    const query = state.searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, state.searchQuery]);

  // Typeahead hook
  const { handleTypeahead } = useTypeahead(
    options,
    filteredOptions,
    actions.setHighlighted
  );

  // Get selected labels
  const selectedLabels = useMemo(() => {
    return Array.from(state.selectedValues)
      .map((val) => options.find((opt) => opt.value === val)?.label)
      .filter(Boolean);
  }, [state.selectedValues, options]);

  // Handle option selection
  const handleSelect = useCallback(
    (optionValue: T) => {
      if (mode === 'single') {
        onChange(optionValue);
      } else {
        const newValues = new Set(state.selectedValues);
        if (newValues.has(optionValue)) {
          newValues.delete(optionValue);
        } else {
          newValues.add(optionValue);
        }
        onChange(Array.from(newValues));
      }
    },
    [mode, state.selectedValues, onChange]
  );

  // Handle clear
  const handleClear = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      actions.clear();
      onChange(mode === 'single' ? null : []);
    },
    [actions, onChange, mode]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const { key } = event;

      switch (key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!state.isOpen) {
            actions.open();
          } else {
            actions.highlightNext(state.highlightedIndex);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          actions.highlightPrev(state.highlightedIndex);
          break;

        case 'Enter':
          event.preventDefault();
          if (state.isOpen && state.highlightedIndex >= 0) {
            const highlightedOption = filteredOptions[state.highlightedIndex];
            if (highlightedOption && !highlightedOption.disabled) {
              handleSelect(highlightedOption.value);
            }
          }
          break;

        case 'Escape':
          event.preventDefault();
          actions.close();
          break;

        case 'Tab':
          actions.close();
          break;

        case 'Home':
          event.preventDefault();
          actions.setHighlighted(0);
          break;

        case 'End':
          event.preventDefault();
          actions.setHighlighted(filteredOptions.length - 1);
          break;

        default:
          // Typeahead
          if (typeahead && key.length === 1) {
            handleTypeahead(event);
          }
          break;
      }
    },
    [state, actions, filteredOptions, handleSelect, typeahead, handleTypeahead]
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    actions.open();
  }, [actions]);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      // Only close if focus moved outside the component
      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        actions.close();
      }
    },
    [actions]
  );

  // Scroll highlighted option into view
  useEffect(() => {
    if (listRef.current && state.highlightedIndex >= 0) {
      const highlightedElement = listRef.current.querySelector(
        '[data-highlighted="true"]'
      ) as HTMLElement;
      highlightedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [state.highlightedIndex]);

  // Auto-focus input when opened
  useEffect(() => {
    if (state.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        actions.close();
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
    };
  }, [state.isOpen, actions]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const hasError = !!errorProp || !!errorMessage;

  return (
    <div
      ref={containerRef}
      className={`searchable-select ${className} ${hasError ? 'searchable-select--error' : ''} ${disabled ? 'searchable-select--disabled' : ''}`}
      role="combobox"
      aria-expanded={state.isOpen}
      aria-haspopup="listbox"
    >
      {/* Label */}
      <label id={labelId} className="searchable-select__label">
        {label}
        {required && <span className="searchable-select__required">*</span>}
      </label>

      {/* Control */}
      <div
        className={`searchable-select__control ${state.isOpen ? 'searchable-select__control--open' : ''}`}
        onClick={() => !disabled && actions.open()}
        role="presentation"
      >
        {/* Tags for multi-select */}
        {mode === 'multiple' && selectedLabels.length > 0 && (
          <div className="searchable-select__tags">
            {selectedLabels.map((tagLabel, index) => (
              <SelectTag
                key={index}
                label={tagLabel!}
                onRemove={() => {
                  const val = Array.from(state.selectedValues)[index];
                  handleSelect(val);
                }}
                removeLabel={`Remove ${tagLabel}`}
              />
            ))}
          </div>
        )}

        {/* Search input */}
        {searchable && state.isOpen ? (
          <SearchInput
            query={state.searchQuery}
            onChange={actions.setSearch}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            inputRef={inputRef}
            disabled={disabled}
          />
        ) : (
          <div
            ref={inputRef as React.RefObject<HTMLDivElement>}
            className="searchable-select__value"
            tabIndex={disabled ? -1 : 0}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler<HTMLDivElement>}
            role="textbox"
            aria-readonly="true"
          >
            {selectedLabels.length > 0 ? (
              mode === 'single' ? (
                selectedLabels[0]
              ) : (
                `${selectedLabels.length} selected`
              )
            ) : (
              <span className="searchable-select__placeholder">{placeholder}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="searchable-select__actions">
          {(selectedLabels.length > 0 || state.searchQuery) && (
            <button
              type="button"
              onClick={handleClear}
              className="searchable-select__clear"
              aria-label={clearLabel}
              disabled={disabled}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </button>
          )}
          <span className="searchable-select__chevron" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </div>

      {/* Dropdown */}
      {state.isOpen && (
        <div className="searchable-select__dropdown">
          <OptionList
            options={filteredOptions}
            highlightedIndex={state.highlightedIndex}
            selectedValues={state.selectedValues}
            onSelect={handleSelect}
            onHighlight={actions.setHighlighted}
            isLoading={loading}
            emptyMessage={noOptionsMessage}
            maxHeight={maxHeight}
          />
        </div>
      )}

      {/* Helper or Error text */}
      {(helperText || errorMessage || errorProp) && (
        <div
          id={hasError ? errorId : helperId}
          className={`searchable-select__helper ${hasError ? 'searchable-select__helper--error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {errorMessage || errorProp || helperText}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = `
  .searchable-select {
    --ss-spacing-xs: 0.25rem;
    --ss-spacing-sm: 0.5rem;
    --ss-spacing-md: 1rem;
    --ss-radius-sm: 0.25rem;
    --ss-radius-md: 0.375rem;
    --ss-font-size-sm: 0.875rem;
    --ss-font-size-md: 1rem;
    --ss-border-color: #d1d5db;
    --ss-border-color-focus: #3b82f6;
    --ss-bg-control: #ffffff;
    --ss-bg-option-hover: #f3f4f6;
    --ss-bg-option-selected: #e0e7ff;
    --ss-text-primary: #111827;
    --ss-text-secondary: #6b7280;
    --ss-text-placeholder: #9ca3af;
    --ss-error-color: #dc2626;
    --ss-shadow-dropdown: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: var(--ss-font-size-md);
    position: relative;
    width: 100%;
    min-width: 200px;
  }

  .searchable-select__label {
    display: block;
    font-size: var(--ss-font-size-sm);
    font-weight: 500;
    color: var(--ss-text-primary);
    margin-bottom: var(--ss-spacing-xs);
  }

  .searchable-select__required {
    color: var(--ss-error-color);
    margin-left: 2px;
  }

  .searchable-select__control {
    display: flex;
    align-items: center;
    gap: var(--ss-spacing-sm);
    background: var(--ss-bg-control);
    border: 1px solid var(--ss-border-color);
    border-radius: var(--ss-radius-md);
    padding: var(--ss-spacing-sm) var(--ss-spacing-md);
    cursor: pointer;
    min-height: 42px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .searchable-select__control:hover:not(.searchable-select--disabled .searchable-select__control) {
    border-color: #9ca3af;
  }

  .searchable-select__control--open {
    border-color: var(--ss-border-color-focus);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .searchable-select--error .searchable-select__control {
    border-color: var(--ss-error-color);
  }

  .searchable-select--disabled .searchable-select__control {
    background: #f9fafb;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .searchable-select__value {
    flex: 1;
    min-width: 0;
    cursor: inherit;
    outline: none;
  }

  .searchable-select__placeholder {
    color: var(--ss-text-placeholder);
  }

  .searchable-select__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ss-spacing-xs);
    flex: 1;
    min-width: 0;
  }

  .searchable-select__tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--ss-bg-option-selected);
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: var(--ss-font-size-sm);
  }

  .searchable-select__tag-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .searchable-select__tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--ss-text-secondary);
    border-radius: 50%;
  }

  .searchable-select__tag-remove:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .searchable-select__search {
    flex: 1;
    min-width: 0;
  }

  .searchable-select__search-input {
    width: 100%;
    border: none;
    background: transparent;
    outline: none;
    font-size: inherit;
    font-family: inherit;
    color: var(--ss-text-primary);
  }

  .searchable-select__search-input::placeholder {
    color: var(--ss-text-placeholder);
  }

  .searchable-select__actions {
    display: flex;
    align-items: center;
    gap: var(--ss-spacing-xs);
    color: var(--ss-text-secondary);
  }

  .searchable-select__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--ss-text-secondary);
    border-radius: var(--ss-radius-sm);
  }

  .searchable-select__clear:hover {
    background: var(--ss-bg-option-hover);
  }

  .searchable-select__chevron {
    display: flex;
    align-items: center;
    transition: transform 0.2s ease;
  }

  .searchable-select__control--open .searchable-select__chevron {
    transform: rotate(180deg);
  }

  .searchable-select__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--ss-bg-control);
    border: 1px solid var(--ss-border-color);
    border-radius: var(--ss-radius-md);
    box-shadow: var(--ss-shadow-dropdown);
    z-index: 50;
    overflow: hidden;
  }

  .searchable-select__options {
    list-style: none;
    margin: 0;
    padding: var(--ss-spacing-xs);
    overflow-y: auto;
  }

  .searchable-select__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--ss-spacing-sm) var(--ss-spacing-md);
    cursor: pointer;
    border-radius: var(--ss-radius-sm);
    transition: background-color 0.1s ease;
  }

  .searchable-select__option--highlighted,
  .searchable-select__option:hover {
    background: var(--ss-bg-option-hover);
  }

  .searchable-select__option--selected {
    background: var(--ss-bg-option-selected);
  }

  .searchable-select__option--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .searchable-select__option-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .searchable-select__group-label {
    padding: var(--ss-spacing-sm) var(--ss-spacing-md);
    font-size: var(--ss-font-size-sm);
    font-weight: 600;
    color: var(--ss-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .searchable-select__loading,
  .searchable-select__empty {
    padding: var(--ss-spacing-md);
    text-align: center;
    color: var(--ss-text-secondary);
  }

  .searchable-select__spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--ss-border-color);
    border-top-color: var(--ss-border-color-focus);
    border-radius: 50%;
    animation: ss-spin 0.6s linear infinite;
    margin-right: var(--ss-spacing-sm);
  }

  @keyframes ss-spin {
    to { transform: rotate(360deg); }
  }

  .searchable-select__helper {
    margin-top: var(--ss-spacing-xs);
    font-size: var(--ss-font-size-sm);
    color: var(--ss-text-secondary);
  }

  .searchable-select__helper--error {
    color: var(--ss-error-color);
  }

  /* Accessibility */
  .searchable-select__control:focus-within {
    border-color: var(--ss-border-color-focus);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .searchable-select__control,
    .searchable-select__option,
    .searchable-select__chevron,
    .searchable-select__spinner {
      transition: none;
    }
  }
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'searchable-select-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SearchableSelect };
export type { SearchableSelectProps, Option };