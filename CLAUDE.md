# Discord.js Bot Project

## Project Overview
- Production-ready Discord bot built with Discord.js v14
- Features modern deployment practices with PM2 process management
- Includes Docker support and automated deployment scripts
- Configured for secure environment variable handling

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

## Development Notes
- Bot responds to `!ping` command
- Uses proper Discord.js v14 intents
- Includes error handling and graceful shutdown
- Configured for production logging