import type { InputHTMLAttributes } from 'react';

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="search"
      className="w-full rounded-md border border-[#bcb6b1] bg-white px-3 py-2 text-sm shadow-sm placeholder:text-stone-400 hover:border-[#7b7570]"
      {...props}
    />
  );
}
