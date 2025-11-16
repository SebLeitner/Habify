import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import MobileApp from './mobile/MobileApp';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <MobileApp />
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
