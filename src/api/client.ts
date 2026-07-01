import axios from "axios";
import { auth } from "../config/firebase";

export const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://asia-south1-sales-calls-tracking.cloudfunctions.net/api';

export const api = axios.create({
  baseURL: BACKEND_URL,
});

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string') return message;
    if (!error.response) return 'Unable to reach the server. Check the API URL and your connection.';
  }
  return fallback;
};

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(false);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
