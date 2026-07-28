import { db, activityLogTable } from "@workspace/db";

export async function logActivity(
  type: string,
  description: string,
  actorName?: string,
): Promise<void> {
  try {
    await db.insert(activityLogTable).values({ type, description, actorName });
  } catch {
    // Non-critical — don't let activity logging break the main flow
  }
}
