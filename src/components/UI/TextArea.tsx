import { forwardRef, TextareaHTMLAttributes } from 'react';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, helperText, className = '', ...props }, ref) => {
    return (
      <label className="flex w-full flex-col gap-2 text-sm text-slate-200">
        {label && <span className="font-medium text-slate-100">{label}</span>}
        <textarea
          ref={ref}
          className={`min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/40 ${className}`}
          {...props}
        />
        {helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </label>
    );
  },
);

TextArea.displayName = 'TextArea';

export default TextArea;
