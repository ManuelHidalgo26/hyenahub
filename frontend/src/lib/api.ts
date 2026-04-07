import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 12000,
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if ((session as { error?: string })?.error === "RefreshTokenExpired") {
    await signOut({ redirect: true, callbackUrl: "/login" });
    return Promise.reject(new Error("Sesión expirada"));
  }
  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  }
  return config;
});

// Interceptor de respuesta: transforma errores de red en mensajes legibles
api.interceptors.response.use(
  res => res,
  err => {
    if (!err.response) {
      // Sin respuesta = backend caído o sin conexión
      const netErr = new Error("No se pudo conectar con el servidor. Verificá tu conexión o intentá más tarde.");
      (netErr as { isNetworkError?: boolean }).isNetworkError = true;
      return Promise.reject(netErr);
    }
    return Promise.reject(err);
  }
);

export default api;
