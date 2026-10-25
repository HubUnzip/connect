// Root Entrypoint for Vercel Node.js & Message Relay API
const http = require("http");

// In-memory message store
const messages = [
  {
    id: "msg_init",
    text: "Relay initialized. Ready to receive messages!",
    sender: "System",
    time: new Date().toLocaleTimeString(),
    timestamp: Date.now()
  }
];

// Helper to parse request body
async function getRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (_) { return { message: req.body }; }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_) {
        resolve({ message: raw.trim() });
      }
    });
  });
}

// Request Handler
const handler = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = parsedUrl.pathname.replace(/\/$/, "") || "/";
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // 1. SEND MESSAGE ENDPOINT (GET or POST)
  // Example: /send?message=Hello&sender=Player1
  if (path === "/send" || path === "/api/send") {
    let text = query.message || query.msg || query.text || "";
    let sender = query.sender || query.user || query.author || "Luau";

    if (req.method === "POST") {
      const body = await getRequestBody(req);
      text = body.message || body.msg || body.text || text;
      sender = body.sender || body.user || body.author || sender;
    }

    text = String(text || "").trim();

    if (!text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Missing message. Use ?message=YourText" }));
    }

    const newMsg = {
      id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      text,
      sender,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    messages.push(newMsg);
    if (messages.length > 100) messages.shift(); // Keep last 100

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: true,
      delivered: true,
      message: newMsg
    }));
  }

  // 2. CLEAR MESSAGES ENDPOINT
  // Example: /clear
  if (path === "/clear" || path === "/api/clear") {
    messages.length = 0;
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, message: "Cleared" }));
  }

  // 3. READ MESSAGES (Default for / and /read)
  // - /read?latest=true --> Returns raw string of newest message
  // - /read?json=true   --> Returns JSON array
  // - /read or /        --> Prints plain text log on screen
  const latestMsg = messages[messages.length - 1] || { text: "No messages yet.", sender: "None", time: "" };

  if (query.latest === "true" || query.raw === "true") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    return res.end(latestMsg.text);
  }

  if (query.json === "true" || req.headers.accept?.includes("application/json")) {
    const since = parseInt(query.since) || 0;
    const filtered = since > 0 ? messages.filter(m => m.timestamp > since) : messages;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: true,
      count: filtered.length,
      latest: latestMsg,
      messages: filtered
    }));
  }

  // Default: Plain text display in browser
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=UTF-8");

  let output = `==========================================================\n`;
  output += `⚡ ROBLOX MESSAGE RELAY API (ONLINE)\n`;
  output += `Total Messages in Memory: ${messages.length}\n`;
  output += `==========================================================\n\n`;

  if (messages.length === 0) {
    output += `(No messages yet)\n\n`;
  } else {
    for (const m of messages) {
      output += `[${m.time}] ${m.sender}: ${m.text}\n`;
    }
  }

  output += `\n----------------------------------------------------------\n`;
  output += `LUAU / ROBLOX USAGE:\n`;
  output += `• Send:  game:HttpGet("${parsedUrl.origin}/send?message=Hello&sender=Player1")\n`;
  output += `• Read:  local msg = game:HttpGet("${parsedUrl.origin}/read?latest=true")\n`;
  output += `• JSON:  local data = game:HttpGet("${parsedUrl.origin}/read?json=true")\n`;
  output += `• Clear: game:HttpGet("${parsedUrl.origin}/clear")\n`;
  output += `----------------------------------------------------------\n`;

  return res.end(output);
};

// Start local server if run standalone (node index.js)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`Relay running at http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless Function
module.exports = handler;
