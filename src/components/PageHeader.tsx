export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="display mt-3 text-4xl sm:text-5xl">{title}</h1>
        {children && <p className="mt-4 text-[15px] leading-relaxed text-muted">{children}</p>}
      </div>
      {actions}
    </div>
  );
}
