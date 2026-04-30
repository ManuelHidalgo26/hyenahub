import logger from "./logger.service";

const auditLogger = logger.child({ module: "audit" });

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
  const record: AuditEntry = { timestamp: new Date().toISOString(), ...entry };
  auditLogger.info(record);
}
