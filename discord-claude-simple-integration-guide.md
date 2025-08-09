# Discord ↔ Claude Code Simple Integration Guide

> **🎯 5-minute setup** | **🎆 Zero cost** | **✨ Just works**

## Overview: Headless Mode + Piping

This guide implements the **simplest possible** Discord to Claude Code integration using the headless piping approach:

```
Discord User → Discord Bot → `claude -p "message"` → Discord User
```

**Why This Approach:**
- ✅ Zero API costs (uses your logged-in Claude Code session)  
- ✅ 5-minute setup time
- ✅ Perfect for prototyping and experimentation
- ✅ Uses familiar Discord.js and Claude CLI commands

## Prerequisites Checklist (2 minutes)

**Before starting, make sure you have:**

- [ ] **Node.js 18+** installed (`node --version` shows v18+)
- [ ] **Discord bot** created with token from [Discord Developer Portal](https://discord.com/developers/applications)
- [ ] **Claude Code** installed and working (`claude --help` succeeds)  
- [ ] **#claude-chat channel** created in your Discord server
- [ ] **Message Content Intent** enabled for your bot (required for reading messages)

## Step-by-Step Implementation

### Step 1: Project Setup (2 minutes)

```bash
# Create project directory
mkdir discord-claude-bot
cd discord-claude-bot

# Initialize npm project
npm init -y

# Install only required dependencies
npm install discord.js dotenv

# Create environment file
echo "DISCORD_TOKEN=your_bot_token_here" > .env

# Test Claude Code access
claude -p "Hello, testing CLI access"
```

### Step 2: Create the Bot (index.js)

Create `index.js` with this **exact code**:

```javascript
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { spawn } = require('child_process');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// User cooldowns to prevent spam
const userCooldowns = new Map();
const COOLDOWN_MS = 3000; // 3 seconds between messages per user

// Bot ready
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot logged in as ${client.user.tag}!`);
    console.log(`💬 Listening for messages in #claude-chat channels`);
});

// Message handler
client.on(Events.MessageCreate, async (message) => {
    // Ignore bots
    if (message.author.bot) return;
    
    // Only respond in #claude-chat channels
    if (message.channel.name !== 'claude-chat') return;
    
    // Simple rate limiting
    const userId = message.author.id;
    const now = Date.now();
    const cooldownEnd = userCooldowns.get(userId);
    
    if (cooldownEnd && now < cooldownEnd) {
        const timeLeft = Math.ceil((cooldownEnd - now) / 1000);
        return message.reply(`⏳ Please wait ${timeLeft}s before sending another message.`);
    }
    
    // Set cooldown
    userCooldowns.set(userId, now + COOLDOWN_MS);
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    try {
        // Process message with Claude Code
        const response = await processWithClaude(message.content);
        
        // Send response (split if too long)
        await sendResponse(message, response);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await message.reply('❌ Sorry, I encountered an error processing your message.');
    }
});

// Process message with Claude Code CLI
function processWithClaude(messageContent) {
    return new Promise((resolve, reject) => {
        console.log('🤖 Processing with Claude:', messageContent.substring(0, 50) + '...');
        
        // Spawn Claude process
        const claudeProcess = spawn('claude', [
            '-p', messageContent,
            '--output-format', 'json',
            '--max-turns', '1'  // Prevent infinite loops
        ]);
        
        let stdout = '';
        let stderr = '';
        
        claudeProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        claudeProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        claudeProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Parse JSON response
                    const parsed = JSON.parse(stdout);
                    const response = parsed.response || stdout;
                    console.log('✅ Claude responded:', response.substring(0, 50) + '...');
                    resolve(response);
                } catch (parseError) {
                    // Fallback to raw stdout if JSON parsing fails
                    console.log('⚠️  JSON parse failed, using raw output');
                    resolve(stdout || 'No response received');
                }
            } else {
                reject(new Error(`Claude process failed (code ${code}): ${stderr}`));
            }
        });
        
        // Timeout after 30 seconds
        const timeout = setTimeout(() => {
            claudeProcess.kill('SIGTERM');
            reject(new Error('Claude process timed out after 30 seconds'));
        }, 30000);
        
        claudeProcess.on('close', () => {
            clearTimeout(timeout);
        });
    });
}

