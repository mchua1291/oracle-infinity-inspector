export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#bcb6b1] bg-[#fbf9f8] px-6 py-12 text-center">
      <h3 className="font-semibold text-stone-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">{detail}</p>
    </div>
  );
}
