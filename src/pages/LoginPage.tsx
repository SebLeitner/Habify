import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login, register, completeLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorDescription = searchParams.get('error_description') ?? searchParams.get('error');

    if (errorDescription) {
      setError(errorDescription);
    }

    if (!code) {
      return;
    }

    const handleCallback = async () => {
      setIsSubmitting(true);
      setError(null);
      try {
        const redirect = await completeLogin(code, state ?? undefined);
        navigate(redirect ?? redirectPath ?? '/activities', { replace: true });
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : 'Login konnte nicht abgeschlossen werden.');
      } finally {
        setIsSubmitting(false);
      }
    };

    void handleCallback();
  }, [searchParams, completeLogin, navigate, redirectPath]);

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
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Bitte warten…' : mode === 'login' ? 'Mit Cognito anmelden' : 'Cognito-Konto erstellen'}
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
