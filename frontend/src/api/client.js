import axios from 'axios';
import { authClient, tokenStorage } from './authClient';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
  : 'https://cerebral-production.up.railway.app/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Restore stored token into axios headers on startup
export async function restoreSession() {
  const token = await tokenStorage.get();
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  return token;
}

// Called after sign-in / sign-up — persists token and sets auth header
export async function setSession(token) {
  await tokenStorage.set(token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// Called on sign-out
export async function clearSession() {
  await tokenStorage.remove();
  delete api.defaults.headers.common.Authorization;
}

// Retry-on-401: attempt one silent session refresh via Better Auth
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) { refreshSubscribers.push(cb); }
function onRefreshed(token) { refreshSubscribers.forEach((cb) => cb(token)); refreshSubscribers = []; }

async function refreshSessionSilently() {
  try {
    const { data } = await authClient.getSession();
    if (data?.token) {
      await setSession(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config;
    if (!original || error.response?.status !== 401) return Promise.reject(error);
    if (original._retry) {
      await clearSession();
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    const newToken = await refreshSessionSilently();
    isRefreshing = false;
    onRefreshed(newToken);

    if (!newToken) return Promise.reject(error);
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  },
);
