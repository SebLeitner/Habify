import { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';
import { useAuthCallback } from '../hooks/useAuthCallback';

const LoginPage = () => {
  const { login, register } = useAuth();
  const location = useLocation();
  const redirectPath = (location.state as { from?: string } | null)?.from;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { error, setError, isProcessing } = useAuthCallback(redirectPath);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusy = isSubmitting || isProcessing;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(redirectPath);
      } else {
        await register(redirectPath);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unbekannter Fehler');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-black/40">
      <h1 className="text-2xl font-bold text-white">{mode === 'login' ? 'Einloggen' : 'Registrieren'}</h1>
      <p className="mt-2 text-sm text-slate-400">
        Du wirst zum Cognito-Hosted-UI weitergeleitet. Nach erfolgreicher Anmeldung geht es automatisch zurück zur App.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error && <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <Button type="submit" disabled={isBusy} className="w-full">
          {isBusy ? 'Bitte warten…' : mode === 'login' ? 'Mit Cognito anmelden' : 'Cognito-Konto erstellen'}
        </Button>
      </form>
      <div className="mt-6 text-sm text-slate-300">
        {mode === 'login' ? (
          <button
            type="button"
            className="text-brand-secondary hover:text-brand-primary"
            onClick={() => setMode('register')}
          >
            Noch kein Konto? Jetzt registrieren
          </button>
        ) : (
          <button
            type="button"
            className="text-brand-secondary hover:text-brand-primary"
            onClick={() => setMode('login')}
          >
            Bereits registriert? Hier einloggen
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
