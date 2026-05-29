/**
 * Rate limiter en memoria con ventana fija por clave.
 *
 * Sin dependencias externas. Nota: el estado vive en el proceso, así que en
 * despliegues serverless multi-instancia cada instancia mantiene su propio
 * contador (mitigación parcial, suficiente para el tráfico actual). Si se
 * necesita límite global compartido, migrar a un store con Redis.
 */
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Limpieza oportunista para acotar el uso de memoria.
  if (store.size > 5000) {
    for (const [k, b] of store) if (now > b.resetAt) store.delete(k);
  }

  const bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true, retryAfter: 0 };
}

/** Extrae la IP del cliente desde los headers de proxy habituales. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
