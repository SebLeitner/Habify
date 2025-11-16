import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/UI/Button';

const navItems = [
  { to: '/capture', label: 'Aktivität eingeben' },
  { to: '/log', label: 'Logbuch ansehen' },
  { to: '/highlights', label: 'Highlight hinzufügen' },
];

const MobileLayout = ({ children, hideNavigation = false }: { children: ReactNode; hideNavigation?: boolean }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-brand-secondary">Habify</span>
            <span className="text-xs text-slate-400">Mobile Logbuch</span>
          </div>
          {user ? (
            <div className="flex items-center gap-3 text-right">
              <span className="text-xs text-slate-300">{user.email}</span>
              <Button type="button" variant="secondary" onClick={logout} className="px-3 py-1 text-xs">
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="mx-auto w-full max-w-xl space-y-4">{children}</div>
      </main>

      {!hideNavigation && user && (
        <nav className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-around gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'flex-1 rounded-full px-4 py-2 text-center text-xs font-semibold transition',
                    isActive ? 'bg-brand-primary/30 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default MobileLayout;
