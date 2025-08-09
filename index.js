require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Claude SDK will be loaded dynamically (ES module)
let claudeQuery = null;

// Load Claude Code SDK asynchronously
async function initializeClaudeSDK() {
    try {
        const claudeSDK = await import('@anthropic-ai/claude-code');
        claudeQuery = claudeSDK.query;
        console.log('✅ Claude Code SDK loaded successfully');
    } catch (error) {
        console.warn('⚠️  Claude Code SDK not available, using CLI fallback:', error.message);
    }
}

// Load the spawn function for CLI fallback
const { spawn } = require('child_process');

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

// Claude integration - User cooldowns to prevent spam
const userCooldowns = new Map();
const COOLDOWN_MS = 3000; // 3 seconds between messages per user

// Process concurrency limits
const activeProcesses = new Set();
const MAX_CONCURRENT_PROCESSES = 3;

// Cleanup expired cooldowns periodically (prevents memory leak)
function cleanupExpiredCooldowns() {
    const now = Date.now();
    for (const [userId, expireTime] of userCooldowns.entries()) {
        if (now >= expireTime) {
            userCooldowns.delete(userId);
        }
    }
}

// Clean up cooldowns every minute
setInterval(cleanupExpiredCooldowns, 60000);

// Welcome system configuration
const WELCOME_CONFIG = {
    'Big Brain Energy': {
        guildId: '1403186864520953876',
        welcomeChannelId: '1403188813974601842', // #welcome
        generalChatChannelId: '1403186870673739909' // #general-chat
    }
};

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
    
    // Initialize Claude Code SDK
    await initializeClaudeSDK();
    
    // Set bot status
    client.user.setActivity('!ping | !serverinfo | !track | !tracked | 🤖 Claude AI in #claude-chat | 🎉 Welcoming!', { type: ActivityType.Listening });
    
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

