export const tabs = [
  'Overview',
  'Implementation',
  'Network Events',
  'QA Plan',
  'Event Timeline',
  'Warnings',
  'Export',
  'Settings',
] as const;
export type TabName = (typeof tabs)[number];

export function TabNav({
  active,
  onChange,
}: {
  active: TabName;
  onChange: (tab: TabName) => void;
}) {
  return (
    <nav
      aria-label="Inspector sections"
      className="flex gap-1 overflow-x-auto border-b border-[#e4e1dd] bg-[#fbf9f8] px-4 pt-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-xs font-semibold transition ${active === tab ? 'border-oracle bg-white text-[#312d2a]' : 'border-transparent text-[#6f6964] hover:bg-[#f1efed] hover:text-[#312d2a]'}`}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
