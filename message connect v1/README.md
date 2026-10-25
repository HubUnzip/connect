# ⚡ Roblox Message Relay API

A lightweight, zero-frontend message relay API hosted on **Vercel** (`*.vercel.app`) designed specifically for **Roblox Luau scripts** to send and read messages.

---

## 🌟 How It Works

- **No frontend / No heavy pages**: Visiting your website URL simply prints the relayed message log in plain text.
- **Send Message API**: Luau script (or browser) sends a message via HTTP GET or POST.
- **Read Message API**: Luau script reads the newest message or full chat history and prints it in Roblox.

---

## 📡 API Endpoints

### 1. Send Message
- **URL**: `https://your-app.vercel.app/send`
- **Methods**: `GET` or `POST`
- **GET Example**:
  ```text
  https://your-app.vercel.app/send?message=Hello+Roblox&sender=Player1
  ```
- **POST Example** (JSON Body):
  ```json
  {
    "message": "Hello Roblox!",
    "sender": "Player1"
  }
  ```

### 2. Read Latest Message (Plain Text String)
- **URL**: `https://your-app.vercel.app/read?latest=true`
- **Output**: Returns only the raw message string (e.g. `Hello Roblox!`), making it effortless to read in a 1-line Luau script.

### 3. Read All Messages (JSON)
- **URL**: `https://your-app.vercel.app/read?json=true`
- **Optional**: `?since=<timestamp>` to only fetch new messages since last check.

### 4. Clear Messages
- **URL**: `https://your-app.vercel.app/clear`

---

## 🎮 Roblox Luau Usage

Open [`roblox_relay.lua`](roblox_relay.lua) and replace `Relay.SERVER_URL` with your Vercel URL:

### 1. Send a Message from Roblox:
```lua
game:HttpGet("https://your-app.vercel.app/send?message=Hello+from+game&sender=Jacob")
```

### 2. Read the Message in Roblox and Print It:
```lua
local message = game:HttpGet("https://your-app.vercel.app/read?latest=true")
print("New message from web: " .. tostring(message))
```

### 3. Continuous Listener Loop:
```lua
local Relay = loadstring(game:HttpGet("https://raw.githubusercontent.com/.../roblox_relay.lua"))()

Relay.StartListening(1.0, function(text, sender)
    print(string.format("[%s]: %s", sender, text))
end)
```
