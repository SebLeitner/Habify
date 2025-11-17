const normalizeHost = (value?: string) =>
  value
    ?.replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

const getPwaHostname = () => normalizeHost(import.meta.env.VITE_PWA_APP_DOMAIN);

export const isPwaDomain = () => {
  const pwaHost = getPwaHostname();
  if (!pwaHost) return false;
  return window.location.hostname.toLowerCase() === pwaHost;
};

export const getDefaultHomePath = () => (isPwaDomain() ? '/pwa/activities' : '/activities');
