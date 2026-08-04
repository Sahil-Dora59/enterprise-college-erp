import { pgTable, serial, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const integrationsTable = pgTable("integrations", {
  id: serial("id").primaryKey(), name: text("name").notNull(), category: text("category").notNull(),
  provider: text("provider").notNull(), status: text("status").notNull().default("not_configured"),
  health: text("health").notNull().default("unknown"), lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  config: jsonb("config"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const integrationQueueTable = pgTable("integration_queue", {
  id: serial("id").primaryKey(), channel: text("channel").notNull(), provider: text("provider").notNull(),
  recipient: text("recipient").notNull(), payload: jsonb("payload").notNull(), status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0), lastError: text("last_error"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  queueStatusCreatedIndex: index("integration_queue_status_created_idx").on(table.status, table.createdAt),
  queueChannelIndex: index("integration_queue_channel_idx").on(table.channel, table.provider),
}));
export const integrationJobsTable = pgTable("integration_jobs", {
  id: serial("id").primaryKey(), name: text("name").notNull(), status: text("status").notNull().default("scheduled"),
  schedule: text("schedule"), attempts: integer("attempts").notNull().default(0), error: text("error"),
  runAt: timestamp("run_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  jobStatusRunIndex: index("integration_jobs_status_run_idx").on(table.status, table.runAt),
}));
export const integrationAuditTable = pgTable("integration_audit", {
  id: serial("id").primaryKey(), actorUserId: integer("actor_user_id"), action: text("action").notNull(),
  resource: text("resource").notNull(), metadata: jsonb("metadata"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  auditCreatedIndex: index("integration_audit_created_idx").on(table.createdAt),
  auditActorIndex: index("integration_audit_actor_created_idx").on(table.actorUserId, table.createdAt),
}));
export const integrationWebhooksTable = pgTable("integration_webhooks", {
  id: serial("id").primaryKey(), name: text("name").notNull(), url: text("url").notNull(), direction: text("direction").notNull().default("outgoing"),
  secretHash: text("secret_hash"), status: text("status").notNull().default("active"), lastStatus: integer("last_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const integrationApiKeysTable = pgTable("integration_api_keys", {
  id: serial("id").primaryKey(), name: text("name").notNull(), keyHash: text("key_hash").notNull(), lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }), active: boolean("active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const integrationBackupsTable = pgTable("integration_backups", {
  id: serial("id").primaryKey(), kind: text("kind").notNull(), status: text("status").notNull().default("scheduled"),
  location: text("location"), sizeBytes: integer("size_bytes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const integrationPaymentsTable = pgTable("integration_payments", {
  id: serial("id").primaryKey(), provider: text("provider").notNull(), externalId: text("external_id"), amount: text("amount").notNull(),
  currency: text("currency").notNull().default("USD"), status: text("status").notNull().default("created"), metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});