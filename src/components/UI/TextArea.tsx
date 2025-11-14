import { forwardRef, TextareaHTMLAttributes } from 'react';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, helperText, className = '', ...props }, ref) => {
    return (
      <label className="flex w-full flex-col gap-2 text-sm text-slate-600">
        {label && <span className="font-medium text-slate-900">{label}</span>}
        <textarea
          ref={ref}
          className={`min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-primary/60 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 ${className}`}
          {...props}
        />
        {helperText && <span className="text-xs text-slate-500">{helperText}</span>}
      </label>
    );
  },
);

TextArea.displayName = 'TextArea';

export default TextArea;
