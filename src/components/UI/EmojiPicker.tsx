import { useMemo } from 'react';

const emojiChoices = ['💧', '🍎', '🧘', '🤸', '📝', '🏃', '☀️', '🌙', '🔥', '🌿', '📚', '💤', '🥗', '🧠'];

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

const EmojiPicker = ({ value, onChange }: EmojiPickerProps) => {
  const options = useMemo(() => emojiChoices, []);

  return (
    <div>
      <div className="mb-3 text-sm text-slate-500">
        Aktuelles Icon: <span className="text-lg">{value}</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {options.map((emoji) => {
          const classes = ['flex h-10 w-10 items-center justify-center rounded-2xl border transition bg-white shadow-sm'];
          if (value === emoji) {
            classes.push('border-brand-primary bg-brand-primary/10');
          } else {
            classes.push('border-transparent hover:border-brand-primary/40 hover:bg-brand-primary/5');
          }
          return (
            <button key={emoji} type="button" className={classes.join(' ')} onClick={() => onChange(emoji)}>
              <span className="text-xl">{emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmojiPicker;
