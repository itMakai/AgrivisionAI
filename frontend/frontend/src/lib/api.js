import axios from 'axios';

// Use Vite env variable if provided, otherwise default to relative /api/ (works when backend is reverse-proxied).
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/';
const TOKEN_KEY = 'avai_token';
const LAST_ACTIVE_KEY = 'avai_last_active_at';
const SESSION_NOTICE_KEY = 'avai_session_notice';
const SESSION_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || 60);
export const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

function emitAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:changed'));
  }
}

function setSessionNotice(message) {
  if (message) {
    localStorage.setItem(SESSION_NOTICE_KEY, message);
  } else {
    localStorage.removeItem(SESSION_NOTICE_KEY);
  }
}

export function consumeSessionNotice() {
  const message = localStorage.getItem(SESSION_NOTICE_KEY);
  if (message) {
    localStorage.removeItem(SESSION_NOTICE_KEY);
  }
  return message;
}

export function touchSessionActivity() {
  if (localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  }
}

export function isSessionExpired() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  const lastActiveAt = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0);
  if (!lastActiveAt) return false;

  return Date.now() - lastActiveAt > SESSION_TIMEOUT_MS;
}

export function clearAuthSession(message = null) {
  if (message) {
    setSessionNotice(message);
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
  delete api.defaults.headers.common.Authorization;
  emitAuthChanged();
}

export async function sendMessage(payload) {
  // POST to backend endpoint; supports external (to/channel/body) and internal (conversation_id/to_user/body) messages.
  const res = await api.post('messaging/send/', payload);
  return res.data;
}

export async function fetchTopPrices() {
  const res = await api.get('prices/');
  return res.data;
}

export async function fetchProviders() {
  const res = await api.get('providers/');
  return res.data;
}

export async function createProvider(payload) {
  // payload: { name, contact_name, contact_phone, email, address, verified }
  const res = await api.post('providers/', payload);
  return res.data;
}

export async function fetchServices(params = {}) {
  const res = await api.get('services/', { params });
  return res.data;
}

export async function fetchService(id) {
  const res = await api.get(`services/${id}/`);
  return res.data;
}

export async function fetchStandardPrices(params = {}) {
  const res = await api.get('standard-prices/', { params });
  return res.data;
}

export async function createBooking(payload) {
  const res = await api.post('bookings/', payload);
  return res.data;
}

export async function fetchInsights() {
  const res = await api.get('insights/');
  return res.data;
}

export async function fetchListings(params = {}) {
  const res = await api.get('listings/', { params });
  return res.data;
}

export async function fetchCrops(params = {}) {
  const res = await api.get('crops/', { params });
  return res.data;
}

export async function fetchMarkets(params = {}) {
  const res = await api.get('markets/', { params });
  return res.data;
}

export async function createListing(payload) {
  // payload: { crop, quantity, unit, price, market, contact_phone }
  const res = await api.post('listings/', payload);
  return res.data;
}

// ----- Auth & profile helpers -----
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    api.defaults.headers.common.Authorization = `Token ${token}`;
  } else {
    clearAuthSession();
  }
}

export function loadAuthToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;

  if (isSessionExpired()) {
    clearAuthSession('Your session timed out. Please log in again.');
    return null;
  }

  api.defaults.headers.common.Authorization = `Token ${t}`;
  return t;
}

export async function registerUser(payload) {
  // payload: { username, password, email, role('farmer'|'buyer'), phone_number, location }
  const res = await api.post('auth/register/', payload);
  return res.data;
}

export async function loginUser(payload) {
  // payload: { username, password }
  const res = await api.post('auth/login/', payload);
  return res.data;
}

export async function fetchProfile() {
  const res = await api.get('auth/profile/');
  return res.data;
}

export async function fetchPlatformOverview() {
  const res = await api.get('platform/overview/');
  return res.data;
}

export async function fetchPlatformAuth() {
  const res = await api.get('platform/auth/');
  return res.data;
}

export async function fetchPlatformMarketplace() {
  const res = await api.get('platform/marketplace/');
  return res.data;
}

export async function fetchPlatformAnalytics(params = {}) {
  const res = await api.get('platform/analytics/', { params });
  return res.data;
}

export async function fetchAdminMetrics() {
  const res = await api.get('admin/metrics/');
  return res.data;
}

