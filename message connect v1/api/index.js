// Minimalist Roblox Message Relay API for Vercel
// Stores & relays messages between Luau scripts, browsers, and HTTP requests

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

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = parsedUrl.pathname.replace(/^\/api/, "").replace(/\/$/, "") || "/";
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // =========================================================================
  // 1. SEND MESSAGE ENDPOINT (GET or POST)
  // Usage:
  // - GET  /send?message=Hello&sender=Player1
  // - POST /send  with Body: { "message": "Hello", "sender": "Player1" }
  // =========================================================================
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
      return res.end(JSON.stringify({ error: "Missing message parameter. Use ?message=YourText" }));
    }

    const newMsg = {
      id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      text,
      sender,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    };

    messages.push(newMsg);
    if (messages.length > 100) messages.shift(); // Keep last 100 messages

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      success: true,
      delivered: true,
      message: newMsg
    }));
  }

  // =========================================================================
  // 2. CLEAR MESSAGES ENDPOINT
  // Usage: GET /clear or POST /clear
  // =========================================================================
  if (path === "/clear" || path === "/api/clear") {
    messages.length = 0;
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true, message: "All messages cleared" }));
  }

  // =========================================================================
  // 3. READ MESSAGES ENDPOINT (Default / and /read)
  // Usage:
  // - /read?latest=true  --> Returns only the newest raw message string
  // - /read?json=true    --> Returns JSON array of all messages
  // - /read or /         --> Prints messages in clean plain text
  // =========================================================================
  const latestMsg = messages[messages.length - 1] || { text: "No messages yet.", sender: "None", time: "" };

  // Option A: Raw latest message string (Easiest for simple Luau scripts)
  if (query.latest === "true" || query.raw === "true") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    return res.end(latestMsg.text);
  }

  // Option B: JSON Format
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

  // Option C: Default Clean Terminal / Plain Text Display
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=UTF-8");

  let output = `==========================================================\n`;
  output += `⚡ ROBLOX MESSAGE RELAY API (ONLINE)\n`;
  output += `Total Messages in Memory: ${messages.length}\n`;
  output += `==========================================================\n\n`;

  if (messages.length === 0) {
    output += `(No messages have been sent yet)\n\n`;
  } else {
    for (const m of messages) {
      output += `[${m.time}] ${m.sender}: ${m.text}\n`;
    }
  }

  output += `\n----------------------------------------------------------\n`;
  output += `HOW TO USE WITH LUAU / ROBLOX:\n`;
  output += `• Send:   game:HttpGet("${parsedUrl.origin}/send?message=Hello&sender=MyPlayer")\n`;
  output += `• Read:   local msg = game:HttpGet("${parsedUrl.origin}/read?latest=true")\n`;
  output += `• JSON:   local data = game:HttpGet("${parsedUrl.origin}/read?json=true")\n`;
  output += `• Clear:  game:HttpGet("${parsedUrl.origin}/clear")\n`;
  output += `----------------------------------------------------------\n`;

  return res.end(output);
};
