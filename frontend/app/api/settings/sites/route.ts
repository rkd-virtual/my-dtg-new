// frontend/app/api/settings/sites/route.ts
import { NextResponse } from "next/server";

const FLASK_BASE = (process.env.FLASK_API_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

export async function GET(req: Request) {
  if (!FLASK_BASE) {
    console.error("[proxy] FLASK_BASE not configured");
    return NextResponse.json({ error: "flask_base_not_configured" }, { status: 500 });
  }

  const flaskUrl = `${FLASK_BASE}/api/user/sites`;
  console.log(`[proxy] Forwarding GET to: ${flaskUrl}`);

  try {
    const flaskRes = await fetch(flaskUrl, {
      method: "GET",
      headers: { cookie: req.headers.get("cookie") ?? "", accept: "application/json" },
    });

    const text = await flaskRes.text();
    const contentType = flaskRes.headers.get("content-type") ?? "text/plain";

    return new NextResponse(text, {
      status: flaskRes.status,
      headers: { "content-type": contentType },
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err);
    return NextResponse.json({ error: "proxy_fetch_failed", detail: String(err) }, { status: 500 });
  }
}
