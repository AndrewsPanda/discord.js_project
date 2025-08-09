# Discord.js Bot Project with Claude Code Integration

## Project Overview
- **Production-ready Discord bot** built with Discord.js v14
- **Modern deployment practices** with PM2 process management  
- **Docker support** and automated deployment scripts
- **Secure environment variable handling**
- **Real-time server information tracking** with JSON export
- **🤖 NEW: Claude Code AI Integration** - Chat with Claude directly through Discord

## Current Development Status

### Branch: `feature/discord-claude-integration`
**Latest Work (January 2025):**
- ✅ **Comprehensive Discord-Claude integration documentation** created
- ✅ **Multiple integration approaches** researched and documented
- ✅ **Simple 5-minute setup guide** with working code
- ✅ **Advanced integration report** with production approaches
- ✅ **README updated** to showcase new AI features

### What We've Built
1. **[Simple Integration Guide](./discord-claude-simple-integration-guide.md)** - 5-minute setup
2. **[Comprehensive Integration Report](./discord-claude-integration-report.md)** - Advanced approaches
3. **Updated project documentation** reflecting AI capabilities

## Claude Code Integration Features

### 🎯 Simple Headless Integration (Ready to Implement)
**Location:** `discord-claude-simple-integration-guide.md`
- **Setup time:** 5 minutes with copy-paste code
- **Cost:** $0 (uses your Claude Code session)  
- **Method:** `Discord message` → `claude -p "message"` → `Discord response`
- **Features:** Rate limiting, error handling, message splitting, typing indicators

### 🏗️ Advanced Integration Options (Documentation Complete)
**Location:** `discord-claude-integration-report.md`
1. **Headless Mode + Piping** - Simple CLI process spawning
2. **MCP Server Integration** - Real-time bidirectional communication
3. **Memory File + Hooks** - Event-driven file-based communication
4. **Terminal Control** - Direct session interaction via tmux

## Deployment Commands
- `./deploy.sh` - Main deployment script
- `npm run pm2:start` - Start with PM2
- `npm run pm2:logs` - View logs
- `npm run pm2:restart` - Restart bot

## Key Files

### Core Bot Files
- `index.js` - Main bot application
- `ecosystem.config.js` - PM2 configuration
- `.env` - Environment variables (create from .env.example)
- `deploy.sh` - Automated deployment script
- `server_data/` - Auto-generated server information JSON files

### Claude Integration Documentation (NEW)
- **`discord-claude-simple-integration-guide.md`** - 5-minute setup with working code
- **`discord-claude-integration-report.md`** - Comprehensive integration approaches
- **`README.md`** - Updated with Claude integration features

## Bot Commands

### Core Discord Bot
- `!ping` - Simple ping/pong test
- `!serverinfo` - Generate comprehensive server information JSON
- `!track` - Start tracking current server for auto-updates
- `!untrack` - Stop tracking current server
- `!tracked` - List all currently tracked servers

### Claude AI Integration (When Implemented)
- **Chat in #claude-chat** - Direct conversation with Claude AI
- **Natural language queries** - "Help me debug this code", "Explain quantum computing"
- **Code assistance** - "Write a Python function to calculate fibonacci"
- **Built-in safety** - 3-second cooldown per user, 30-second timeout protection
- **Automatic formatting** - Code blocks, message splitting for long responses

## Integration Architecture

### Simple Approach (Recommended Start)
```
Discord User → Discord Bot → `claude -p "message"` → Claude Code → Discord User
```

### Advanced Approaches (Future Enhancement)
```
Discord Bot ↔ Custom MCP Server ↔ Claude Code Session (Real-time)
Discord Bot → Memory Files → Claude Code Hooks → Discord API (Event-driven)
Discord Bot → tmux-cli → Active Claude Code Terminal (Full session)
```

## Welcome System
- **Automatic Welcome Messages**: New members are automatically welcomed in the #welcome channel
- **Server Introduction**: Provides information about the server and community
- **Channel Redirection**: Directs new members to #general-chat to begin conversations
- **Rich Embeds**: Features attractive embedded messages with member info and join date

## Server Information Tracking
- **Automatic JSON Generation**: Server data is automatically saved to `server_data/` directory
- **Real-time Updates**: Tracked servers update JSON files when changes occur
- **Comprehensive Data**: Includes channels, roles, permissions, emojis, stickers, threads, and metadata
- **Development Ready**: JSON files are always available for Claude Code development

## Development Notes

### Core Bot Features
- Bot uses proper Discord.js v14 intents including GuildMembers and GuildEmojisAndStickers
- Includes error handling and graceful shutdown
- Configured for production logging
- **Server data is gitignored for security**

### Claude Integration Requirements
- **Node.js 18+** required
- **Claude Code CLI** must be installed and accessible (`claude --help`)
- **Message Content Intent** must be enabled in Discord Developer Portal
- **#claude-chat channel** needed for AI conversations

### Environment Variables
```bash
# Core Bot
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id

# Claude Integration (Optional)
CLAUDE_INTEGRATION_METHOD=headless  # Options: headless, mcp, memory
# No API keys needed - uses logged-in Claude Code session
```

## Implementation Status

### ✅ Completed
- **Documentation and guides** for Discord-Claude integration
- **Multiple integration approaches** researched and documented
- **Working code examples** with full implementation details
- **Project structure** and deployment considerations
- **README updates** reflecting new capabilities

### 🚧 Next Steps (To Implement)
1. **Follow the Simple Integration Guide** - Get basic integration working
2. **Test in Discord server** - Verify message flow and responses
3. **Add conversation context** - Store recent messages per user
4. **Support file attachments** - Let users upload code/text files
5. **Create slash commands** - `/claude reset`, `/claude status`, `/claude help`

### 🔮 Future Enhancements
- **MCP server development** for real-time features
- **Multi-server support** with user context database
- **Advanced conversation management** with threading
- **Production API migration** when ready for scale

## Usage Examples

### Simple Chat Integration
```
User: "Write a Python function to reverse a string"

Claude: "Here's a Python function to reverse a string:

def reverse_string(s):
    return s[::-1]

# Example usage:
result = reverse_string('hello')
print(result)  # Output: 'olleh'"
```

### Code Assistance
```
User: "Help me debug this JavaScript code: [paste code]"

Claude: [Analyzes code, identifies issues, provides fixes]
```

### Technical Questions  
```
User: "Explain the difference between let and const in JavaScript"

Claude: [Provides comprehensive explanation with examples]
```

## Project Benefits

### For Development
- **Always up-to-date server data** for Claude Code context
- **Real-time Discord insights** exported as JSON
- **AI-powered development assistance** directly in Discord
- **Zero API costs** during prototyping and testing

### For Users
- **Intelligent bot responses** beyond simple commands
- **Code help and debugging** assistance  
- **Educational support** for programming questions
- **Natural conversation** interface

## Security Considerations
- **Environment variables properly gitignored**
- **Server data directory gitignored** (contains sensitive Discord information)
- **Bot runs with minimal required permissions**
- **Rate limiting implemented** to prevent abuse
- **Input validation** for Claude integration
- **No API keys stored** (uses Claude Code session authentication)

---

**Current Status:** Documentation complete, ready for implementation following the Simple Integration Guide. The foundation is established for both basic prototyping and future production deployment with comprehensive error handling, security measures, and scalability considerations.