import { useMemo } from 'react';
import { API_BASE_URL } from '../api/client';
import Button from '../components/UI/Button';
import Spinner from '../components/UI/Spinner';
import { useData } from '../contexts/DataContext';

const endpointSections = [
  {
    title: 'Aktivitäten',
    description: 'Alle Aktivitäten für den eingeloggten Benutzer.',
    endpoints: ['/activities/list', '/activities/add', '/activities/update', '/activities/delete'],
  },
  {
    title: 'Logbuch',
    description: 'Zeitliche Erfassung der Aktivitäten mit Attributen und Notizen.',
    endpoints: ['/logs/list', '/logs/add', '/logs/update', '/logs/delete'],
  },
  {
    title: 'Highlights',
    description: 'Tages-Highlights mit Datum, Titel und Text.',
    endpoints: ['/highlights/list', '/highlights/add', '/highlights/update', '/highlights/delete'],
  },
];

const DataOverviewPage = () => {
  const { state, isLoading, error, refresh } = useData();

  const sections = useMemo(
    () => [
      {
        key: 'activities',
        title: `Aktivitäten (${state.activities.length})`,
        payload: state.activities,
      },
      { key: 'logs', title: `Logbuch (${state.logs.length})`, payload: state.logs },
      { key: 'highlights', title: `Highlights (${state.highlights.length})`, payload: state.highlights },
    ],
    [state.activities, state.highlights, state.logs],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rohdaten</h1>
          <p className="text-sm text-slate-400">
            Direkter Blick auf die geladenen Daten aus der Datenbank sowie die verwendeten API-Endpunkte.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Spinner label="Lade" />}
          <Button type="button" variant="secondary" onClick={refresh}>
            Neu laden
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-semibold text-white">API-Endpunkte</h2>
        <p className="mt-1 text-sm text-slate-400">Basis: {API_BASE_URL}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {endpointSections.map((section) => (
            <div key={section.title} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{section.description}</p>
              <ul className="mt-2 space-y-1 text-xs text-brand-secondary">
                {section.endpoints.map((endpoint) => (
                  <li key={endpoint} className="rounded bg-slate-800/80 px-2 py-1 font-mono text-[11px]">
                    {endpoint}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {sections.map((section) => (
          <div key={section.key} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <span className="text-xs uppercase tracking-wide text-slate-400">JSON</span>
            </div>
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-slate-800 bg-black/40 p-3 text-xs text-slate-100">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(section.payload, null, 2)}</pre>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default DataOverviewPage;
