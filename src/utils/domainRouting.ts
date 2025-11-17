const normalizeHost = (value?: string) =>
  value
    ?.replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

const getPwaHostname = () => normalizeHost(import.meta.env.VITE_PWA_APP_DOMAIN);

export const isPwaDomain = () => {
  const currentHost = window.location.hostname.toLowerCase();
  const pwaHost = getPwaHostname();

  if (pwaHost) {
    return currentHost === pwaHost;
  }

  return currentHost.startsWith('app.');
};

export const getDefaultHomePath = () => (isPwaDomain() ? '/pwa/activities' : '/activities');
