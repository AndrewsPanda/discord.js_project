#!/bin/bash

# Discord.js Bot Deployment Script
# Make executable with: chmod +x deploy.sh

set -e

echo "🚀 Starting Discord bot deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your tokens"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2 globally..."
    npm install -g pm2
fi

# Stop existing process if running
echo "🛑 Stopping existing bot process..."
pm2 stop discord-bot 2>/dev/null || true

# Start the bot with PM2
echo "▶️  Starting bot with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot (run once)
echo "🔄 Setting up PM2 startup (you may need to run the displayed command as root)..."
pm2 startup || true

echo "✅ Deployment complete!"
echo ""
echo "📊 Useful commands:"
echo "  pm2 status           - View running processes"
echo "  pm2 logs discord-bot - View bot logs"
echo "  pm2 restart discord-bot - Restart the bot"
echo "  pm2 stop discord-bot - Stop the bot"