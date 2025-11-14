import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Service Worker registration failed', error);
    },
  });

  window.addEventListener('online', () => {
    updateSW().catch((error) => {
      console.error('Service Worker update failed', error);
    });
  });
}
