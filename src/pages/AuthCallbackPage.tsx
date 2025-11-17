import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import { useAuthCallback } from '../hooks/useAuthCallback';
import { getDefaultHomePath } from '../utils/domainRouting';

const AuthCallbackPage = () => {
  const { error, setError, isProcessing } = useAuthCallback();
  const navigate = useNavigate();

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => {
      navigate(getDefaultHomePath());
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, navigate]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-xl shadow-black/40">
      <h1 className="text-2xl font-bold text-white">Anmeldung wird abgeschlossen…</h1>
      <p className="mt-2 text-sm text-slate-300">Bitte warten. Wir verifizieren deine Anmeldung.</p>
      {isProcessing && <p className="mt-6 text-sm text-slate-400">Weiterleiten…</p>}
      {error && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          <div className="text-xs text-slate-400">
            Du wirst in wenigen Sekunden automatisch zurück zur Startseite geleitet.
          </div>
          <Button type="button" onClick={() => navigate(getDefaultHomePath())}>
            Zur Startseite
          </Button>
          <Button type="button" variant="secondary" onClick={() => setError(null)}>
            Erneut versuchen
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuthCallbackPage;
