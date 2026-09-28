import assert from "node:assert/strict";
import { after, test } from "node:test";
import { sql } from "drizzle-orm";
import { configureTestEnvironment } from "./helpers.ts";

configureTestEnvironment();

const { db, pool } = await import("@workspace/db");

after(async () => {
  await pool.end();
});

test("isolated PostgreSQL accepts connections with the Drizzle schema", async () => {
  assert.notEqual(process.env.TEST_DATABASE_URL, undefined);

  const connection = await db.execute(sql`select current_database() as database_name`);
  assert.equal(connection.rows[0]?.database_name, "erp_test");

  const schemaTable = await db.execute(sql`select to_regclass('public.users') as table_name`);
  assert.equal(schemaTable.rows[0]?.table_name, "users");
});