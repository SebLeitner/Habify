import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from './Spinner';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isLoading, user, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Lade Benutzer" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
