import { useMemo, useState } from 'react';

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
};

const TagInput = ({ label, value, onChange, placeholder, suggestions = [] }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const normalizedTags = useMemo(
    () => value.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    [value],
  );

  const availableSuggestions = useMemo(() => {
    const lowerSelected = new Set(normalizedTags.map((tag) => tag.toLowerCase()));
    const filtered = suggestions.filter((suggestion) => !lowerSelected.has(suggestion.toLowerCase()));
    if (!inputValue.trim()) {
      return filtered;
    }
    return filtered.filter((suggestion) =>
      suggestion.toLowerCase().includes(inputValue.trim().toLowerCase()),
    );
  }, [normalizedTags, suggestions, inputValue]);

  const addTag = (rawTag: string) => {
    const tag = rawTag.trim();
    if (!tag) {
      return;
    }

    const exists = normalizedTags.some((existing) => existing.toLowerCase() === tag.toLowerCase());
    if (!exists) {
      onChange([...normalizedTags, tag]);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(normalizedTags.filter((existing) => existing !== tag));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(inputValue);
    }
    if (event.key === 'Backspace' && !inputValue && normalizedTags.length) {
      event.preventDefault();
      const nextTags = normalizedTags.slice(0, -1);
      onChange(nextTags);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-900">{label}</span>
      <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        {normalizedTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {tag}
            <button
              type="button"
              className="rounded-full px-1 text-slate-400 transition hover:bg-white hover:text-brand-primary"
              onClick={() => removeTag(tag)}
              aria-label={`${tag} entfernen`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          value={inputValue}
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(',')) {
              const parts = value.split(',');
              parts.slice(0, -1).forEach(addTag);
              setInputValue(parts[parts.length - 1] ?? '');
            } else {
              setInputValue(value);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      </div>
      {!!availableSuggestions.length && (
        <div className="flex flex-wrap gap-2">
          {availableSuggestions.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              onClick={() => addTag(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </label>
  );
};

export default TagInput;
