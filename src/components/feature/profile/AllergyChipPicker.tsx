'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/utils';
import { XIcon } from 'lucide-react';
import * as React from 'react';

interface AllergyChipPickerProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

/**
 * MultiSelectChips built for Profile dietary preferences.
 * - Renders current selections as removable chips.
 * - Suggestion pills below for one-tap add.
 * - Free-add via keyboard (Enter or comma) in the text input.
 */
export function AllergyChipPicker({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Type and press Enter…',
  className,
}: AllergyChipPickerProps) {
  const [inputVal, setInputVal] = React.useState('');

  function add(item: string) {
    const trimmed = item.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputVal('');
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(inputVal);
    }
    if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
      remove(value[value.length - 1] ?? '');
    }
  }

  const unusedSuggestions = suggestions.filter((s) => !value.includes(s.toLowerCase()));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-text">{label}</span>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-sm font-medium text-text"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => remove(item)}
                className="rounded-full p-0.5 hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon strokeWidth={1.75} className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Free-add input */}
      <Input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={`Add ${label}`}
      />

      {/* Suggestion pills */}
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn(
                'rounded-full border border-border/60 bg-surface px-2.5 py-0.5',
                'text-xs text-text-muted transition-colors duration-snap',
                'hover:border-accent/60 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
