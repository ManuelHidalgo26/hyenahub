import axios from "axios";
import { signOut } from "next-auth/react";

const api = axios.create({
  baseURL: "/api",
  timeout: 12000,
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
