type RuntimeEnv = Partial<Record<string, string>>;

declare global {
  interface Window {
    __HABIFY_ENV__?: RuntimeEnv;
  }
}

const getRuntimeEnv = (): RuntimeEnv => {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__HABIFY_ENV__ ?? {};
};

export const getEnvValue = (key: string): string | undefined => {
  const runtimeEnv = getRuntimeEnv();
  return runtimeEnv[key] ?? import.meta.env[key];
};
