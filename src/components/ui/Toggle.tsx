export function Toggle({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  detail?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 border-b border-[#f1efed] py-3.5 last:border-0">
      <span>
        <span className="block text-sm font-medium text-stone-800">{label}</span>
        {detail && <span className="mt-1 block text-xs leading-5 text-stone-500">{detail}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-oracle"
      />
    </label>
  );
}
