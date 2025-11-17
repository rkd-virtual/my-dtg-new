// frontend/app/api/auth/login/route.ts
import { NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    //console.log("[/api/auth/login] proxying login to Flask:", `${FLASK_API}/api/auth/login`);
    // Forward credentials to Flask
    const flaskRes = await fetch(`${FLASK_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await flaskRes.json().catch(() => ({}));

    // If login failed, forward status & body
    if (!flaskRes.ok) {
      return NextResponse.json(data, { status: flaskRes.status });
    }

    // Extract token if Flask returned it in JSON
    const token = data.access_token || data.token || null;

    // Create Next response and set cookie on Next origin
    const res = NextResponse.json({ ok: true, data });

    if (token) {
      // Set cookie name to the one Flask expects: access_token_cookie
      res.cookies.set({
        name: "access_token_cookie",
        value: token,
        httpOnly: true,
        path: "/",
        sameSite: "lax",   // keep for dev; use 'none' + secure in cross-site HTTPS
        // secure: true,   // enable in production (HTTPS)
        // maxAge: 60 * 60 * 24 * 7, // optional expiry (seconds)
      });
    } else {
      // If Flask instead returned Set-Cookie header, some runtimes don't expose it.
      // You can optionally forward that cookie if available.
    }

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: "server_error", message: String(err) }, { status: 500 });
  }
}
