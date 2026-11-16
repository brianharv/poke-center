import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Client } from "pg";

export async function setSessionTimes(
  sessionId: string,
  values: { createdAt?: Date; expiresAt?: Date; updatedAt?: Date },
) {
  const connectionString =
    process.env.TEST_DATABASE_URL ??
    parse(readFileSync(".env"))["DATABASE_URL"];
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  await client.connect();
  try {
    const result = await client.query(
      'UPDATE "Session" SET "createdAt" = COALESCE($1, "createdAt"), "expiresAt" = COALESCE($2, "expiresAt"), "updatedAt" = COALESCE($4, "updatedAt") WHERE id = $3',
      [
        values.createdAt?.toISOString() ?? null,
        values.expiresAt?.toISOString() ?? null,
        sessionId,
        values.updatedAt?.toISOString() ?? null,
      ],
    );
    if (result.rowCount !== 1)
      throw new Error("Expected one isolated test session.");
  } finally {
    await client.end();
  }
}
