# Discord.js Bot

A production-ready Discord bot built with Discord.js v14, featuring automatic welcome messages, real-time server tracking, and comprehensive process management.

## 🚀 Key Features

- **Discord.js v14** - Latest API v10 support with modern JavaScript patterns
- **Welcome System** - Automatic member welcome with rich embeds and server introduction  
- **Real-time Server Tracking** - Automatic JSON export of comprehensive server data
- **Production Ready** - PM2 process management, error handling, graceful shutdown
- **Multiple Deployment Options** - VPS, Docker, Platform-as-a-Service support
- **Development Integration** - Always up-to-date server data for Claude Code development

## 📖 Table of Contents

- [Quick Start](#-quick-start)
- [Bot Commands](#-bot-commands)
- [Deployment Guide](#-deployment-guide)
- [Configuration](#-configuration)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [Advanced Topics](#-advanced-topics)

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, Discord Bot Token

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` with your Discord credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here  
NODE_ENV=production
```

### 3. Start the Bot
```bash
# For testing (stops when terminal closes)
npm start

# For production (keeps running)
./deploy.sh
```

That's it! Your bot should now be online and ready to use.

## 🤖 Bot Commands

### Basic Commands
- `!ping` - Test bot connectivity (responds with "Pong!")

### Welcome System (Automatic)
- **Auto-welcomes new members** in designated welcome channel
- **Rich embedded messages** with member info and join date
- **Server introduction** and community information
- **Channel redirection** to general chat for new conversations

### Server Information & Tracking
- `!serverinfo` - Generate comprehensive server data as JSON file
- `!track` - Start real-time tracking of current server
- `!untrack` - Stop tracking current server (preserves data)
- `!tracked` - List all currently tracked servers

**Automatic Updates Triggered By:**
- Server settings changes (name, description, verification, etc.)
- Channel/role operations (create, update, delete, permissions)
- Custom emoji/sticker operations (add, modify, remove)
- Thread operations (create, archive, delete)

## 🚢 Deployment Guide

Choose the method that best fits your needs:

### Method 1: Quick Testing
**When to use:** Local development, testing changes
```bash
npm start
```
- ✅ Simple and immediate
- ❌ Stops when terminal closes
- ❌ No automatic restart

### Method 2: Production VPS (Recommended)
**When to use:** Long-term server deployment, VPS hosting
```bash
./deploy.sh
```
- ✅ Automatic PM2 setup and configuration
- ✅ Auto-restart on crashes and server reboot
- ✅ Process monitoring and logging
- ✅ One-command setup

### Method 3: Platform-as-a-Service  
**When to use:** Railway.app, Heroku, DigitalOcean App Platform
```bash
# Use npm start as your start command
npm start
```
- ✅ Managed infrastructure
- ✅ Git-based deployments
- ❌ More expensive for 24/7 bots

### Method 4: Docker/Containers
**When to use:** Container orchestration, multiple bots, isolation
```bash
docker build -t discord-bot .
docker run -d --env-file .env discord-bot
```
- ✅ Isolated environment
- ✅ Consistent deployments
- ❌ More complex setup

## 🔧 Configuration

### Required Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | `MTIzNDU2Nzg5...` |
| `CLIENT_ID` | Application ID from Discord Developer Portal | `1234567890123456789` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Environment Variables  
| Variable | Description | Default |
|----------|-------------|---------|
| `GUILD_ID` | Test guild ID for development commands | None |

### Bot Permissions & Intents
The bot requires these Discord intents (configured automatically):
- **Guilds** - Basic server information
- **GuildMessages** - Message events and commands  
- **MessageContent** - Read message content
- **GuildMembers** - Welcome system and member counts
- **GuildEmojisAndStickers** - Custom emoji/sticker tracking

## 🛠️ Development

### Local Development
```bash
npm run dev
```

### Available Scripts
| Command | Description |
|---------|-------------|
| `npm start` | Start bot normally |
| `npm run dev` | Start in development mode |
| `npm run pm2:start` | Start with PM2 |
| `npm run pm2:stop` | Stop PM2 process |
| `npm run pm2:restart` | Restart after code changes |
| `npm run pm2:logs` | View live logs |

### Server Data for Development
This bot automatically generates comprehensive server data for Claude Code development:

1. **Track a server**: Use `!track` in your test Discord server
2. **Data location**: `server_data/{guildId}_{guildName}_server_info.json`
3. **Auto-updates**: Real-time updates when Discord server changes
4. **Claude Code ready**: Always current data for context-aware development

## 🐛 Troubleshooting

### Bot Not Responding
```bash
# Check if bot is running
pm2 status

# View error logs  
pm2 logs discord-bot
```

### Common Issues

**Permission Errors**
- Verify bot has proper Discord server permissions
- Check `DISCORD_TOKEN` in `.env` file
- Ensure bot is invited with correct scopes

**Deploy Script Fails**
```bash
# Make script executable
chmod +x deploy.sh

# Fix line endings (Windows users)
sed -i 's/\r$//' deploy.sh
```

**Node.js Version Issues**
- Ensure Node.js 18+ is installed
- Use `node --version` to check current version

### Log Locations
- **PM2 logs**: `./logs/` directory
- **Combined output**: `./logs/combined.log`
- **Errors only**: `./logs/err.log`
- **Standard output**: `./logs/out.log`

## 📁 Project Structure

```
discord.js_project/
├── index.js              # Main bot application
├── package.json          # Dependencies and npm scripts
├── ecosystem.config.js   # PM2 process configuration
├── deploy.sh            # Automated deployment script
├── Dockerfile           # Container configuration
├── .env.example         # Environment variable template
├── .gitignore          # Git ignore rules
├── CLAUDE.md           # Claude Code instructions
├── logs/               # PM2 log files (auto-generated)
├── server_data/        # Server information JSON files (gitignored)
│   ├── tracked_servers.json
│   └── {guildId}_{guildName}_server_info.json
└── README.md           # This documentation
```

## 🔧 Advanced Topics

### Process Management with PM2

After running `./deploy.sh`, manage your bot with:

```bash
# Monitor status
pm2 status
pm2 monit                # Resource usage dashboard

# Control processes  
pm2 restart discord-bot  # Restart after changes
pm2 stop discord-bot     # Stop the bot
pm2 delete discord-bot   # Remove from PM2

# Logs and debugging
pm2 logs discord-bot     # View live logs
pm2 logs --lines 100     # Show last 100 lines
```

### Auto-start on Server Boot

The deploy script configures PM2 to start automatically on server reboot:

```bash
# This is run automatically by deploy.sh
pm2 startup
pm2 save
```

### Docker Compose (Advanced)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  discord-bot:
    build: .
    env_file: .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
      - ./server_data:/app/server_data
```

Run with:
```bash
docker-compose up -d
```

### Server Data Format

All server information is saved in structured JSON format:

```json
{
  "basicInfo": {
    "id": "123456789",
    "name": "My Discord Server",
    "memberCount": 150,
    "verificationLevel": "MEDIUM"
  },
  "channels": [
    {
      "id": "987654321", 
      "name": "general",
      "type": "GUILD_TEXT",
      "permissions": [...]
    }
  ],
  "roles": [...],
  "emojis": [...],
  "stickers": [...],
  "threads": [...],
  "metadata": {
    "lastUpdated": "2025-01-08T12:00:00.000Z",
    "updateReason": "Real-time update",
    "guildId": "123456789"
  }
}
```

## 🔒 Security

- Environment variables properly gitignored
- Server data directory gitignored (contains sensitive Discord information)
- Bot runs as non-root user in Docker
- Graceful shutdown handling prevents data corruption
- Comprehensive error handling prevents crashes
- No sensitive data logged

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with `npm start`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📚 Resources

- [Discord.js Guide](https://discordjs.guide/) - Complete Discord.js documentation
- [Discord Developer Portal](https://discord.com/developers/applications) - Create and manage Discord applications
- [PM2 Documentation](https://pm2.keymetrics.io/docs/) - Process manager documentation
- [Node.js Releases](https://nodejs.org/en/about/releases/) - Node.js version information

---

**Made with ❤️ using Discord.js v14 | Enhanced with Real-time Server Tracking**