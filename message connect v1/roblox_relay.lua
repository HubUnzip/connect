--[[
    ========================================================================
    ⚡ ROBLOX MESSAGE RELAY - LUAU CLIENT ⚡
    ========================================================================
    Connects Roblox to your Vercel Message Relay API.
    Works in: Any Executor (Delta, Synapse, Krnl, Fluxus, etc.)
              AND Roblox Studio / Game Scripts (via HttpService).
    ========================================================================
]]

local Relay = {}

-- ⚙️ CONFIG: Put your live Vercel URL here (NO trailing slash)
Relay.SERVER_URL = "https://your-project.vercel.app"

-- Services
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local LocalPlayer = Players.LocalPlayer
local DefaultSender = LocalPlayer and LocalPlayer.Name or "RobloxPlayer"

-- Universal HTTP Fetch Helper
local function httpFetch(url, method, body)
    local req = (syn and syn.request) or (http and http.request) or request or http_request or (fluxus and fluxus.request)
    if req then
        local res = req({
            Url = url,
            Method = method or "GET",
            Headers = { ["Content-Type"] = "application/json" },
            Body = body
        })
        return res.StatusCode or 200, res.Body
    else
        -- Fallback to HttpService (Roblox Studio / Game Server)
        local success, res = pcall(function()
            if method == "POST" then
                return HttpService:PostAsync(url, body or "", Enum.HttpContentType.ApplicationJson)
            else
                return HttpService:GetAsync(url)
            end
        end)
        return success and 200 or 500, tostring(res)
    end
end

-- =========================================================================
-- 1. SEND A MESSAGE TO THE RELAY API
-- Usage: Relay.Send("Hello world!", "MyName")
-- =========================================================================
function Relay.Send(message, sender)
    sender = sender or DefaultSender
    local encodedMsg = HttpService:UrlEncode(tostring(message))
    local encodedSender = HttpService:UrlEncode(tostring(sender))
    
    local url = string.format("%s/send?message=%s&sender=%s", Relay.SERVER_URL, encodedMsg, encodedSender)
    local status, body = httpFetch(url, "GET")
    
    if status == 200 then
        print(string.format("✅ [Relay] Sent: '%s'", message))
        return true
    else
        warn(string.format("❌ [Relay] Failed to send: %s", tostring(body)))
        return false
    end
end

-- =========================================================================
-- 2. READ THE LATEST MESSAGE (Plain text string)
-- Usage: local msg = Relay.ReadLatest()
-- =========================================================================
function Relay.ReadLatest()
    local url = Relay.SERVER_URL .. "/read?latest=true"
    local status, body = httpFetch(url, "GET")
    if status == 200 then
        return body
    else
        warn("❌ [Relay] Failed to read latest: " .. tostring(body))
        return nil
    end
end

-- =========================================================================
-- 3. READ ALL MESSAGES (JSON table)
-- Usage: local messages = Relay.ReadAll()
-- =========================================================================
function Relay.ReadAll()
    local url = Relay.SERVER_URL .. "/read?json=true"
    local status, body = httpFetch(url, "GET")
    if status == 200 then
        local success, data = pcall(function()
            return HttpService:JSONDecode(body)
        end)
        if success and data and data.messages then
            return data.messages
        end
    end
    return {}
end

-- =========================================================================
-- 4. START LISTENING FOR NEW MESSAGES (Background Loop)
-- Runs a loop that prints or executes whenever a new message arrives!
-- =========================================================================
function Relay.StartListening(interval, onMessageReceived)
    interval = interval or 1.0
    local lastTimestamp = 0

    task.spawn(function()
        print("🎧 [Relay] Listening for new messages...")

        while true do
            task.wait(interval)

            pcall(function()
                local url = string.format("%s/read?json=true&since=%s", Relay.SERVER_URL, tostring(lastTimestamp))
                local status, body = httpFetch(url, "GET")

                if status == 200 and body then
                    local data = HttpService:JSONDecode(body)
                    if data and data.messages then
                        for _, msg in ipairs(data.messages) do
                            if msg.timestamp > lastTimestamp then
                                lastTimestamp = msg.timestamp
                                
                                -- Print the message
                                print(string.format("📩 [%s] %s: %s", msg.time, msg.sender, msg.text))

                                -- Trigger custom callback if provided
                                if onMessageReceived then
                                    onMessageReceived(msg.text, msg.sender, msg)
                                end
                            end
                        end
                    end
                end
            end)
        end
    end)
end

-- =========================================================================
-- 🚀 EXAMPLE QUICK START DEMO
-- =========================================================================

-- Example 1: Send a test message
Relay.Send("Hello from Luau script!", DefaultSender)

-- Example 2: Read latest message and print it
local latest = Relay.ReadLatest()
print("👉 Latest message on server is: " .. tostring(latest))

-- Example 3: Start continuous listener
Relay.StartListening(1.5, function(message, sender)
    print("⚡ New incoming message received! Content: " .. message)
    
    -- If the message is a command, execute it!
    if message:sub(1, 6) == "/print" then
        print("Printed via Remote: " .. message:sub(8))
    end
end)

return Relay
