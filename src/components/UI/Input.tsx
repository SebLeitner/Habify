import { forwardRef, InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, helperText, className = '', ...props }, ref) => {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-600">
      {label && <span className="font-medium text-slate-900">{label}</span>}
      <input
        ref={ref}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-primary/60 focus:outline-none focus:ring-4 focus:ring-brand-primary/10 ${className}`}
        {...props}
      />
      {helperText && <span className="text-xs text-slate-500">{helperText}</span>}
    </label>
  );
});

Input.displayName = 'Input';

export default Input;
