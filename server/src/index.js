import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import drivers from "./routes/drivers.js";
import shifts from "./routes/shifts.js";
import runs from "./routes/runs.js";
import schedules from "./routes/schedules.js";
import dispatchOrders from "./routes/dispatchOrders.js";
import dailyOrders from "./routes/dailyOrders.js";
import pickupOrders from "./routes/pickupOrders.js";
import customLoadTypes from "./routes/customLoadTypes.js";
import fuelReadings from "./routes/fuelReadings.js";
import fuelRefills from "./routes/fuelRefills.js";
import fuelTank from "./routes/fuelTank.js";
import customersIl from "./routes/customersIl.js";
import customersPa from "./routes/customersPa.js";
import inventoryEntries from "./routes/inventoryEntries.js";
import customerPrices from "./routes/customerPrices.js";

await initDb();

const app = express();
app.use(cors());
// NOTE: Customers "Initialize from Excel" can post a large JSON array.
// Express' default JSON limit is 100kb which will fail with an HTML error page.
// Bump the limit and return JSON errors so the client can display them cleanly.
app.use(express.json({ limit: "10mb" }));

// JSON/body-parser error handler (must come AFTER express.json)
app.use((err, _req, res, next) => {
  if (!err) return next();
  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request payload too large" });
  }
  // Bad JSON
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  return next(err);
});

// Simple request logger (helps debugging on Render)
app.use((req, _res, next) => {
  // Keep it short; Render logs show this
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/drivers", drivers);
app.use("/api/shifts", shifts);
app.use("/api/runs", runs);
app.use("/api/schedules", schedules);
app.use("/api/dispatch-orders", dispatchOrders);
app.use("/api/daily-orders", dailyOrders);
app.use("/api/pickup-orders", pickupOrders);
app.use("/api/custom-load-types", customLoadTypes);
app.use("/api/fuel-readings", fuelReadings);
app.use("/api/fuel-refills", fuelRefills);
app.use("/api/fuel-tank", fuelTank);
app.use("/api/customers-il", customersIl);
app.use("/api/customers-pa", customersPa);
app.use("/api/inventory-entries", inventoryEntries);
app.use("/api/customer-prices", customerPrices);

// --- Static hosting (so you can use the app by URL) ---
// In production we serve the Vite build (dist) from the same URL as the API.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Some deploy setups build to <root>/dist, others to <root>/server/dist.
// Auto-detect so you don't get a blank page if the build output path changes.
const candidates = [
  path.resolve(__dirname, "../../dist"),
  path.resolve(__dirname, "../dist"),
  path.resolve(process.cwd(), "dist"),
  path.resolve(process.cwd(), "server/dist"),
];

function pickDistDir() {
  for (const p of candidates) {
    try {
      const indexHtml = path.join(p, "index.html");
      if (fs.existsSync(indexHtml)) return p;
    } catch (_) {}
  }
  return candidates[0];
}


function injectErrorOverlay(html) {
  // Inject an inline script that renders a visible overlay when the JS bundle fails
  // before React mounts (e.g., import error, missing env, module init crash).
  const overlayScript = `
<script>
(function(){
  function show(msg){
    try {
      var id='__early_error_overlay__';
      var el=document.getElementById(id);
      if(!el){
        el=document.createElement('div');
        el.id=id;
        el.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#7f1d1d;color:#fff;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;white-space:pre-wrap;word-break:break-word;padding:16px;overflow:auto;';
        document.body.appendChild(el);
      }
      el.textContent='App failed to start. Copy this error:\\n\\n'+msg;
    } catch(e) {}
  }
  window.addEventListener('error', function(ev){
    var err = ev && (ev.error || ev.message) ? (ev.error && (ev.error.stack||ev.error.message) || ev.message) : String(ev);
    show(String(err));
  });
  window.addEventListener('unhandledrejection', function(ev){
    var r = ev && ev.reason ? ev.reason : ev;
    var err = r && (r.stack||r.message) ? (r.stack||r.message) : String(r);
    show(String(err));
  });
})();
</script>
`;
  // Inject before </head> if possible, otherwise prepend.
  if (typeof html !== "string") return html;
  if (html.includes("__early_error_overlay__")) return html;
  const idx = html.toLowerCase().lastIndexOf("</head>");
  if (idx !== -1) return html.slice(0, idx) + overlayScript + html.slice(idx);
  return overlayScript + html;
}

function sendSpaIndex(res) {
  try {
    const p = path.join(DIST_DIR, "index.html");
    if (!fs.existsSync(p)) {
      return res
        .status(500)
        .type("text/plain")
        .send(
          `Build not found. Expected index.html in: \n- ${candidates.join("\n- ")}\n\nOpen /debug/dist for details.`
        );
    }
    const html = fs.readFileSync(p, "utf8");
    res.type("text/html").send(injectErrorOverlay(html));
  } catch (e) {
    res.status(500).type("text/plain").send(String(e));
  }
}

const DIST_DIR = pickDistDir();
console.log("Serving client from:", DIST_DIR);

// Debug endpoints (useful when DevTools/F12 is blocked)
app.get("/debug/dist", (_req, res) => {
  try {
    const exists = fs.existsSync(DIST_DIR);
    const indexExists = fs.existsSync(path.join(DIST_DIR, "index.html"));
    const assetsDir = path.join(DIST_DIR, "assets");
    const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).slice(0, 50) : [];
    res.json({
      distDir: DIST_DIR,
      distExists: exists,
      indexHtmlExists: indexExists,
      assetsCount: assets.length,
      assetsSample: assets,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/debug/index", (_req, res) => {
  try {
    const p = path.join(DIST_DIR, "index.html");
    const html = fs.readFileSync(p, "utf8");
    res.type("text/plain").send(html.slice(0, 2000));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.use(express.static(DIST_DIR));

app.get("/", (_req, res) => sendSpaIndex(res));

// SPA fallback (React Router): any non-API route should load index.html
app.get(/^\/(?!api\/).*/, (_req, res) => {
  return sendSpaIndex(res);
});

// Cloud-friendly bind/port
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
