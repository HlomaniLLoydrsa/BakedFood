import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Send, ShoppingBag, Settings, Menu, X, ExternalLink, ChevronRight } from 'lucide-react';

const NAV = [
  { to: '/admin',          label: 'Home',     icon: LayoutDashboard, exact: true  },
  { to: '/admin/products', label: 'Products', icon: Package,         exact: false },
  { to: '/admin/publish',  label: 'Publish',  icon: Send,            exact: false },
  { to: '/admin/orders',   label: 'Orders',   icon: ShoppingBag,     exact: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings,        exact: false },
];

function useActive(to: string, exact?: boolean) {
  const { pathname } = useLocation();
  return exact ? pathname === to : pathname.startsWith(to);
}

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === '/admin') return 'Home';
  if (pathname.startsWith('/admin/products/new')) return 'New Product';
  if (pathname.match(/\/admin\/products\/.+/)) return 'Edit Product';
  if (pathname.startsWith('/admin/products')) return 'Products';
  if (pathname.startsWith('/admin/publish/new')) return 'Publish Products';
  if (pathname.match(/\/admin\/publish\/.+\/edit/)) return 'Edit Publish';
  if (pathname.match(/\/admin\/publish\/.+/)) return 'Published Window';
  if (pathname.startsWith('/admin/publish')) return 'Publish';
  if (pathname.startsWith('/admin/orders')) return 'Orders';
  if (pathname.startsWith('/admin/settings')) return 'Settings';
  return 'Admin';
}

// ── Bottom tab bar (mobile) ───────────────────────────────────────────────
function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white" style={{ borderTop: '1px solid #f0f0f0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex h-16">
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const active = useActive(to, exact);
          return (
            <Link key={to} to={to} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-500 rounded-full" />
              )}
              <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${active ? 'bg-green-500' : 'bg-transparent'}`}>
                <Icon size={18} className={active ? 'text-white' : 'text-stone-400'} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${active ? 'text-green-600' : 'text-stone-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 fixed inset-y-0 left-0 z-30 bg-white border-r border-stone-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-100">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
            <Send size={14} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-stone-900 text-sm">Droply</p>
            <p className="text-[10px] text-stone-400 font-medium">Admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const active = useActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active ? 'bg-green-500 text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={13} className="ml-auto text-white/60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-stone-100">
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors">
          <ExternalLink size={14} />
          View public site
        </a>
      </div>
    </aside>
  );
}

// ── Mobile top header ─────────────────────────────────────────────────────
function TopHeader({ onMenu }: { onMenu: () => void }) {
  const title = usePageTitle();
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-100">
      <div className="flex items-center gap-3 h-14 px-4">
        <button onClick={onMenu}
          className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center text-stone-700">
          <Menu size={18} />
        </button>
        <h1 className="text-base font-extrabold text-stone-900 flex-1">{title}</h1>
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500">
          <ExternalLink size={15} />
        </a>
      </div>
    </header>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────
function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
              <Send size={14} className="text-white" />
            </div>
            <span className="font-extrabold text-stone-900 text-sm">Droply Admin</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-stone-100 rounded-xl flex items-center justify-center">
            <X size={15} className="text-stone-600" />
          </button>
        </div>
        <nav className="p-3 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const active = useActive(to, exact);
            return (
              <Link key={to} to={to} onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'bg-green-500 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}>
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar />
      <TopHeader onMenu={() => setDrawerOpen(true)} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="lg:ml-56 pb-24 lg:pb-8">
        <main className="p-4 lg:p-8 max-w-2xl mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
