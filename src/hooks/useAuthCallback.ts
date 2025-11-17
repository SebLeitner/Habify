import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultHomePath } from '../utils/domainRouting';

export const useAuthCallback = (redirectPath?: string) => {
  const { completeLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fallbackRedirect = useMemo(() => redirectPath ?? getDefaultHomePath(), [redirectPath]);

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
      setIsProcessing(true);
      setError(null);
      try {
        const redirect = await completeLogin(code, state ?? undefined);
        navigate(redirect ?? fallbackRedirect, { replace: true });
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : 'Login konnte nicht abgeschlossen werden.');
      } finally {
        setIsProcessing(false);
      }
    };

    void handleCallback();
  }, [searchParams, completeLogin, navigate, fallbackRedirect]);

  return { error, setError, isProcessing };
};
