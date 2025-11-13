const Spinner = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-brand-secondary" />
    {label && <span className="text-sm text-slate-400">{label}</span>}
  </div>
);

export default Spinner;
