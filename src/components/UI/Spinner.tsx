const Spinner = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-primary" />
    {label && <span className="text-sm text-slate-500">{label}</span>}
  </div>
);

export default Spinner;
