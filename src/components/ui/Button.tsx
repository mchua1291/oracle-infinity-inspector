import type { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-md border border-transparent bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#514c47] active:bg-[#201e1c] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}
