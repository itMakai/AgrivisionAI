import axios from 'axios';

// Use Vite env variable if provided, otherwise default to relative /api/ (works when backend is reverse-proxied).
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

export async function sendMessage({ to, channel, body }) {
  // POST to backend endpoint; backend should accept {to, channel, body} and return {reply, sid}
  const res = await api.post('messaging/send/', { to, channel, body });
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
    localStorage.setItem('avai_token', token);
    api.defaults.headers.common.Authorization = `Token ${token}`;
  } else {
    localStorage.removeItem('avai_token');
    delete api.defaults.headers.common.Authorization;
  }
}

export function loadAuthToken() {
  const t = localStorage.getItem('avai_token');
  if (t) api.defaults.headers.common.Authorization = `Token ${t}`;
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

export async function fetchConversation(phone, channel = 'sms') {
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

export default api;
