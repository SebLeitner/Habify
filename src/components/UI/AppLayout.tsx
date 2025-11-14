import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';

const navItems = [
  { to: '/activities', label: 'Aktivitäten' },
  { to: '/editor', label: 'Editor' },
  { to: '/highlights', label: 'Highlights' },
  { to: '/logs', label: 'Logbuch' },
  { to: '/stats', label: 'Statistiken' },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <span className="text-lg font-semibold text-brand-secondary">Habify</span>
            <span className="ml-2 text-sm text-slate-400">Routine-Tagebuch</span>
          </div>
          {user && (
            <nav className="flex items-center gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-brand-primary/20 text-brand-secondary' : 'text-slate-300 hover:text-white',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-slate-300 sm:inline">{user.email}</span>
                <Button type="button" variant="secondary" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              location.pathname !== '/login' && (
                <NavLink to="/login" className="text-sm text-brand-secondary hover:text-brand-primary">
                  Login
                </NavLink>
              )
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-black/30">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
