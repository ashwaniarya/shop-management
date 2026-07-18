import { NavLink } from '@/components/NavLink';

const PRIMARY_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/parts', label: 'Parts' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/transactions', label: 'Ledger' },
];

const CATALOG_LINKS = [
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/manufacturers', label: 'Manufacturers' },
  { href: '/categories', label: 'Categories' },
  { href: '/shops', label: 'Shops' },
];

function BrandMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 1.5 17.5 6v8L10 18.5 2.5 14V6Z"
        stroke="var(--color-accent-500)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.75" stroke="var(--color-ink-100)" strokeWidth="1.4" />
    </svg>
  );
}

export function Sidebar() {
  return (
    <nav className="flex w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900 px-6 py-5">
      <div className="mb-8 flex items-center gap-2.5 px-3">
        <BrandMark />
        <div className="font-display text-lg leading-none font-bold tracking-wide text-ink-50 uppercase">
          Shop Mgmt
        </div>
      </div>

      <ul className="space-y-0.5">
        {PRIMARY_LINKS.map((link) => (
          <li key={link.href}>
            <NavLink href={link.href}>{link.label}</NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-ink-800 pt-6">
        <div className="mb-2 px-3 font-mono text-[10px] font-medium tracking-[0.18em] text-ink-500 uppercase">
          Catalog data
        </div>
        <ul className="space-y-0.5">
          {CATALOG_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink href={link.href}>{link.label}</NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
