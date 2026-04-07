import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "audit.log");

export type AuditAction =
  | "USER_DELETED"
  | "ROUTINE_DELETED"
  | "DIET_DELETED"
  | "VIDEO_DELETED"
  | "AVATAR_UPDATED"
  | "EXERCISE_NOTE_UPDATED";

interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  targetId: string;
  meta?: Record<string, unknown>;
}

export function auditLog(entry: Omit<AuditEntry, "timestamp">) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  // Escribe en consola siempre
  console.log(`[AUDIT] ${line}`);
  // Escribe en archivo (sin bloquear)
  fs.appendFile(LOG_FILE, line + "\n", err => {
    if (err) console.error("[AUDIT] Error escribiendo log:", err);
  });
}
