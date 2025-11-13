import { useMemo, useState } from 'react';

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

const TagInput = ({ label, value, onChange, placeholder }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const normalizedTags = useMemo(
    () => value.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    [value],
  );

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
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="font-medium text-slate-100">{label}</span>
      <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
        {normalizedTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100"
          >
            {tag}
            <button
              type="button"
              className="rounded-full px-1 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              onClick={() => removeTag(tag)}
              aria-label={`${tag} entfernen`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
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
    </label>
  );
};

export default TagInput;
