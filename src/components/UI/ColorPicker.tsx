import { InputHTMLAttributes } from 'react';

const ColorPicker = ({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) => {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-600">
      {label && <span className="font-medium text-slate-900">{label}</span>}
      <input
        type="color"
        className="h-12 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white shadow-sm"
        {...props}
      />
    </label>
  );
};

export default ColorPicker;
