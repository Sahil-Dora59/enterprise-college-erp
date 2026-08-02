import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";
import { coursesTable } from "./courses";

export const applicantAccountsTable = pgTable("applicant_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at", { withTimezone: true }),
  phoneOtpHash: text("phone_otp_hash"),
  phoneOtpExpiresAt: timestamp("phone_otp_expires_at", { withTimezone: true }),
  phoneOtpAttempts: integer("phone_otp_attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applicantSessionsTable = pgTable("applicant_sessions", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id").notNull().references(() => applicantAccountsTable.id, { onDelete: "cascade" }),
  tokenId: text("token_id").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admissionApplicationsTable = pgTable("admission_applications", {
  id: serial("id").primaryKey(),
  applicationId: text("application_id").notNull().unique(),
  referenceNumber: text("reference_number").notNull().unique(),
  applicantName: text("applicant_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  address: text("address"),
  qualification: text("qualification"),
  program: text("program").notNull(),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  courseId: integer("course_id").references(() => coursesTable.id),
  status: text("status").notNull().default("draft"),
  documents: jsonb("documents").$type<Record<string, { name: string; type: string; size: number }>>().notNull().default({}),
  declarationAccepted: boolean("declaration_accepted").notNull().default(false),
  assignedTo: integer("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
  reviewComment: text("review_comment"),
  studentUserId: integer("student_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  applicantId: integer("applicant_id").references(() => applicantAccountsTable.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const admissionEventsTable = pgTable("admission_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admissionDocumentsTable = pgTable("admission_documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admissionInterviewsTable = pgTable("admission_interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  mode: text("mode").notNull().default("online"),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  result: text("result"),
});

export const admissionTestsTable = pgTable("admission_tests", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  score: integer("score"),
  result: text("result"),
  eligibilityDecision: text("eligibility_decision"),
  testCenter: text("test_center"),
  seatNumber: text("seat_number"),
});

export const admissionAcademicAssignmentsTable = pgTable("admission_academic_assignments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  courseId: integer("course_id").references(() => coursesTable.id),
  semesterId: integer("semester_id"),
  academicSession: text("academic_session"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admissionDeliveryQueueTable = pgTable("admission_delivery_queue", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  template: text("template").notNull(),
  recipient: text("recipient").notNull(),
  payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const admissionNotificationsTable = pgTable("admission_notifications", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => admissionApplicationsTable.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  channel: text("channel").notNull().default("in_app"),
  template: text("template").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdmissionApplication = typeof admissionApplicationsTable.$inferSelect;