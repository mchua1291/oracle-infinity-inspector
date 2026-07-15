import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

const variantClasses = {
  primary: 'border-transparent bg-ink text-white hover:bg-[#514c47] active:bg-[#201e1c]',
  secondary: 'border-stone-300 bg-white text-ink hover:bg-stone-100 active:bg-stone-200',
} as const;

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
