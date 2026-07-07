import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Enable CORS for all routes
app.use("/*", cors());

// ── Configuration ──
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbMxRlF5H_aGCMxDBUbKA-saQ97rXSs8ykmnFeBXfaOxhGLA_wAlh8nv9nGOm6MpAUdjg/exec";
const DSR_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyJKcIFrnQbgGuSdN_1QP_Eswsa8014-vgEqwMxnHM2aCUqBn34Bi10zCxAuI2Jh09v6w/exec";
const FOOTFALL_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzEavZOIhY7RSGed62ma83kMlDoMFrlIRoJzVVvy1Ntmd8YhKL4vUAEoZtHqM4ZyGT3/exec";

// ── Health Check ──
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "Retail Sales Assist API",
    runtime: "Bun + Hono",
  });
});

// ── Proxy Submit to Google Apps Script ──
app.post("/api/submit", async (c) => {
  try {
    const body = await c.req.json();
    const action = body.action as string;

    // Route to the correct Apps Script endpoint
    let targetUrl = APPS_SCRIPT_URL;
    if (action === "dsr") {
      targetUrl = DSR_APPS_SCRIPT_URL;
    } else if (action === "footfall") {
      targetUrl = FOOTFALL_APPS_SCRIPT_URL;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Proxy submit error:", error);
    return c.json(
      { ok: false, error: "Failed to proxy request" },
      500
    );
  }
});

// ── Proxy Answers Feed ──
app.get("/api/answers", async (c) => {
  try {
    const response = await fetch(
      APPS_SCRIPT_URL + "?action=answers"
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Proxy answers error:", error);
    return c.json(
      { ok: false, error: "Failed to fetch answers feed" },
      500
    );
  }
});

// ── Start Server ──
const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Hono API server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
