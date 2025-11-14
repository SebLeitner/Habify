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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <span className="text-lg font-semibold text-slate-900">Habify</span>
            <span className="ml-2 text-sm text-slate-500">Routine-Tagebuch</span>
          </div>
          {user && (
            <nav className="flex items-center gap-2 rounded-full bg-white/80 p-1 shadow-inner shadow-slate-200">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
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
                <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span>
                <Button type="button" variant="secondary" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              location.pathname !== '/login' && (
                <NavLink to="/login" className="text-sm font-medium text-brand-primary hover:text-brand-secondary">
                  Login
                </NavLink>
              )
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
