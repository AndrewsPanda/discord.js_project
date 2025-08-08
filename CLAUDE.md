# Discord.js Bot Project

## Project Overview
- Production-ready Discord bot built with Discord.js v14
- Features modern deployment practices with PM2 process management
- Includes Docker support and automated deployment scripts
- Configured for secure environment variable handling
- **NEW**: Real-time server information tracking with JSON export

## Deployment Commands
- `./deploy.sh` - Main deployment script
- `npm run pm2:start` - Start with PM2
- `npm run pm2:logs` - View logs
- `npm run pm2:restart` - Restart bot

## Key Files
- `index.js` - Main bot application
- `ecosystem.config.js` - PM2 configuration
- `.env` - Environment variables (create from .env.example)
- `deploy.sh` - Automated deployment script
- **NEW**: `server_data/` - Auto-generated server information JSON files

## Bot Commands
- `!ping` - Simple ping/pong test
- `!serverinfo` - Generate comprehensive server information JSON
- `!track` - Start tracking current server for auto-updates
- `!untrack` - Stop tracking current server
- `!tracked` - List all currently tracked servers

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
- Bot uses proper Discord.js v14 intents including GuildMembers and GuildEmojisAndStickers
- Includes error handling and graceful shutdown
- Configured for production logging
- **Server data is gitignored for security**