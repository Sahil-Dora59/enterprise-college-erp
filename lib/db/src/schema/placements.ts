import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

export const placementCompaniesTable = pgTable("placement_companies", {
  id: serial("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), website: text("website"), industry: text("industry"),
  status: text("status").notNull().default("pending"), verified: boolean("verified").notNull().default(false),
  ownerUserId: integer("owner_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const placementJobsTable = pgTable("placement_jobs", {
  id: serial("id").primaryKey(), companyId: integer("company_id").notNull().references(() => placementCompaniesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(), type: text("type").notNull().default("placement"), description: text("description"),
  location: text("location"), packageAmount: text("package_amount"), eligibility: jsonb("eligibility").$type<Record<string, unknown>>().notNull().default({}),
  deadline: timestamp("deadline", { withTimezone: true }), status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const placementApplicationsTable = pgTable("placement_applications", {
  id: serial("id").primaryKey(), jobId: integer("job_id").notNull().references(() => placementJobsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("applied"), appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});
export const placementResumesTable = pgTable("placement_resumes", {
  id: serial("id").primaryKey(), studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1), data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}), score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const placementInterviewsTable = pgTable("placement_interviews", {
  id: serial("id").primaryKey(), applicationId: integer("application_id").notNull().references(() => placementApplicationsTable.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), round: text("round").notNull().default("Round 1"),
  status: text("status").notNull().default("scheduled"), feedback: text("feedback"), result: text("result"),
});
export const placementOffersTable = pgTable("placement_offers", {
  id: serial("id").primaryKey(), applicationId: integer("application_id").notNull().references(() => placementApplicationsTable.id, { onDelete: "cascade" }),
  offerType: text("offer_type").notNull().default("offer"), packageAmount: text("package_amount"), documentHtml: text("document_html"),
  acceptanceStatus: text("acceptance_status").notNull().default("pending"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const alumniProfilesTable = pgTable("alumni_profiles", {
  id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  graduationYear: integer("graduation_year"), company: text("company"), bio: text("bio"), mentorshipAvailable: boolean("mentorship_available").notNull().default(false),
});
export const placementDrivesTable = pgTable("placement_drives", {
  id: serial("id").primaryKey(), companyId: integer("company_id").references(() => placementCompaniesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(), scheduledAt: timestamp("scheduled_at", { withTimezone: true }), status: text("status").notNull().default("planned"),
});
export const placementMentorshipsTable = pgTable("placement_mentorships", {
  id: serial("id").primaryKey(), mentorId: integer("mentor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  menteeId: integer("mentee_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }), status: text("status").notNull().default("requested"),
  topic: text("topic"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const placementReferralsTable = pgTable("placement_referrals", {
  id: serial("id").primaryKey(), referrerId: integer("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  candidateEmail: text("candidate_email").notNull(), companyId: integer("company_id").references(() => placementCompaniesTable.id, { onDelete: "set null" }),
  jobId: integer("job_id").references(() => placementJobsTable.id, { onDelete: "set null" }), note: text("note"), status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});