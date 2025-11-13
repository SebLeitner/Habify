import { InputHTMLAttributes } from 'react';

const ColorPicker = ({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) => {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-200">
      {label && <span className="font-medium text-slate-100">{label}</span>}
      <input
        type="color"
        className="h-12 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900"
        {...props}
      />
    </label>
  );
};

export default ColorPicker;
