// frontend/lib/apiClient.ts
type Json = any;

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim(); // e.g. "http://localhost:5000/api"

function normalizePath(path: string) {
  if (!path) return API_BASE || "/api";
  path = path.trim();
  // If an explicit API_BASE is configured, use it directly
  if (API_BASE) {
    if (!path.startsWith("/")) path = `/${path}`;
    return `${API_BASE.replace(/\/$/, "")}${path}`;
  }
  // fallback: route to Next's /api proxy
  if (path.startsWith("/api/")) path = path.slice(4);
  if (!path.startsWith("/")) path = `/${path}`;
  return `/api${path}`;
}

async function readResponseBody(res: Response) {
  if (!res || typeof (res as any).text !== "function") {
    throw new Error("fetch did not return a Response object");
  }
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text || "{}");
    } catch {
      return { raw: text };
    }
  }
  return text;
}

/**
 * Core fetch wrapper used by helpers.
 * Defaults credentials to "include" so cookies are sent/received in cross-origin dev.
 */
async function makeRequest(path: string, opts: RequestInit = {}) {
  const url = normalizePath(path);
  const defaultHeaders = { "Content-Type": "application/json" };

  const init: RequestInit = {
    // prefer explicit method from opts, else GET by default for safety in getApi/postApi wrappers
    method: opts.method,
    headers: { ...(defaultHeaders as any), ...(opts.headers as any) },
    body: opts.body,
    // default to include credentials so cookies (JWT cookie or session) are handled automatically;
    // caller can still override by passing init.credentials explicitly.
    credentials: opts.credentials ?? "include",
    // pass through other init props if provided
    mode: opts.mode,
    cache: opts.cache,
    redirect: opts.redirect,
    referrer: opts.referrer,
    referrerPolicy: opts.referrerPolicy,
    integrity: opts.integrity,
  };

  const res = await fetch(url, init);
  const data = await readResponseBody(res).catch((err) => {
    const e: any = new Error("Failed to read response body: " + String(err));
    e.status = res.status;
    e.payload = null;
    throw e;
  });

  if (!res.ok) {
    const err: any = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function postApi(path: string, body?: Json, init?: RequestInit) {
  const opts: RequestInit = {
    method: init?.method || "POST",
    headers: init?.headers,
    body: body !== undefined ? JSON.stringify(body) : init?.body,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts);
}

export async function getApi(path: string, init?: RequestInit) {
  const opts: RequestInit = {
    method: "GET",
    headers: init?.headers,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts);
}

export async function putApi(path: string, body?: Json, init?: RequestInit) {
  const opts: RequestInit = {
    method: "PUT",
    headers: init?.headers,
    body: body !== undefined ? JSON.stringify(body) : init?.body,
    credentials: init?.credentials,
  };
  return makeRequest(path, opts);
}
