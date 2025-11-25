import { AuthUser } from '../types/auth';
import { getEnvValue } from './runtimeEnv';

const SESSION_KEY = 'habify-cognito-session';
const PKCE_STATE_KEY = 'habify-cognito-pkce-state';
const DEBUG_FLAG = 'VITE_COGNITO_DEBUG';

export type CognitoSession = {
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

export type AuthRedirectState = {
  redirectPath?: string;
  codeVerifier: string;
};

const deriveRedirectUri = () => {
  if (!window.location.protocol.startsWith('http')) {
    return undefined;
  }

  return `${window.location.origin}/login`;
};

const resolveRedirectUri = (envRedirectUri?: string, derivedRedirectUri?: string) => {
  if (!derivedRedirectUri) {
    return envRedirectUri;
  }

  if (!envRedirectUri) {
    return derivedRedirectUri;
  }

  try {
    const envOrigin = new URL(envRedirectUri).origin;
    const derivedOrigin = new URL(derivedRedirectUri).origin;

    if (envOrigin !== derivedOrigin) {
      return derivedRedirectUri;
    }
  } catch (error) {
    console.error('Redirect-URL konnte nicht geprüft werden', error);
    return derivedRedirectUri;
  }

  return envRedirectUri;
};

const getEnv = () => {
  const domain = getEnvValue('VITE_COGNITO_DOMAIN')?.replace(/\/$/, '');
  const clientId = getEnvValue('VITE_COGNITO_USER_POOL_CLIENT_ID');
  const envRedirectUri = getEnvValue('VITE_COGNITO_REDIRECT_URI');
  const derivedRedirectUri = deriveRedirectUri();
  const redirectUri = resolveRedirectUri(envRedirectUri, derivedRedirectUri);

  if (!domain) {
    throw new Error('VITE_COGNITO_DOMAIN ist nicht gesetzt.');
  }
  if (!clientId) {
    throw new Error('VITE_COGNITO_USER_POOL_CLIENT_ID ist nicht gesetzt.');
  }
  if (!redirectUri) {
    throw new Error('VITE_COGNITO_REDIRECT_URI ist nicht gesetzt und konnte nicht abgeleitet werden.');
  }

  return { domain, clientId, redirectUri };
};

const isDebugEnabled = () => `${getEnvValue(DEBUG_FLAG)}`.toLowerCase() === 'true';

const maskToken = (token?: string | null) => {
  if (!token) return token;
  if (token.length <= 10) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

const debugLog = (title: string, payload: Record<string, unknown>) => {
  if (!isDebugEnabled()) return;

  // eslint-disable-next-line no-console
  console.groupCollapsed(`[Cognito Debug] ${title}`);
  Object.entries(payload).forEach(([key, value]) => {
    // eslint-disable-next-line no-console
    console.log(`${key}:`, value);
  });
  // eslint-disable-next-line no-console
  console.groupEnd();
};

const encodeState = (state: AuthRedirectState) => btoa(JSON.stringify(state));
const decodeState = (value: string): AuthRedirectState | null => {
  try {
    return JSON.parse(atob(value)) as AuthRedirectState;
  } catch (error) {
    console.error('State konnte nicht dekodiert werden', error);
    return null;
  }
};

const toBase64Url = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256 = async (input: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64Url(digest);
};

export const createPkce = async (): Promise<{ codeVerifier: string; codeChallenge: string }> => {
  const randomValues = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = toBase64Url(randomValues.buffer);
  const codeChallenge = await sha256(codeVerifier);
  return { codeVerifier, codeChallenge };
};

export const buildAuthorizeUrl = async (mode: 'login' | 'register', redirectPath?: string) => {
  const { domain, clientId, redirectUri } = getEnv();
  const { codeVerifier, codeChallenge } = await createPkce();
  const state = encodeState({ codeVerifier, redirectPath });
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'email openid profile',
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  if (mode === 'register') {
    params.append('screen_hint', 'signup');
  }

  debugLog('Authorize-URL erstellt', {
    mode,
    domain,
    clientId,
    redirectUri,
    redirectPath: redirectPath ?? 'none',
    state,
    codeChallenge,
    authorizeUrl: `${domain}/oauth2/authorize`,
    query: Object.fromEntries(params),
  });

  return `${domain}/oauth2/authorize?${params.toString()}`;
};

export const clearPkceState = () => sessionStorage.removeItem(PKCE_STATE_KEY);

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded) as Record<string, unknown>;
};

const mapIdTokenToUser = (idToken: string, fallbackEmail?: string): AuthUser => {
  const payload = decodeJwtPayload(idToken);
  return {
    id: (payload.sub as string) ?? 'unknown',
    email: (payload.email as string) ?? fallbackEmail ?? 'unbekannt',
  };
};

