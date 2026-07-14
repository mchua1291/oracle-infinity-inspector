import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-[#e4e1dd] bg-white p-5 shadow-panel ${className}`}
    >
      {children}
    </section>
  );
}
