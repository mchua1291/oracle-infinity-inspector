import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

export function StatusSummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <Card className="min-h-28 border-t-2 border-t-[#d4cfc8]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <div className="mt-3 text-2xl font-semibold text-ink">{value}</div>
      {note && <p className="mt-2 text-xs text-stone-500">{note}</p>}
    </Card>
  );
}
