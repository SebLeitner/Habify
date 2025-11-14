import { Navigate, Route, Routes } from 'react-router-dom';
import ActivitiesPage from './pages/ActivitiesPage';
import ActivityEditorPage from './pages/ActivityEditorPage';
import LogsPage from './pages/LogsPage';
import HighlightsPage from './pages/HighlightsPage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/UI/AppLayout';
import ProtectedRoute from './components/UI/ProtectedRoute';

const App = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/activities" replace />} />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <ActivitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <ActivityEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <LogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/highlights"
          element={
            <ProtectedRoute>
              <HighlightsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <StatsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/activities" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
