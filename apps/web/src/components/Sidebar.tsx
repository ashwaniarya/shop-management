import Link from 'next/link';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/parts', label: 'Parts' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/manufacturers', label: 'Manufacturers' },
  { href: '/categories', label: 'Categories' },
  { href: '/shops', label: 'Shops' },
];

export function Sidebar() {
  return (
    <nav className="w-56 shrink-0 border-r border-gray-200 p-4">
      <div className="mb-4 px-3 text-lg font-semibold text-gray-900">Shop Management</div>
      <ul className="space-y-1">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
