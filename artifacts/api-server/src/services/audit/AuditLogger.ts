export type AuditAction = "create" | "read" | "update" | "delete" | "login" | "export";

export interface AuditEvent {
  action: AuditAction;
  entity: string;
  entityId?: string;
  actorId?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface AuditLogger {
  record(event: AuditEvent): Promise<void>;
}

export class NoopAuditLogger implements AuditLogger {
  async record(_event: AuditEvent): Promise<void> {}
}