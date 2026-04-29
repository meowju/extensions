/**
 * SearchableSelect Demo
 *
 * Demonstrates various usage patterns for the SearchableSelect component
 */

import React, { useState } from 'react';
import { SearchableSelect, Option } from './SearchableSelect';

// Sample data
const countries: Option<string>[] = [
  { value: 'us', label: 'United States', group: 'North America' },
  { value: 'ca', label: 'Canada', group: 'North America' },
  { value: 'mx', label: 'Mexico', group: 'North America' },
  { value: 'br', label: 'Brazil', group: 'South America' },
  { value: 'ar', label: 'Argentina', group: 'South America' },
  { value: 'gb', label: 'United Kingdom', group: 'Europe' },
  { value: 'de', label: 'Germany', group: 'Europe' },
  { value: 'fr', label: 'France', group: 'Europe' },
  { value: 'it', label: 'Italy', group: 'Europe' },
  { value: 'es', label: 'Spain', group: 'Europe' },
  { value: 'jp', label: 'Japan', group: 'Asia' },
  { value: 'cn', label: 'China', group: 'Asia' },
  { value: 'kr', label: 'South Korea', group: 'Asia' },
  { value: 'in', label: 'India', group: 'Asia' },
  { value: 'au', label: 'Australia', group: 'Oceania' },
  { value: 'nz', label: 'New Zealand', group: 'Oceania' },
];

const programmingLanguages: Option<number>[] = [
  { value: 1, label: 'TypeScript' },
  { value: 2, label: 'JavaScript' },
  { value: 3, label: 'Python' },
  { value: 4, label: 'Rust' },
  { value: 5, label: 'Go' },
  { value: 6, label: 'Java' },
  { value: 7, label: 'C#' },
  { value: 8, label: 'Swift' },
  { value: 9, label: 'Kotlin' },
];

// Demo component
export function SearchableSelectDemo() {
  // Single select state
  const [singleCountry, setSingleCountry] = useState<string | null>(null);

  // Multi-select state
  const [multiCountry, setMultiCountry] = useState<string[]>([]);

  // Programming language select
  const [language, setLanguage] = useState<number | null>(null);

  // Disabled state
  const [disabledValue, setDisabledValue] = useState<string | null>('us');

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        SearchableSelect Demo
      </h1>

      {/* Basic Single Select */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Single Select (Countries)
        </h2>
        <SearchableSelect
          label="Select a country"
          options={countries}
          value={singleCountry}
          onChange={(value) => setSingleCountry(value as string | null)}
          placeholder="Choose a country..."
          searchable
          typeahead
        />
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Selected: {singleCountry || 'None'}
        </p>
      </section>

      {/* Multi Select */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Multi Select (Countries)
        </h2>
        <SearchableSelect
          label="Select multiple countries"
          options={countries}
          value={multiCountry}
          onChange={(value) => setMultiCountry(value as string[])}
          placeholder="Choose countries..."
          mode="multiple"
          searchable
          typeahead
        />
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Selected: {multiCountry.length > 0 ? multiCountry.join(', ') : 'None'}
        </p>
      </section>

      {/* Number Value Select */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Number Values (Languages)
        </h2>
        <SearchableSelect
          label="Select a programming language"
          options={programmingLanguages}
          value={language}
          onChange={(value) => setLanguage(value as number | null)}
          placeholder="Choose a language..."
          searchable
        />
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          Selected: {language || 'None'}
        </p>
      </section>

      {/* With Helper Text */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          With Helper Text
        </h2>
        <SearchableSelect
          label="Email country"
          options={countries}
          value={singleCountry}
          onChange={(value) => setSingleCountry(value as string | null)}
          placeholder="Select country..."
          helperText="This will be used to format your phone number"
          searchable
        />
      </section>

      {/* With Error State */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          With Validation Error
        </h2>
        <SearchableSelect
          label="Required field"
          options={countries}
          value={singleCountry}
          onChange={(value) => setSingleCountry(value as string | null)}
          placeholder="Select a country..."
          required
          errorMessage="Please select a country to continue"
          searchable
        />
      </section>

      {/* Loading State */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Loading State
        </h2>
        <SearchableSelect
          label="Async options"
          options={[]}
          value={null}
          onChange={() => {}}
          placeholder="Loading..."
          loading
          searchable
        />
      </section>

      {/* Disabled */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Disabled
        </h2>
        <SearchableSelect
          label="Disabled select"
          options={countries}
          value={disabledValue}
          onChange={(value) => setDisabledValue(value as string | null)}
          placeholder="Cannot change..."
          disabled
          searchable
        />
      </section>

      {/* Non-searchable */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Non-searchable (Dropdown only)
        </h2>
        <SearchableSelect
          label="Simple dropdown"
          options={programmingLanguages}
          value={language}
          onChange={(value) => setLanguage(value as number | null)}
          placeholder="Choose language..."
          searchable={false}
        />
      </section>
    </div>
  );
}

export default SearchableSelectDemo;