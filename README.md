# Discord.js Bot

A production-ready Discord bot built with Discord.js v14, featuring modern deployment practices and comprehensive process management.

## 🚀 Features

- **Discord.js v14** - Latest version with full API v10 support
- **Production Ready** - PM2 process management, error handling, graceful shutdown
- **Welcome System** - Automatic member welcome messages with server introduction
- **Real-time Server Tracking** - Automatic JSON export of comprehensive server information
- **Docker Support** - Containerized deployment option
- **Automated Deployment** - One-command deployment script
- **Comprehensive Logging** - Structured logging with PM2
- **Environment Management** - Secure token handling with dotenv
- **Development Ready** - Always up-to-date server data for Claude Code development

## 📋 Prerequisites

- Node.js 18+ (LTS recommended)
- Discord Application with Bot Token
- PM2 (installed automatically by deploy script)

## 🔧 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd discord.js_project
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Discord bot credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
NODE_ENV=production
```

### 3. Deploy

```bash
./deploy.sh
```

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
| `npm run pm2:start` | Start with PM2 process manager |
| `npm run pm2:stop` | Stop PM2 process |
| `npm run pm2:restart` | Restart PM2 process |
| `npm run pm2:logs` | View PM2 logs |

## 🐳 Docker Deployment

### Build and Run

```bash
docker build -t discord-bot .
docker run -d --env-file .env --name discord-bot discord-bot
```

### Docker Compose (Optional)

```yaml
version: '3.8'
services:
  discord-bot:
    build: .
    env_file: .env
    restart: unless-stopped
```

## 📊 Process Management

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs discord-bot

# Restart bot
pm2 restart discord-bot

# Stop bot
pm2 stop discord-bot

# Monitor resources
pm2 monit
```

### Auto-start on Boot

After running `./deploy.sh`, execute the command shown by PM2:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
```

## 🔧 Configuration

### Bot Intents

Current intents configured in `index.js`:

- `GatewayIntentBits.Guilds` - Basic guild information
- `GatewayIntentBits.GuildMessages` - Message events
- `GatewayIntentBits.MessageContent` - Message content access
- `GatewayIntentBits.GuildMembers` - Member information and counts
- `GatewayIntentBits.GuildEmojisAndStickers` - Custom emojis and stickers

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | ✅ |
| `CLIENT_ID` | Application ID from Discord Developer Portal | ✅ |
| `NODE_ENV` | Environment (development/production) | ✅ |
| `GUILD_ID` | Test guild ID for development commands | ❌ |

## 📁 Project Structure

```
discord.js_project/
├── index.js              # Main bot file
├── ecosystem.config.js   # PM2 configuration
├── deploy.sh            # Deployment script
├── Dockerfile           # Container configuration
├── .env.example         # Environment template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── CLAUDE.md          # Project instructions for Claude Code
├── logs/              # PM2 log files
├── server_data/       # Auto-generated server information (gitignored)
│   ├── tracked_servers.json
│   └── {guildId}_{guildName}_server_info.json
└── README.md          # This file
```

## 🤖 Bot Commands

### Basic Commands
- `!ping` - Responds with "Pong!" for testing bot connectivity

### Welcome System
- **Automatic Welcome Messages** - New members are automatically greeted when they join the server
  - Sends rich embedded messages in designated welcome channel
  - Includes server introduction and community information
  - Directs new members to general chat channel to begin conversations
  - Shows member count, join date, and personalized information
  - Integrates with server tracking system for member count updates

### Server Information & Tracking
- `!serverinfo` - Generate comprehensive server information as JSON
  - Includes channels, roles, permissions, emojis, stickers, threads
  - Automatically saves to `server_data/` directory
  - Sends as Discord attachment if too large for message
- `!track` - Start tracking current server for automatic updates
  - Enables real-time JSON updates when server changes
  - Creates initial server data file
- `!untrack` - Stop tracking current server
  - Preserves existing data files
- `!tracked` - List all currently tracked servers
  - Shows server names and IDs

### Server Tracking Features

**Automatic Updates Triggered By:**
- Server settings changes (name, description, verification level, etc.)
- Channel operations (create, update, delete, permission changes)
- Role operations (create, update, delete, permission changes)
- Custom emoji operations (add, modify, remove)
- Custom sticker operations (add, modify, remove)
- Thread operations (create, archive, delete)

**Update Schedule:**
- Real-time updates on tracked events
- Periodic updates every 30 minutes
- Full refresh on bot startup

**Data Format:**
All server data includes metadata:
```json
{
  "basicInfo": { /* server details */ },
  "channels": [ /* all channels with permissions */ ],
  "categories": [ /* channel categories */ ],
  "roles": [ /* roles with permissions */ ],
  "emojis": [ /* custom emojis */ ],
  "stickers": [ /* custom stickers */ ],
  "threads": [ /* active and archived threads */ ],
  "metadata": {
    "lastUpdated": "2025-01-08T...",
    "guildId": "123456789",
    "guildName": "Server Name",
    "updateReason": "Real-time update"
  }
}
```

## 🚢 Deployment Options

### 1. VPS Deployment (Recommended)

1. Upload files to your server
2. Run `./deploy.sh`
3. Bot runs automatically with PM2

### 2. Platform-as-a-Service

- **Railway.app**: Connect GitHub repo, auto-deploys
- **Heroku**: Use `npm start` as start command
- **DigitalOcean App Platform**: Deploy directly from GitHub

### 3. Container Deployment

- Docker with provided Dockerfile
- Kubernetes with custom manifests
- Any container orchestration platform

## 🔒 Security

- Environment variables are properly ignored by git
- **Server data directory is gitignored** - Contains sensitive Discord server information
- Bot runs as non-root user in Docker
- Graceful shutdown handling
- Comprehensive error handling
- No sensitive data in logs
- Only tracks servers explicitly added via `!track` command

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
```bash
pm2 logs discord-bot
```

**Permission errors:**
- Check bot permissions in Discord server
- Verify token in `.env` file

**Deployment fails:**
- Ensure Node.js 18+ is installed
- Check file permissions: `chmod +x deploy.sh`

### Log Locations

- PM2 logs: `./logs/`
- Combined: `./logs/combined.log`
- Errors: `./logs/err.log`
- Output: `./logs/out.log`

### Server Data Files

- Server data: `./server_data/`
- Tracked servers list: `./server_data/tracked_servers.json`
- Individual server files: `./server_data/{guildId}_{guildName}_server_info.json`

**Note:** Server data directory is automatically gitignored for security.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

ISC License - See package.json for details

## 🔧 Development with Claude Code

This bot is designed to work seamlessly with Claude Code development:

### Server Data Access
- All tracked server information is automatically saved to `server_data/` directory
- JSON files are always up-to-date with real-time server changes
- Comprehensive data includes all channels, roles, permissions, and Discord features
- Use `!track` in any server to start collecting development data

### Development Workflow
1. Use `!track` in your test Discord server
2. Server data is automatically saved to `server_data/{guildId}_{guildName}_server_info.json`
3. Claude Code can access this data for context-aware development
4. Data updates automatically when you make changes to the Discord server

This ensures Claude Code always has current, comprehensive information about your Discord server structure for accurate development assistance.

## 🔗 Useful Links

- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Releases](https://nodejs.org/en/about/releases/)

---

**Made with ❤️ using Discord.js v14 | Enhanced with Real-time Server Tracking**