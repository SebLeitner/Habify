import { Navigate, Route, Routes } from 'react-router-dom';
import ActivitiesPage from './pages/ActivitiesPage';
import ActivityEditorPage from './pages/ActivityEditorPage';
import LogsPage from './pages/LogsPage';
import HighlightsPage from './pages/HighlightsPage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/UI/AppLayout';
import ProtectedRoute from './components/UI/ProtectedRoute';
import DataOverviewPage from './pages/DataOverviewPage';
import PwaLayout from './components/Pwa/PwaLayout';
import PwaActivitiesPage from './pages/pwa/PwaActivitiesPage';
import PwaHighlightsPage from './pages/pwa/PwaHighlightsPage';
import PwaLogPage from './pages/pwa/PwaLogPage';
import { getDefaultHomePath, isPwaDomain } from './utils/domainRouting';

const App = () => {
  const defaultHomePath = getDefaultHomePath();
  const shouldRedirectToPwa = isPwaDomain();

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to={defaultHomePath} replace />} />
        <Route
          path="/activities"
          element={
            shouldRedirectToPwa ? (
              <Navigate to="/pwa/activities" replace />
            ) : (
              <ProtectedRoute>
                <ActivitiesPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/editor"
          element={
            shouldRedirectToPwa ? (
              <Navigate to="/pwa/activities" replace />
            ) : (
              <ProtectedRoute>
                <ActivityEditorPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/logs"
          element={
            shouldRedirectToPwa ? (
              <Navigate to="/pwa/log" replace />
            ) : (
              <ProtectedRoute>
                <LogsPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/data"
          element={
            shouldRedirectToPwa ? (
              <Navigate to="/pwa/activities" replace />
            ) : (
              <ProtectedRoute>
                <DataOverviewPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/highlights"
          element={
            shouldRedirectToPwa ? (
              <Navigate to="/pwa/highlights" replace />
            ) : (
              <ProtectedRoute>
                <HighlightsPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/stats"
          element={
            shouldRedirectToPwa ? (
              <Navigate to="/pwa/activities" replace />
            ) : (
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            )
          }
        />
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route
        path="/pwa"
        element={
          <ProtectedRoute>
            <PwaLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="activities" replace />} />
        <Route path="activities" element={<PwaActivitiesPage />} />
        <Route path="highlights" element={<PwaHighlightsPage />} />
        <Route path="log" element={<PwaLogPage />} />
      </Route>
      <Route path="*" element={<Navigate to={defaultHomePath} replace />} />
    </Routes>
  );
};

export default App;
