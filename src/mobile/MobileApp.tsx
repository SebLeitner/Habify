import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from '../components/UI/ProtectedRoute';
import MobileLayout from './components/MobileLayout';
import MobileCapturePage from './pages/MobileCapturePage';
import MobileLogPage from './pages/MobileLogPage';

const MobileApp = () => {
  const location = useLocation();
  const hideNavigation = location.pathname === '/login';

  return (
    <MobileLayout hideNavigation={hideNavigation}>
      <Routes>
        <Route path="/" element={<Navigate to="/capture" replace />} />
        <Route
          path="/capture"
          element={(
            <ProtectedRoute>
              <MobileCapturePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/log"
          element={(
            <ProtectedRoute>
              <MobileLogPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/capture" replace />} />
      </Routes>
    </MobileLayout>
  );
};

export default MobileApp;
