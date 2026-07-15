import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-[#e4e1dd] bg-white p-5 shadow-panel ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
