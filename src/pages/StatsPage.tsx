import Button from '../components/UI/Button';
import StatsOverview from '../components/Stats/StatsOverview';
import Spinner from '../components/UI/Spinner';
import { useData } from '../contexts/DataContext';

const StatsPage = () => {
  const { state, refresh, isLoading, error } = useData();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statistiken</h1>
          <p className="text-sm text-slate-500">
            Analysiere deine Aktivitäten für den aktuellen Tag, die Woche und den Monat.
          </p>
        </div>
        <Button variant="secondary" onClick={refresh}>
          Daten aktualisieren
        </Button>
      </header>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Lade Statistiken" />
        </div>
      ) : (
        <StatsOverview logs={state.logs} activities={state.activities} />
      )}
    </div>
  );
};

export default StatsPage;
