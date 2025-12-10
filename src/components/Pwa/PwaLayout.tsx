import { NavLink, Outlet } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';

const navItems = [
  { to: '/pwa/activities', label: 'Aktivitäten', emoji: '✅' },
  { to: '/pwa/highlights', label: 'Highlights', emoji: '✨' },
  { to: '/pwa/log', label: 'Log', emoji: '📝' },
];

const PwaLayout = () => {
  const { error } = useData();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Habify App</p>
            <p className="text-lg font-semibold text-white">Aus Momenten werden Wege.</p>
          </div>
          <div className="rounded-full bg-brand-primary/15 px-3 py-1 text-xs font-semibold text-brand-secondary">
            app.habify.leitnersoft.com
          </div>
        </div>
        {error && (
          <div className="bg-red-900/40 px-4 py-2 text-center text-xs text-red-200">
            {error} – Verbindung zum Backend erforderlich.
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around px-2 py-3 text-sm font-semibold text-slate-300">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 transition',
                  isActive
                    ? 'bg-brand-primary/20 text-brand-secondary'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')
              }
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PwaLayout;
