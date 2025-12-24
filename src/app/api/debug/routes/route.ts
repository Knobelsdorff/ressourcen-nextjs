import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, ".next", "server", "app-paths-manifest.json");

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as Record<string, string>;
    const routes = Object.keys(manifest).sort();

    return NextResponse.json({
      cwd,
      manifestPath,
      routeCount: routes.length,
      hasLanding: routes.includes("/landing"),
      hasLandingpage: routes.includes("/landingpage"),
      sample: routes.filter((r) => r.startsWith("/land")),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        cwd,
        manifestPath,
        error: e?.message || "Failed to read manifest",
      },
      { status: 500 }
    );
  }
}

