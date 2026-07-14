import type { ReactNode } from 'react';

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'danger';
}) {
  const style =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-sky-200 bg-sky-50 text-sky-950';
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${style}`}>{children}</div>;
}
