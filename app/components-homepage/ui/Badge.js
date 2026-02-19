export function Badge({ children, className = "" }) {
  return (
    <div
      className={`inline-flex items-center px-3 py-1 rounded-full border border-primary text-primary text-xs md:text-sm font-semibold uppercase tracking-wide bg-white ${className}`}
    >
      {children}
    </div>
  );
}