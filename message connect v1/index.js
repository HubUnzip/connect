// Universal Root Entrypoint for Vercel Serverless & Local Hosting
const path = require("path");
const fs = require("fs");
const http = require("http");
const apiHandler = require("./api/index.js");

const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".lua": "text/plain; charset=UTF-8"
};

// Main Request Handler
const handler = (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-secret-key");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  // 1. Route API requests to api/index.js
  if (req.url.startsWith("/api/") || req.url === "/api") {
    return apiHandler(req, res);
  }

  // 2. Serve static files from public/ directory
  const cleanUrl = req.url.split("?")[0];
  let filePath = path.join(PUBLIC_DIR, cleanUrl === "/" ? "index.html" : cleanUrl);

  // Security: prevent path traversal attacks
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Default fallback to index.html for Single Page App
      filePath = path.join(PUBLIC_DIR, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain");
        return res.end("File Not Found");
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
};

// Only listen on port if run locally via terminal (node index.js).
// On Vercel, this is skipped so the deployment never hangs!
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Roblox Web Chat Relay Running!`);
    console.log(`📡 Local URL: http://localhost:${PORT}`);
    console.log(`⚡ API: http://localhost:${PORT}/api/messages`);
    console.log(`===============================================`);
  });
}

// Export handler for Vercel Serverless Function
module.exports = handler;
