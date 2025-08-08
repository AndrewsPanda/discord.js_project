require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
    ],
});

// Server data management
const SERVER_DATA_DIR = path.join(__dirname, 'server_data');
const TRACKED_SERVERS_FILE = path.join(SERVER_DATA_DIR, 'tracked_servers.json');

// Ensure server data directory exists
if (!fs.existsSync(SERVER_DATA_DIR)) {
    fs.mkdirSync(SERVER_DATA_DIR, { recursive: true });
    console.log('📁 Created server_data directory');
}

// Load tracked servers list
function loadTrackedServers() {
    try {
        if (fs.existsSync(TRACKED_SERVERS_FILE)) {
            const data = fs.readFileSync(TRACKED_SERVERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading tracked servers:', error);
    }
    return [];
}

// Save tracked servers list
function saveTrackedServers(trackedServers) {
    try {
        fs.writeFileSync(TRACKED_SERVERS_FILE, JSON.stringify(trackedServers, null, 2));
    } catch (error) {
        console.error('Error saving tracked servers:', error);
    }
}

// Save server info to JSON file
async function saveServerInfoToFile(guild, serverInfo = null) {
    try {
        const fileName = `${guild.id}_${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_server_info.json`;
        const filePath = path.join(SERVER_DATA_DIR, fileName);
        
        if (!serverInfo) {
            serverInfo = await getComprehensiveGuildInfo(guild);
        }
        
        // Add metadata
        const dataWithMetadata = {
            ...serverInfo,
            metadata: {
                lastUpdated: new Date().toISOString(),
                guildId: guild.id,
                guildName: guild.name,
                updateReason: 'Automatic update'
            }
        };
        
        fs.writeFileSync(filePath, JSON.stringify(dataWithMetadata, null, 2));
        console.log(`💾 Saved server info for: ${guild.name} -> ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error saving server info for ${guild.name}:`, error);
        return null;
    }
}

// Update server info for all tracked servers
async function updateAllTrackedServers(reason = 'Scheduled update') {
    const trackedServers = loadTrackedServers();
    console.log(`🔄 Updating ${trackedServers.length} tracked servers (${reason})`);
    
    for (const guildId of trackedServers) {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const serverInfo = await getComprehensiveGuildInfo(guild);
                await saveServerInfoToFile(guild, serverInfo);
            } else {
                console.log(`⚠️  Guild ${guildId} not found in cache`);
            }
        } catch (error) {
            console.error(`Error updating server ${guildId}:`, error);
        }
    }
}

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online and ready!`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
    
    // Set bot status
    client.user.setActivity('!ping | !serverinfo | !track | !tracked', { type: ActivityType.Listening });
    
    // Initialize tracked servers on startup
    const trackedServers = loadTrackedServers();
    if (trackedServers.length > 0) {
        console.log(`🔍 Found ${trackedServers.length} tracked servers, updating initial data...`);
        await updateAllTrackedServers('Bot startup');
    }
    
    // Set up periodic updates every 30 minutes
    setInterval(async () => {
        await updateAllTrackedServers('Periodic update');
    }, 30 * 60 * 1000);
});

// Event listeners for real-time server updates
client.on('guildUpdate', async (oldGuild, newGuild) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(newGuild.id)) {
        console.log(`🔄 Guild updated: ${newGuild.name}`);
        await saveServerInfoToFile(newGuild);
    }
});

client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(channel.guild.id)) {
        console.log(`📝 Channel created in ${channel.guild.name}: ${channel.name}`);
        await saveServerInfoToFile(channel.guild);
    }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(newChannel.guild.id)) {
        console.log(`📝 Channel updated in ${newChannel.guild.name}: ${newChannel.name}`);
        await saveServerInfoToFile(newChannel.guild);
    }
});

client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(channel.guild.id)) {
        console.log(`🗑️ Channel deleted in ${channel.guild.name}: ${channel.name}`);
        await saveServerInfoToFile(channel.guild);
    }
});

client.on('roleCreate', async (role) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(role.guild.id)) {
        console.log(`👑 Role created in ${role.guild.name}: ${role.name}`);
        await saveServerInfoToFile(role.guild);
    }
});

client.on('roleUpdate', async (oldRole, newRole) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(newRole.guild.id)) {
        console.log(`👑 Role updated in ${newRole.guild.name}: ${newRole.name}`);
        await saveServerInfoToFile(newRole.guild);
    }
});

client.on('roleDelete', async (role) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(role.guild.id)) {
        console.log(`👑 Role deleted in ${role.guild.name}: ${role.name}`);
        await saveServerInfoToFile(role.guild);
    }
});

client.on('emojiCreate', async (emoji) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(emoji.guild.id)) {
        console.log(`😀 Emoji created in ${emoji.guild.name}: ${emoji.name}`);
        await saveServerInfoToFile(emoji.guild);
    }
});

client.on('emojiUpdate', async (oldEmoji, newEmoji) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(newEmoji.guild.id)) {
        console.log(`😀 Emoji updated in ${newEmoji.guild.name}: ${newEmoji.name}`);
        await saveServerInfoToFile(newEmoji.guild);
    }
});

client.on('emojiDelete', async (emoji) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(emoji.guild.id)) {
        console.log(`😀 Emoji deleted in ${emoji.guild.name}: ${emoji.name}`);
        await saveServerInfoToFile(emoji.guild);
    }
});

client.on('stickerCreate', async (sticker) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(sticker.guild.id)) {
        console.log(`🔖 Sticker created in ${sticker.guild.name}: ${sticker.name}`);
        await saveServerInfoToFile(sticker.guild);
    }
});

client.on('stickerUpdate', async (oldSticker, newSticker) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(newSticker.guild.id)) {
        console.log(`🔖 Sticker updated in ${newSticker.guild.name}: ${newSticker.name}`);
        await saveServerInfoToFile(newSticker.guild);
    }
});

client.on('stickerDelete', async (sticker) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(sticker.guild.id)) {
        console.log(`🔖 Sticker deleted in ${sticker.guild.name}: ${sticker.name}`);
        await saveServerInfoToFile(sticker.guild);
    }
});

client.on('threadCreate', async (thread) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(thread.guild.id)) {
        console.log(`🧵 Thread created in ${thread.guild.name}: ${thread.name}`);
        await saveServerInfoToFile(thread.guild);
    }
});

client.on('threadUpdate', async (oldThread, newThread) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(newThread.guild.id)) {
        console.log(`🧵 Thread updated in ${newThread.guild.name}: ${newThread.name}`);
        await saveServerInfoToFile(newThread.guild);
    }
});

client.on('threadDelete', async (thread) => {
    const trackedServers = loadTrackedServers();
    if (trackedServers.includes(thread.guild.id)) {
        console.log(`🧵 Thread deleted in ${thread.guild.name}: ${thread.name}`);
        await saveServerInfoToFile(thread.guild);
    }
});

async function getComprehensiveGuildInfo(guild) {
    try {
        // Fetch threads from all channels
        const allThreads = [];
        for (const channel of guild.channels.cache.values()) {
            if (channel.isTextBased() && channel.threads) {
                try {
                    const archivedThreads = await channel.threads.fetchArchived();
                    allThreads.push(...archivedThreads.threads.values());
                } catch (error) {
                    console.log(`Could not fetch threads for channel ${channel.name}: ${error.message}`);
                }
            }
        }

        const activeThreads = await guild.channels.fetchActiveThreads();
        const allThreadsArray = [...activeThreads.threads.values(), ...allThreads];

        return {
            basicInfo: {
                id: guild.id,
                name: guild.name,
                description: guild.description,
                icon: guild.icon,
                iconURL: guild.iconURL({ size: 512 }),
                banner: guild.banner,
                bannerURL: guild.bannerURL({ size: 1024 }),
                memberCount: guild.memberCount,
                approximateMemberCount: guild.approximateMemberCount,
                ownerId: guild.ownerId,
                verificationLevel: guild.verificationLevel,
                explicitContentFilter: guild.explicitContentFilter,
                defaultMessageNotifications: guild.defaultMessageNotifications,
                mfaLevel: guild.mfaLevel,
                nsfwLevel: guild.nsfwLevel,
                premiumTier: guild.premiumTier,
                premiumSubscriptionCount: guild.premiumSubscriptionCount,
                preferredLocale: guild.preferredLocale,
                createdAt: guild.createdAt,
                features: guild.features,
                systemChannelId: guild.systemChannelId,
                rulesChannelId: guild.rulesChannelId,
                publicUpdatesChannelId: guild.publicUpdatesChannelId,
                afkChannelId: guild.afkChannelId,
                afkTimeout: guild.afkTimeout
            },
            
            channels: guild.channels.cache.map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                typeName: channel.constructor.name,
                position: channel.position,
                parentId: channel.parentId,
                parent: channel.parent?.name,
                topic: channel.topic,
                nsfw: channel.nsfw,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                rtcRegion: channel.rtcRegion,
                rateLimitPerUser: channel.rateLimitPerUser,
                defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration,
                permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.toArray(),
                    deny: overwrite.deny.toArray()
                })),
                createdAt: channel.createdAt,
                manageable: channel.manageable,
                deletable: channel.deletable,
                viewable: channel.viewable
            })),
            
            categories: guild.channels.cache.filter(channel => channel.type === 4).map(category => ({
                id: category.id,
                name: category.name,
                position: category.position,
                children: guild.channels.cache.filter(channel => channel.parentId === category.id).map(child => ({
                    id: child.id,
                    name: child.name,
                    type: child.type
                })),
                permissionOverwrites: category.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.toArray(),
                    deny: overwrite.deny.toArray()
                })),
                createdAt: category.createdAt
            })),
            
            roles: guild.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.color,
                hexColor: role.hexColor,
                position: role.position,
                rawPosition: role.rawPosition,
                hoist: role.hoist,
                mentionable: role.mentionable,
                managed: role.managed,
                icon: role.icon,
                iconURL: role.iconURL(),
                unicodeEmoji: role.unicodeEmoji,
                permissions: role.permissions.toArray(),
                permissionsBitfield: role.permissions.bitfield.toString(),
                createdAt: role.createdAt,
                editable: role.editable,
                memberCount: role.members.size
            })),
            
            emojis: guild.emojis.cache.map(emoji => ({
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated,
                available: emoji.available,
                managed: emoji.managed,
                requireColons: emoji.requireColons,
                url: emoji.url,
                roles: emoji.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name
                })),
                createdAt: emoji.createdAt
            })),
            
            stickers: guild.stickers.cache.map(sticker => ({
                id: sticker.id,
                name: sticker.name,
                description: sticker.description,
                type: sticker.type,
                format: sticker.format,
                available: sticker.available,
                tags: sticker.tags,
                url: sticker.url,
                createdAt: sticker.createdAt
            })),
            
            threads: allThreadsArray.map(thread => ({
                id: thread.id,
                name: thread.name,
                type: thread.type,
                parentId: thread.parentId,
                parent: thread.parent?.name,
                ownerId: thread.ownerId,
                archived: thread.archived,
                autoArchiveDuration: thread.autoArchiveDuration,
                archiveTimestamp: thread.archiveTimestamp,
                locked: thread.locked,
                rateLimitPerUser: thread.rateLimitPerUser,
                messageCount: thread.messageCount,
                memberCount: thread.memberCount,
                totalMessageSent: thread.totalMessageSent,
                createdAt: thread.createdAt
            }))
        };
    } catch (error) {
        console.error('Error fetching comprehensive guild info:', error);
        throw error;
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!ping') {
        message.reply('Pong!');
    }
    
    if (message.content === '!serverinfo') {
        try {
            const guild = message.guild;
            if (!guild) {
                message.reply('This command can only be used in a server!');
                return;
            }
            
            message.reply('⏳ Gathering comprehensive server information...');
            
            const serverInfo = await getComprehensiveGuildInfo(guild);
            const jsonOutput = JSON.stringify(serverInfo, null, 2);
            
            // Always save to project directory
            const fileName = await saveServerInfoToFile(guild, serverInfo);
            
            // Discord has a 2000 character limit for messages
            if (jsonOutput.length > 1900) {
                // Save to temp file and send as attachment
                const filename = `${guild.name}_server_info_${Date.now()}.json`;
                const filepath = `/tmp/${filename}`;
                
                fs.writeFileSync(filepath, jsonOutput);
                
                await message.reply({
                    content: `📋 Server information for **${guild.name}** (too large for message)\n💾 Also saved to project: \`server_data/${fileName}\``,
                    files: [{
                        attachment: filepath,
                        name: filename
                    }]
                });
                
                // Clean up temp file
                fs.unlinkSync(filepath);
            } else {
                await message.reply(`\`\`\`json\n${jsonOutput}\n\`\`\`\n💾 Saved to project: \`server_data/${fileName}\``);
            }
            
            console.log(`📊 Generated server info for: ${guild.name} (${guild.id})`);
            
        } catch (error) {
            console.error('Error generating server info:', error);
            message.reply('❌ An error occurred while gathering server information.');
        }
    }
    
    if (message.content === '!track') {
        try {
            const guild = message.guild;
            if (!guild) {
                message.reply('This command can only be used in a server!');
                return;
            }
            
            const trackedServers = loadTrackedServers();
            
            if (trackedServers.includes(guild.id)) {
                message.reply(`✅ This server (${guild.name}) is already being tracked!`);
                return;
            }
            
            trackedServers.push(guild.id);
            saveTrackedServers(trackedServers);
            
            // Generate initial server info
            message.reply('🔄 Adding this server to tracking list and generating initial data...');
            await saveServerInfoToFile(guild);
            
            message.channel.send(`✅ **${guild.name}** is now being tracked!\n📁 Server data will be automatically updated in \`server_data/\` directory`);
            
        } catch (error) {
            console.error('Error tracking server:', error);
            message.reply('❌ An error occurred while adding server to tracking.');
        }
    }
    
    if (message.content === '!untrack') {
        try {
            const guild = message.guild;
            if (!guild) {
                message.reply('This command can only be used in a server!');
                return;
            }
            
            const trackedServers = loadTrackedServers();
            const index = trackedServers.indexOf(guild.id);
            
            if (index === -1) {
                message.reply(`❌ This server (${guild.name}) is not currently being tracked.`);
                return;
            }
            
            trackedServers.splice(index, 1);
            saveTrackedServers(trackedServers);
            
            message.reply(`✅ **${guild.name}** has been removed from tracking.\n📝 Existing data files will remain in \`server_data/\``);
            
        } catch (error) {
            console.error('Error untracking server:', error);
            message.reply('❌ An error occurred while removing server from tracking.');
        }
    }
    
    if (message.content === '!tracked') {
        try {
            const trackedServers = loadTrackedServers();
            
            if (trackedServers.length === 0) {
                message.reply('📝 No servers are currently being tracked.\nUse `!track` to start tracking this server.');
                return;
            }
            
            const serverList = trackedServers.map(guildId => {
                const guild = client.guilds.cache.get(guildId);
                return guild ? `• ${guild.name} (${guild.id})` : `• Unknown Guild (${guildId})`;
            }).join('\n');
            
            message.reply(`📊 **Currently tracking ${trackedServers.length} server(s):**\n\`\`\`\n${serverList}\n\`\`\`\n📁 Data files are saved in \`server_data/\` directory`);
            
        } catch (error) {
            console.error('Error listing tracked servers:', error);
            message.reply('❌ An error occurred while listing tracked servers.');
        }
    }
});

// Error handling
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);