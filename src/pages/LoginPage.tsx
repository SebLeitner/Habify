import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      const redirect = (location.state as { from?: string } | null)?.from ?? '/activities';
      navigate(redirect, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/60">
      <h1 className="text-2xl font-bold text-slate-900">{mode === 'login' ? 'Einloggen' : 'Registrieren'}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Nutze deine E-Mail-Adresse, um dich bei Habify anzumelden.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Input
          label="E-Mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Passwort"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <div className="rounded-2xl border border-red-500/40 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Bitte warten…' : mode === 'login' ? 'Einloggen' : 'Konto erstellen'}
        </Button>
      </form>
      <div className="mt-6 text-sm text-slate-600">
        {mode === 'login' ? (
          <button
            type="button"
            className="font-medium text-brand-primary hover:text-brand-secondary"
            onClick={() => setMode('register')}
          >
            Noch kein Konto? Jetzt registrieren
          </button>
        ) : (
          <button
            type="button"
            className="font-medium text-brand-primary hover:text-brand-secondary"
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