// Welcome System Event Handler
client.on('guildMemberAdd', async (member) => {
    try {
        // Find welcome configuration for this guild
        const config = Object.values(WELCOME_CONFIG).find(cfg => cfg.guildId === member.guild.id);
        
        if (!config) {
            console.log(`No welcome configuration found for guild: ${member.guild.name}`);
            return;
        }
        
        // Get welcome channel
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        if (!welcomeChannel) {
            console.log(`Welcome channel not found in ${member.guild.name}`);
            return;
        }
        
        // Get general chat channel for mention
        const generalChatChannel = member.guild.channels.cache.get(config.generalChatChannelId);
        const generalChatMention = generalChatChannel ? `<#${generalChatChannel.id}>` : '#general-chat';
        
        // Create welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`Welcome to ${member.guild.name}! 🧠✨`)
            .setDescription(`Hello <@${member.id}>!\n`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields([
                {
                    name: '🎯 About Our Server',
                    value: `**${member.guild.name}** – ${member.guild.description || 'four synapses firing in harmony'}\n\n`,
                    inline: false
                },
                {
                    name: '🚀 Getting Started',
                    value: `Ready to join the conversation? Head over to ${generalChatMention} to say Annyong!\n`,
                    inline: false
                },
                {
                    name: '📊 Member Info',
                    value: `**Username:** ${member.user.tag}\n**Member #:** ${member.guild.memberCount}`,
                    inline: true
                },
                {
                    name: '📅 Join Date',
                    value: new Date().toDateString(),
                    inline: true
                }
            ])
            .setFooter({
                text: `Welcome to ${member.guild.name}`,
                iconURL: member.guild.iconURL()
            })
            .setTimestamp();
        
        // Send welcome message
        await welcomeChannel.send({
            content: `🎉 Everyone, please welcome ${member} to **${member.guild.name}**!`,
            embeds: [welcomeEmbed]
        });
        
        console.log(`✅ Sent welcome message for ${member.user.tag} in ${member.guild.name}`);
        
        // Update server info if this guild is being tracked
        const trackedServers = loadTrackedServers();
        if (trackedServers.includes(member.guild.id)) {
            await saveServerInfoToFile(member.guild);
        }
        
    } catch (error) {
        console.error(`Error sending welcome message for ${member.user.tag}:`, error);
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

// ================================
// CLAUDE CODE INTEGRATION FUNCTIONS
// ================================

// Input sanitization for security
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    // Remove potentially dangerous characters and limit length
    return input.replace(/[\$`\\]/g, '').trim().substring(0, 4000);
}

// Process message with Claude Code SDK (preferred) or CLI (fallback)
async function processWithClaude(messageContent) {
    // Check concurrency limit
    if (activeProcesses.size >= MAX_CONCURRENT_PROCESSES) {
        throw new Error('System busy. Too many requests in progress. Please try again in a moment.');
    }
    
    // Validate and sanitize input
    const sanitized = sanitizeInput(messageContent);
    if (!sanitized || sanitized.length === 0) {
        throw new Error('Invalid or empty message');
    }
    
    console.log('🤖 Processing with Claude:', sanitized.substring(0, 50) + '...');
    
    // Track this process
    const processId = Date.now() + Math.random();
    activeProcesses.add(processId);
    
    try {
        // Try SDK approach first (much more reliable)
        if (claudeQuery) {
            console.log('📡 Using Claude Code SDK...');
            
            try {
                console.log('🔧 Calling SDK with prompt:', sanitized.substring(0, 50) + '...');
                const messages = [];
                
                // Try without maxTurns to see if that's causing the issue
                for await (const message of claudeQuery({
                    prompt: sanitized,
                    options: {
                        timeout: 15000
                        // Removed maxTurns: 1 to test
                    }
                })) {
                    if (message.type === "result") {
                        // Debug: check if result is actually empty
                        if (!message.result || message.result.trim().length === 0) {
                            console.log('🔍 SDK returned empty result, checking fallback...');
                            console.log('🔍 Result value:', JSON.stringify(message.result));
                            console.log('🔍 Full message:', JSON.stringify(message, null, 2));
                        }
                        
                        const result = message.result;
                        
                        // If SDK returns empty/null result, fall back to CLI
                        if (!result || result.trim().length === 0) {
                            console.log('⚠️  SDK returned empty result, falling back to CLI');
                            throw new Error('SDK returned empty result, falling back to CLI');
                        }
                        
                        console.log('✅ Claude responded via SDK:', result.substring(0, 50) + '...');
                        return result;
                    }
                    messages.push(message);
                }
                
                // Fallback if no result message
                const lastMessage = messages[messages.length - 1];
                return lastMessage?.content || 'No response received from Claude SDK';
                
            } catch (sdkError) {
                console.log('⚠️  SDK failed, falling back to CLI:', sdkError.message);
                // Fall through to CLI method
            }
        }
        
        // CLI approach (fallback)
        console.log('⚠️  Using CLI fallback (may timeout)...');
        return await processWithClaudeCLI(sanitized, processId);
        
    } catch (error) {
        console.error('❌ Error in processWithClaude:', error.message);
        throw error;
    } finally {
        activeProcesses.delete(processId);
    }
}


// CLI fallback method (original implementation with fixes)
function processWithClaudeCLI(sanitized, processId) {
    
    return new Promise((resolve, reject) => {
        // Spawn Claude process with proper stdio configuration
        const claudeProcess = spawn('claude', [
            '-p', sanitized,
            '--output-format', 'json'
        ], {
            stdio: ['ignore', 'pipe', 'pipe']  // ignore stdin, pipe stdout/stderr
        });
        
        let stdout = '';
        let stderr = '';
        let timeout;
        
        // Cleanup function
        const cleanup = () => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
        };
        
        claudeProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        claudeProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        // Handle process errors (e.g., command not found)
        claudeProcess.on('error', (error) => {
            cleanup();
            reject(new Error(`Claude CLI process error: ${error.message}`));
        });

        claudeProcess.on('close', (code) => {
            cleanup();
            
            if (code === 0) {
                try {
                    // Parse JSON response
                    const parsed = JSON.parse(stdout);
                    
                    // Extract response from different possible JSON formats
                    let response;
                    if (parsed.result) {
                        response = parsed.result;  // New format
                    } else if (parsed.response) {
                        response = parsed.response;  // Old format
                    } else if (parsed.type === 'result' && !parsed.is_error) {
                        response = parsed.result || 'Claude processed your message but returned no content.';
                    } else if (parsed.is_error) {
                        response = '❌ Claude encountered an error processing your message.';
                    } else {
                        response = stdout;  // Use raw output if structure is unknown
                    }
                    
                    console.log('✅ Claude responded via CLI:', response.substring(0, 50) + '...');
                    resolve(response);
                } catch (parseError) {
                    // Fallback to raw stdout if JSON parsing fails
                    console.log('⚠️  JSON parse failed, using raw output');
                    resolve(stdout || 'No response received');
                }
            } else {
                reject(new Error(`Claude CLI process failed (code ${code}): ${stderr}`));
            }
        });
        
        // Timeout after 15 seconds  
        timeout = setTimeout(() => {
            console.log('⏰ Claude CLI process timeout reached, terminating...');
            if (!claudeProcess.killed) {
                claudeProcess.kill('SIGTERM');
            }
            cleanup();
            reject(new Error('Claude CLI process timed out after 15 seconds. Try using the SDK instead.'));
        }, 15000);
    });
}

// Send response, splitting if needed
async function sendResponse(message, response) {
    const MAX_LENGTH = 2000;
    
    // Handle null/undefined responses
    const responseText = response || 'No response received';
    
    if (responseText.length <= MAX_LENGTH) {
        await message.reply(responseText);
    } else {
        // Split long responses
        const chunks = [];
        for (let i = 0; i < responseText.length; i += MAX_LENGTH) {
            chunks.push(responseText.substring(i, i + MAX_LENGTH));
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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // ================================
    // CLAUDE AI INTEGRATION - Handle #claude-chat messages
    // ================================
    if (message.channel.name === 'claude-chat') {
        // Validate message
        if (!message.content || message.content.length > 4000) {
            return message.reply('❌ Message must be between 1-4000 characters.');
        }
        
        if (message.attachments.size > 0) {
            return message.reply('❌ File attachments are not supported in Claude chat. Please paste text content directly.');
        }
        
        // Simple rate limiting
        const userId = message.author.id;
        const now = Date.now();
        const cooldownEnd = userCooldowns.get(userId);
        
        if (cooldownEnd && now < cooldownEnd) {
            const timeLeft = Math.ceil((cooldownEnd - now) / 1000);
            return message.reply(`⏳ Please wait ${timeLeft}s before sending another message.`);
        } else if (cooldownEnd) {
            // Clean expired cooldown entry
            userCooldowns.delete(userId);
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
            console.error('❌ Claude Error:', error.message);
            
            // Provide helpful error message based on the error type
            let errorMsg;
            if (error.message.includes('timed out')) {
                errorMsg = '⏱️ Claude is taking longer than expected. This might be due to:\n' +
                          '• Claude Code CLI not being properly authenticated\n' +
                          '• Network connectivity issues\n' +
                          '• Claude CLI hanging in non-interactive mode\n\n' +
                          'Try running `claude --help` in your terminal to verify it\'s working.';
            } else if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
                errorMsg = '🔧 Claude Code CLI is not installed or not in PATH.\n' +
                          'Install it with: `npm install -g @anthropic-ai/claude-code`\n' +
                          'Or verify it\'s accessible: `which claude`';
            } else if (error.message.includes('Claude process error')) {
                errorMsg = '🔧 Claude Code CLI process error. This might be due to:\n' +
                          '• Claude Code CLI not being properly authenticated\n' +
                          '• Missing dependencies or corrupted installation\n' +
                          '• System permissions issues\n\n' +
                          'Try running `claude --help` to verify it\'s working.\n' +
                          'Error: ' + error.message;
            } else {
                errorMsg = '❌ Sorry, I encountered an error processing your message.\n' +
                          'Error: ' + error.message + '\n\n' +
                          'Please verify Claude Code CLI is installed and working: `claude --help`';
            }
            
            await message.reply(errorMsg);
        }
        
        return; // Don't process other commands in claude-chat
    }
    
    // ================================
    // EXISTING BOT COMMANDS
    // ================================
    
    if (message.content === '!ping') {
        message.reply('Pong!');
    }
    
    if (message.content === '!claude-test') {
        message.reply('🧪 Testing Claude Code CLI integration...');
        
        try {
            const testResponse = await processWithClaude('Hello Claude, this is a test from Discord bot');
            const responseText = testResponse || 'No response received';
            const preview = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
            await message.channel.send('✅ Claude integration test successful!\n🤖 Response: ' + preview);
        } catch (error) {
            await message.channel.send('❌ Claude integration test failed:\n' + error.message);
        }
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