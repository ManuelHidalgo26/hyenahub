import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Sign out immediately if the refresh token has expired (before wasting a network call)
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.error === "RefreshTokenError") {
    await signOut({ redirect: true, callbackUrl: "/login" });
    return Promise.reject(new Error("Sesión expirada"));
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await signOut({ redirect: true, callbackUrl: "/login" });
      return Promise.reject(new Error("Sesión expirada"));
    }
    if (!err.response) {
      const netErr = new Error("No se pudo conectar con el servidor. Verificá tu conexión o intentá más tarde.");
      (netErr as { isNetworkError?: boolean }).isNetworkError = true;
      return Promise.reject(netErr);
    }
    return Promise.reject(err);
  }
);

export default api;
