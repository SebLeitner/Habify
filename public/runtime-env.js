// Laufzeit-Umgebungsvariablen für die statisch ausgelieferte App.
//
// Dieses Skript wird **vor** dem eigentlichen Frontend geladen und kann beim
// Deployment überschrieben werden, ohne einen neuen Build zu erzeugen. Trage
// hier die Cognito- und API-Werte ein, die zum Environment passen.
//
// Beispiel:
// window.__HABIFY_ENV__ = {
//   VITE_COGNITO_DOMAIN: 'https://example.auth.eu-central-1.amazoncognito.com',
//   VITE_COGNITO_USER_POOL_CLIENT_ID: 'abc123',
//   VITE_COGNITO_REDIRECT_URI: 'https://app.example.com/login',
//   VITE_API_URL: 'https://api.example.com',
//   VITE_COGNITO_DEBUG: 'false',
// };

window.__HABIFY_ENV__ = window.__HABIFY_ENV__ || {};
