import type { ReactElement, ReactNode } from 'react';

/**
 * Props for SectionCard component.
 */
export interface SectionCardProps {
  title: string;
  children: ReactNode;
}

/**
 * Simple structural card wrapper with a heading for scaffold sections.
 */
export function SectionCard({ title, children }: SectionCardProps): ReactElement {
  return (
    <section className="rounded border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
