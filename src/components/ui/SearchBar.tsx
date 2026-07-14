import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Search input with a leading search icon, focus glow, and a clear button.
 *
 * The `onChange` callback is debounced by 300ms so that rapid typing
 * does not flood the parent with updates. Clearing via the X button
 * fires immediately.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep the latest onChange without re-triggering the debounce effect
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync when the parent resets the value externally
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced notification to parent (300ms after the last keystroke)
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onChangeRef.current(internalValue);
    }, 300);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [internalValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  const handleClear = () => {
    setInternalValue('');
    onChangeRef.current('');
  };

  return (
    <div
      className={[
        'group relative flex items-center',
        'bg-bg-elevated border border-bg-hover rounded-lg',
        'transition-all duration-200',
        'focus-within:border-gold/50 focus-within:shadow-gold-glow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Search
        size={18}
        className="ml-3 shrink-0 text-text-muted transition-colors group-focus-within:text-gold-bright"
      />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-transparent px-2 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="mr-2 shrink-0 rounded-full p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
