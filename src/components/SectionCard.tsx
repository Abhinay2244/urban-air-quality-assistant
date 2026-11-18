import type { ReactElement, ReactNode } from 'react';

/**
 * Props for SectionCard component.
 */
export interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Soft surface card wrapper with consistent border, elevation, and dark-mode contrast.
 */
export function SectionCard({ title, subtitle, icon, children }: SectionCardProps): ReactElement {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2.5">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