export const persistSession = (session: CognitoSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const loadSession = (): CognitoSession | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CognitoSession;
  } catch (error) {
    console.error('Gespeicherte Session ungültig', error);
    return null;
  }
};

const createFormBody = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

const requestTokens = async (body: Record<string, string>) => {
  const { domain } = getEnv();
  debugLog('Token-Request gesendet', {
    tokenEndpoint: `${domain}/oauth2/token`,
    grant_type: body.grant_type,
    redirect_uri: body.redirect_uri,
    code_verifier: body.code_verifier,
    code: body.code,
    refresh_token: maskToken(body.refresh_token),
  });
  const response = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: createFormBody(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Cognito-Token konnten nicht abgerufen werden.');
  }

  const payload = (await response.json()) as {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!payload.id_token || !payload.access_token) {
    throw new Error('Cognito hat keine gültigen Tokens zurückgegeben.');
  }

  const expiresAt = Date.now() + payload.expires_in * 1000;

  return {
    session: {
      idToken: payload.id_token,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? null,
      expiresAt,
    },
    user: mapIdTokenToUser(payload.id_token),
  };
};

export const exchangeCodeForSession = async (code: string, stateParam?: string) => {
  const storedStateValue = sessionStorage.getItem(PKCE_STATE_KEY);
  const storedState = storedStateValue ? decodeState(storedStateValue) : null;
  const incomingState = stateParam ? decodeState(stateParam) : null;

  const state = storedState ?? incomingState;

  if (!state || !state.codeVerifier) {
    throw new Error('Es wurde kein PKCE-State gefunden. Starte den Login erneut.');
  }

  if (storedState && incomingState && incomingState.codeVerifier !== storedState.codeVerifier) {
    throw new Error('Ungültiger OAuth-State erhalten.');
  }

  const { clientId, redirectUri } = getEnv();

  const result = await requestTokens({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: state.codeVerifier,
  });

  persistSession(result.session);
  debugLog('Authorization Code eingelöst', {
    redirectPath: state.redirectPath ?? 'none',
    session: {
      expiresAt: new Date(result.session.expiresAt).toISOString(),
      accessToken: maskToken(result.session.accessToken),
      refreshToken: maskToken(result.session.refreshToken),
      idToken: maskToken(result.session.idToken),
    },
    user: result.user,
  });
  clearPkceState();

  return { ...result, redirectPath: state.redirectPath };
};

export const refreshWithToken = async (refreshToken: string) => {
  const { clientId } = getEnv();
  const result = await requestTokens({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  debugLog('Refresh Token eingelöst', {
    session: {
      expiresAt: new Date(result.session.expiresAt).toISOString(),
      accessToken: maskToken(result.session.accessToken),
      refreshToken: maskToken(result.session.refreshToken),
      idToken: maskToken(result.session.idToken),
    },
    user: result.user,
  });

  persistSession(result.session);
  return result;
};

export const resolveStoredUser = async (): Promise<AuthUser | null> => {
  const session = loadSession();
  if (!session) {
    return null;
  }

  if (session.expiresAt > Date.now() + 60_000) {
    return mapIdTokenToUser(session.idToken);
  }

  if (!session.refreshToken) {
    clearSession();
    return null;
  }

  try {
    const refreshed = await refreshWithToken(session.refreshToken);
    return refreshed.user;
  } catch (error) {
    console.error('Token-Refresh fehlgeschlagen', error);
    clearSession();
    return null;
  }
}; 

export const buildLogoutUrl = () => {
  const { domain, clientId, redirectUri } = getEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: redirectUri,
  });
  debugLog('Logout-URL erstellt', {
    domain,
    clientId,
    logoutUri: redirectUri,
    logoutUrl: `${domain}/logout`,
    query: Object.fromEntries(params),
  });
  return `${domain}/logout?${params.toString()}`;
};

export const logCognitoDebugInfo = () => {
  const { domain, clientId, redirectUri } = getEnv();
  const storedSession = loadSession();

  debugLog('Aktuelle Cognito-Konfiguration', {
    domain,
    clientId,
    redirectUri,
    origin: window.location.origin,
    hasStoredSession: Boolean(storedSession),
    storedSession: storedSession
      ? {
          expiresAt: new Date(storedSession.expiresAt).toISOString(),
          accessToken: maskToken(storedSession.accessToken),
          refreshToken: maskToken(storedSession.refreshToken),
          idToken: maskToken(storedSession.idToken),
        }
      : 'none',
  });
};