export async function fetchAdminUsers() {
  const res = await api.get('admin/users/');
  return res.data;
}

export async function createAdminManagedUser(payload) {
  const res = await api.post('admin/users/', payload);
  return res.data;
}

export async function updateAdminManagedUser(userId, payload) {
  const res = await api.patch(`admin/users/${userId}/`, payload);
  return res.data;
}

export async function deleteAdminManagedUser(userId) {
  const res = await api.delete(`admin/users/${userId}/`);
  return res.data;
}

export async function moderateTransportRequest(bookingId, payload) {
  const res = await api.patch(`admin/transport-requests/${bookingId}/`, payload);
  return res.data;
}

export async function deleteTransportRequestAsAdmin(bookingId) {
  const res = await api.delete(`admin/transport-requests/${bookingId}/`);
  return res.data;
}

export async function deleteMessageById(messageId) {
  const res = await api.delete(`messaging/messages/${messageId}/`);
  return res.data;
}

export async function deleteMessageAsAdmin(messageId) {
  const res = await api.delete(`admin/messages/${messageId}/`);
  return res.data;
}

export async function fetchTransportOptions(params = {}) {
  const res = await api.get('platform/transport/options/', { params });
  return res.data;
}

export async function fetchTransportRequests() {
  const res = await api.get('platform/transport/requests/');
  return res.data;
}

export async function createTransportRequest(payload) {
  const res = await api.post('platform/transport/requests/', payload);
  return res.data;
}

export async function updateTransportRequestStatus(id, status) {
  const res = await api.patch(`platform/transport/requests/${id}/status/`, { status });
  return res.data;
}

export async function fetchRealTimeWeather(params = {}) {
  // params: { city, lat, lon }
  const res = await api.get('weather/realtime/', { params });
  return res.data;
}

export async function fetchConversation(phone) {
  // expects query param 'conversation' with phone
  const res = await api.get('messaging/messages/', { params: { conversation: phone } });
  return res.data;
}

export async function fetchConversationById(id) {
  const res = await api.get(`messaging/messages/`, { params: { conversation_id: id } });
  return res.data;
}

export async function getOrCreateConversationWithUser(other_user_id) {
  const res = await api.post('messaging/conversations/get_or_create/', { other_user_id });
  return res.data;
}

export async function fetchConversations() {
  const res = await api.get('messaging/conversations/');
  return res.data;
}

export async function fetchFarmers(params = {}) {
  const res = await api.get('farmers/', { params });
  return res.data;
}

export async function fetchBuyers(params = {}) {
  const res = await api.get('buyers/', { params });
  return res.data;
}

export async function fetchProfileByUsername(username) {
  const res = await api.get(`profiles/${encodeURIComponent(username)}/`);
  return res.data;
}

export async function updateProfile(data) {
  // If data is a FormData (contains file), let axios set the headers automatically
  if (data instanceof FormData) {
    const res = await api.put('auth/profile/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  }
  const res = await api.put('auth/profile/', data);
  return res.data;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && isSessionExpired()) {
      clearAuthSession('Your session timed out. Please log in again.');
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Token ${token}`;
      touchSessionActivity();
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const hadAuthHeader = !!error?.config?.headers?.Authorization || !!api.defaults.headers.common.Authorization;

    if (token && error?.response?.status === 401 && hadAuthHeader) {
      clearAuthSession('Your session expired. Please log in again.');
    } else if (token && !error?.response && hadAuthHeader) {
      clearAuthSession('The server connection was lost. Please log in again when the server is back.');
    }

    return Promise.reject(error);
  },
);

// ----- WebSocket helpers -----

const WS_BASE = (() => {
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/';
  // Derive WebSocket base from the HTTP base (strip trailing /api/)
  const httpBase = apiBase.replace(/\/api\/?$/, '');
  return httpBase.replace(/^http/, 'ws');
})();

/**
 * Open a WebSocket to a per-conversation chat room.
 * @param {number|string} conversationId
 * @returns {WebSocket}
 */
export function openChatSocket(conversationId) {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  return new WebSocket(`${WS_BASE}/ws/chat/${conversationId}/?token=${token}`);
}

/**
 * Open a WebSocket to the per-user notification channel.
 * @returns {WebSocket}
 */
export function openNotificationsSocket() {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  return new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
}

export default api;
