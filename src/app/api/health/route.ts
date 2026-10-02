import { db } from "@/lib/db";

// Reports whether the app can reach the database. Never includes connection details.
export async function GET() {
  try {
    await db()`SELECT 1`;
    return Response.json({ ok: true, database: "reachable" });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