// Send response, splitting if needed
async function sendResponse(message, response) {
    const MAX_LENGTH = 2000;
    
    if (response.length <= MAX_LENGTH) {
        await message.reply(response);
    } else {
        // Split long responses
        const chunks = [];
        for (let i = 0; i < response.length; i += MAX_LENGTH) {
            chunks.push(response.substring(i, i + MAX_LENGTH));
        }
        
        for (let i = 0; i < chunks.length; i++) {
            const prefix = i === 0 ? '' : `(${i + 1}/${chunks.length}) `;
            if (i === 0) {
                await message.reply(prefix + chunks[i]);
            } else {
                await message.channel.send(prefix + chunks[i]);
            }
        }
    }
}

// Error handling
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled rejection:', error);
});

// Start bot
client.login(process.env.DISCORD_TOKEN);
```

### Step 3: Configure Environment

Edit `.env` file:
```bash
DISCORD_TOKEN=your_actual_discord_bot_token
```

### Step 4: Set Up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section
4. Copy the bot token to your `.env` file
5. Enable these **Privileged Gateway Intents**:
   - [ ] Message Content Intent (**Required**)
6. Go to OAuth2 > URL Generator:
   - [x] `bot` scope
   - [x] `Send Messages` permission
   - [x] `Read Message History` permission
7. Use the generated URL to add bot to your server

### Step 5: Test the Integration

```bash
# Test Claude CLI access first
claude -p "Say hello" --output-format json

# Start the bot
node index.js
```

You should see:
```
✅ Bot logged in as YourBot#1234!
💬 Listening for messages in #claude-chat channels
```

### Step 6: Test in Discord

1. Go to your `#claude-chat` channel
2. Send a message: `Hello Claude!`
3. The bot should:
   - Show typing indicator
   - Respond with Claude's answer
   - Log the interaction in console

## How It Works (The Magic Explained)

```javascript
// 1. Discord user sends message
"Help me write a Python function"

// 2. Bot spawns Claude CLI process  
spawn('claude', ['-p', 'Help me write a Python function', '--output-format', 'json'])

// 3. Claude processes and responds via stdout
{"response": "Here's a simple Python function:\n\ndef greet(name):\n    return f'Hello, {name}!'"}

// 4. Bot parses JSON and sends to Discord
message.reply("Here's a simple Python function:\n\ndef greet(name):\n    return f'Hello, {name}!'")
```

## Troubleshooting

### "Claude command not found"
```bash
# Check if Claude is in PATH
which claude

# If not found, add to PATH or use full path in spawn command
const claudeProcess = spawn('/full/path/to/claude', [...]);
```

### "Missing Access"
- Ensure **Message Content Intent** is enabled in Discord Developer Portal
- Check bot has permissions in your server

### "JSON parse error"  
The bot automatically falls back to raw text output if JSON parsing fails.

### "Rate limiting"
The bot has built-in 3-second cooldown per user to prevent spam.

## Next Steps (Optional Enhancements)

**Keep it simple, but if you want to add features:**

1. **Better Context** - Store recent messages per user
2. **File Support** - Process Discord attachments  
3. **Commands** - Add `/reset` command to clear context
4. **Multiple Channels** - Support different Claude personalities per channel

## Complete File Structure

```
discord-claude-bot/
├── .env                 # Discord bot token
├── index.js            # Main bot code
├── package.json        # NPM configuration  
└── package-lock.json   # Dependency lock
```

## That's It!

You now have a working Discord ↔ Claude Code integration using the simplest possible approach. The bot:

- ✅ Listens in `#claude-chat` channels only
- ✅ Processes messages through your Claude Code session  
- ✅ Handles long responses by splitting them
- ✅ Has basic rate limiting and error handling
- ✅ Uses zero API credits (leverages your Claude Code session)

Perfect for prototyping, experimenting, and getting started with Discord AI integration!

---

## What You Just Built

🎉 **Congratulations!** You now have:

- **Discord bot** that responds to messages in `#claude-chat`
- **Claude Code integration** using your existing session (no API costs!)
- **Rate limiting** to prevent spam (3-second cooldown per user)
- **Error handling** with graceful fallbacks
- **Long message support** (automatically splits responses)
- **JSON parsing** with plaintext fallback
- **Process timeout** protection (30-second limit)
- **Real-time typing indicators** for better UX

## Example Interactions

```
User: "Write a Python function to calculate fibonacci"

Bot: "Here's a Python function to calculate Fibonacci numbers:

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# More efficient iterative version:
def fibonacci_iterative(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b"
```

```
User: "What's the weather like?"

Bot: "I don't have access to real-time weather data, but I can help you:
1. Create a weather app using APIs like OpenWeatherMap
2. Write code to fetch weather data
3. Set up weather notifications

Would you like me to help with any of these?"
```

**Happy coding! 🎉** You've built something awesome - now go experiment and have fun with it!