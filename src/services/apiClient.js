import axios from "axios";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const TOKEN_KEY = "stayease_token";
const USER_KEY = "stayease_user";

export const http = axios.create({
  baseURL: API_ROOT,
  headers: { "Content-Type": "application/json" },
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "Request failed. Please try again.";
    const next = new Error(message);
    next.status = error.response?.status;
    next.data = error.response?.data;
    throw next;
  }
);

export const apiClient = {
  token: () => localStorage.getItem(TOKEN_KEY),
  setSession: ({ token, user }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  user: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch { return null; }
  },
  request: async (path, options = {}) => {
    const method = (options.method || "GET").toLowerCase();
    const body = options.body ? JSON.parse(options.body) : undefined;
    const response = await http.request({ url: path, method, data: body });
    return response.data;
  }
};
