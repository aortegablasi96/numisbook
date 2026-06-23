import { NextResponse } from "next/server";
import { checkHealth } from "@/services/health.service";

// Public, unauthenticated diagnostics endpoint (ADR-011) for uptime checks and
// the deploy platform: 200 when healthy, 503 when a dependency is down.
// force-dynamic so it runs on every request rather than being statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await checkHealth();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
  });
}
