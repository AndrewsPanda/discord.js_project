# Discord to Claude Code Integration Report

## Executive Summary

This report provides a comprehensive analysis and implementation plan for integrating Discord messages directly with Claude Code, enabling real-time AI-powered responses to Discord users through a seamless bridge between Discord.js and an active Claude Code session. **This document focuses on prototype approaches that leverage session-based integration rather than API-based methods.**

## Table of Contents

1. [Integration Approaches](#integration-approaches)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Strategy](#implementation-strategy)
4. [Technical Components](#technical-components)
5. [Prototype Code Implementation](#prototype-code-implementation)
6. [Development Setup](#development-setup)
7. [Testing & Debugging](#testing--debugging)
8. [Recommendations](#recommendations)

---

## Integration Approaches

### Session-Based vs API-Based Integration

**API-Based Approach (Production)**
- Uses official Anthropic API with authentication tokens
- Requires API usage costs and rate limiting management
- Full programmatic control with SDKs
- Production-ready with proper error handling

**Session-Based Approach (Prototype)** ⭐ **Recommended for prototyping**
- Leverages active Claude Code session without API costs
- Uses headless mode, MCP servers, or hooks system
- Perfect for development and experimentation
- No API authentication required

### Available Session-Based Methods

#### 1. MCP Server Integration (Best for Real-time)
```
Discord Bot ↔ Custom MCP Server ↔ Claude Code Session
```
- **Pros**: Real-time bidirectional communication, native Claude Code integration
- **Cons**: More complex setup, requires MCP server development
- **Best for**: Production-like prototypes with real-time features

#### 2. Headless Mode + Piping (Simplest)
```
Discord Bot → stdin pipe → `claude -p` → stdout → Discord Bot
```
- **Pros**: Extremely simple, uses existing CLI interface
- **Cons**: Limited session continuity, basic text-only responses
- **Best for**: Quick prototypes and testing

#### 3. Hooks System (Event-driven)
```
Discord Bot → Memory File Updates → Claude Code Hooks → Discord API
```
- **Pros**: Event-driven, leverages Claude Code's hook system
- **Cons**: File-based communication has latency
- **Best for**: Automated workflows and batch processing

#### 4. Terminal Control (Advanced)
```
Discord Bot → tmux-cli → Active Claude Code Terminal → Discord Bot
```
- **Pros**: Direct session interaction, maintains full context
- **Cons**: Complex terminal automation, platform-dependent
- **Best for**: Advanced prototypes requiring full session control

---

## Architecture Overview

### System Flow Diagram (Prototype Architecture)

#### Option 1: MCP Server Integration
```
Discord User → Discord Server → Discord Bot (Node.js)
                                     ↓
                            Message Queue System
                                     ↓
                            Custom MCP Server
                                     ↓
                            Claude Code Session (SSE)
                                     ↓
                            Response Processing
                                     ↓
                            Discord Bot → Discord User
```

#### Option 2: Headless Mode Integration
```
Discord User → Discord Server → Discord Bot (Node.js)
                                     ↓
                            Message Processing
                                     ↓
                            stdin pipe to `claude -p`
                                     ↓
                            Claude Code (Headless)
                                     ↓
                            stdout → Discord Bot → Discord User
```

### Key Components

1. **Discord Bot Layer**: Handles message events, user interactions, and Discord-specific operations
2. **Message Queue System**: Manages rate limiting and ensures reliable message delivery
3. **Session Bridge**: Interfaces with Claude Code session using chosen integration method
4. **Response Handler**: Processes Claude responses and formats them for Discord display
5. **Context Manager**: Maintains conversation state through memory files or session persistence
6. **Integration Adapter**: Abstracts different session-based communication methods

---

## Implementation Strategy

### Phase 1: Prototype Setup (Days 1-3)

- Set up Discord bot with message listening capabilities
- Choose and implement session integration method (recommend starting with headless mode)
- Create basic message forwarding system
- Test simple text-based conversations

### Phase 2: Enhanced Prototype (Days 4-7)

- Add conversation context management through memory files
- Implement basic error handling and retry logic
- Support code block formatting and file attachments
- Add simple command system for bot control

### Phase 3: Advanced Prototype (Week 2)

- Upgrade to MCP server integration for real-time features
- Implement thread-based conversations
- Add comprehensive logging for debugging
- Create development utilities and monitoring

### Phase 4: Production Migration (Optional)

- Transition to API-based approach if moving to production
- Implement comprehensive security and rate limiting
- Add deployment automation and monitoring

---

## Technical Components

### 1. Discord Bot Configuration

```javascript
// config/discord.config.js
module.exports = {
    intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent',
        'GuildMembers',
        'DirectMessages'
    ],
    partials: ['Channel', 'Message'],
    
    // Claude integration settings
    claudeChannels: ['claude-chat', 'ai-assistance'],
    commandPrefix: '!claude',
    
    // Rate limiting
    messageQueueSize: 100,
    rateLimitPerUser: 10, // messages per minute
    
    // Response formatting
    maxResponseLength: 2000,
    splitLongResponses: true
};
```

### 2. Session-Based Integration Methods

#### Option A: Headless Mode Integration (Simplest)

```javascript
// services/claudeHeadlessService.js
const { spawn } = require('child_process');
const path = require('path');

class ClaudeHeadlessService {
    constructor() {
        this.userContexts = new Map(); // userId -> memory content
    }
    
    async processMessage(userId, message, attachments = []) {
        // Update user context
        await this.updateUserContext(userId, message);
        
        // Prepare prompt with context
        const contextPrompt = this.buildContextPrompt(userId, message, attachments);
        
        // Execute Claude Code in headless mode
        return new Promise((resolve, reject) => {
            const claudeProcess = spawn('claude', [
                '-p', contextPrompt,
                '--output-format', 'stream-json'
            ]);
            
            let response = '';
            let error = '';
            
            claudeProcess.stdout.on('data', (data) => {
                response += data.toString();
            });
            
            claudeProcess.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            claudeProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(this.formatResponse(response));
                } else {
                    reject(new Error(`Claude process failed: ${error}`));
                }
            });
            
            // Handle timeout
            setTimeout(() => {
                claudeProcess.kill('SIGTERM');
                reject(new Error('Claude process timeout'));
            }, 30000);
        });
    }
    
    buildContextPrompt(userId, message, attachments) {
        const context = this.userContexts.get(userId) || '';
        let prompt = `Previous conversation context:\n${context}\n\n`;
        
        if (attachments.length > 0) {
            prompt += `Attachments:\n`;
            attachments.forEach(att => {
                prompt += `- ${att.name}: ${att.content}\n`;
            });
            prompt += '\n';
        }
        
        prompt += `User message: ${message}`;
        
        return prompt;
    }
    
    async updateUserContext(userId, message) {
        const existingContext = this.userContexts.get(userId) || '';
        const newContext = existingContext + `\nUser: ${message}`;
        
        // Keep context manageable (last 10 exchanges)
        const lines = newContext.split('\n');
        if (lines.length > 20) {
            this.userContexts.set(userId, lines.slice(-20).join('\n'));
        } else {
            this.userContexts.set(userId, newContext);
        }
    }
    
    formatResponse(rawResponse) {
        try {
            // Parse stream-json output
            const lines = rawResponse.trim().split('\n');
            let content = '';
            
            for (const line of lines) {
                if (line.startsWith('{')) {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'content' && parsed.text) {
                        content += parsed.text;
                    }
                }
            }
            
            return {
                content: content.trim(),
                type: 'text'
            };
        } catch (error) {
            return {
                content: rawResponse,
                type: 'text'
            };
        }
    }
    
    clearContext(userId) {
        this.userContexts.delete(userId);
    }
}

module.exports = ClaudeHeadlessService;
```

#### Option B: MCP Server Integration (Advanced)

```javascript
// services/claudeMcpService.js
const WebSocket = require('ws');
const EventEmitter = require('events');

class ClaudeMcpService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.isConnected = false;
        this.messageQueue = [];
        this.userSessions = new Map();
        this.setupMcpConnection();
    }
    
    async setupMcpConnection() {
        // Connect to custom MCP server (you'll need to create this)
        this.ws = new WebSocket('ws://localhost:8080/discord-mcp');
        
        this.ws.on('open', () => {
            console.log('Connected to Claude Code MCP server');
            this.isConnected = true;
            this.processQueuedMessages();
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            this.handleMcpMessage(message);
        });
        
        this.ws.on('close', () => {
            console.log('Disconnected from MCP server');
            this.isConnected = false;
            setTimeout(() => this.setupMcpConnection(), 5000);
        });
    }
    
    async processMessage(userId, message, attachments = []) {
        const mcpMessage = {
            id: this.generateMessageId(),
            userId,
            type: 'user_message',
            content: message,
            attachments,
            timestamp: Date.now()
        };
        
        if (this.isConnected) {
            this.ws.send(JSON.stringify(mcpMessage));
            return this.waitForResponse(mcpMessage.id);
        } else {
            this.messageQueue.push(mcpMessage);
            return { content: 'Message queued, will process when connected', type: 'system' };
        }
    }
    
    handleMcpMessage(message) {
        switch (message.type) {
            case 'claude_response':
                this.emit('response', message.id, {
                    content: message.content,
                    type: message.contentType || 'text'
                });
                break;
            case 'error':
                this.emit('error', message.id, new Error(message.error));
                break;
        }
    }
    
    waitForResponse(messageId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Response timeout'));
            }, timeout);
            
            const responseHandler = (id, response) => {
                if (id === messageId) {
                    clearTimeout(timer);
                    this.removeListener('response', responseHandler);
                    this.removeListener('error', errorHandler);
                    resolve(response);
                }
            };
            
            const errorHandler = (id, error) => {
                if (id === messageId) {
                    clearTimeout(timer);
                    this.removeListener('response', responseHandler);
                    this.removeListener('error', errorHandler);
                    reject(error);
                }
            };
            
            this.on('response', responseHandler);
            this.on('error', errorHandler);
        });
    }
    
    processQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
        }
    }
    
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = ClaudeMcpService;
```

#### Option C: Memory File Integration (Hook-based)

```javascript
// services/claudeMemoryService.js
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');

class ClaudeMemoryService {
    constructor() {
        this.memoryDir = path.join(process.cwd(), '.claude-memory');
        this.userMemoryFiles = new Map();
        this.responseWatchers = new Map();
        this.ensureMemoryDir();
    }
    
    async ensureMemoryDir() {
        try {
            await fs.mkdir(this.memoryDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create memory directory:', error);
        }
    }
    
    async processMessage(userId, message, attachments = []) {
        // Write user message to memory file
        const memoryFile = await this.getUserMemoryFile(userId);
        const timestamp = new Date().toISOString();
        
        let memoryContent = `\n## Discord Message - ${timestamp}\n`;
        memoryContent += `**User:** ${message}\n`;
        
        if (attachments.length > 0) {
            memoryContent += `\n**Attachments:**\n`;
            attachments.forEach(att => {
                memoryContent += `- ${att.name}: ${att.contentType}\n`;
            });
        }
        
        memoryContent += `\n**Request:** Please respond to this Discord message.\n`;
        
        await fs.appendFile(memoryFile, memoryContent);
        
        // Watch for Claude Code's response
        return this.waitForClaudeResponse(userId);
    }
    
    async getUserMemoryFile(userId) {
        if (!this.userMemoryFiles.has(userId)) {
            const filename = `discord_${userId}.md`;
            const filepath = path.join(this.memoryDir, filename);
            this.userMemoryFiles.set(userId, filepath);
            
            // Initialize file if it doesn't exist
            try {
                await fs.access(filepath);
            } catch {
                await fs.writeFile(filepath, `# Discord Conversation - User ${userId}\n\n`);
            }
        }
        
        return this.userMemoryFiles.get(userId);
    }
    
    async waitForClaudeResponse(userId, timeout = 60000) {
        return new Promise((resolve, reject) => {
            const memoryFile = this.userMemoryFiles.get(userId);
            let lastSize = 0;
            
            const watcher = chokidar.watch(memoryFile, {
                persistent: false,
                ignoreInitial: true
            });
            
            const timeoutId = setTimeout(() => {
                watcher.close();
                reject(new Error('Claude response timeout'));
            }, timeout);
            
            watcher.on('change', async () => {
                try {
                    const stats = await fs.stat(memoryFile);
                    if (stats.size > lastSize) {
                        const content = await fs.readFile(memoryFile, 'utf-8');
                        const response = this.extractLatestResponse(content);
                        
                        if (response) {
                            clearTimeout(timeoutId);
                            watcher.close();
                            resolve({
                                content: response,
                                type: 'text'
                            });
                        }
                        lastSize = stats.size;
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    watcher.close();
                    reject(error);
                }
            });
        });
    }
    
    extractLatestResponse(content) {
        // Look for Claude's response patterns
        const lines = content.split('\n');
        let inResponse = false;
        let response = '';
        
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            
            if (line.includes('## Claude Response') || line.includes('**Claude:**')) {
                inResponse = true;
                continue;
            }
            
            if (inResponse && (line.includes('## Discord Message') || line.includes('**User:'))) {
                break;
            }
            
            if (inResponse && line.trim()) {
                response = line + '\n' + response;
            }
        }
        
        return response.trim() || null;
    }
}

module.exports = ClaudeMemoryService;
```

### 3. Adaptive Message Processing Pipeline

```javascript
// handlers/messageHandler.js
const ClaudeService = require('../services/claudeService');
const MessageQueue = require('../utils/messageQueue');
const { EmbedBuilder } = require('discord.js');

class MessageHandler {
    constructor(client) {
        this.client = client;
        this.claudeService = new ClaudeService();
        this.messageQueue = new MessageQueue();
        this.userCooldowns = new Map();
    }
    
    async handleMessage(message) {
        // Validation checks
        if (message.author.bot) return;
        if (!this.isClaudeChannel(message.channel)) return;
        if (this.isRateLimited(message.author.id)) {
            return message.reply('Please wait before sending another message.');
        }
        
        // Show typing indicator
        await message.channel.sendTyping();
        
        // Process attachments if any
        const attachments = await this.processAttachments(message);
        
        // Queue message for processing
        await this.messageQueue.add({
            userId: message.author.id,
            channelId: message.channel.id,
            content: message.content,
            attachments,
            messageRef: message
        });
    }
    
    async processQueuedMessage(queueItem) {
        const { userId, channelId, content, attachments, messageRef } = queueItem;
        
        try {
            // Get Claude response
            const response = await this.claudeService.processMessage(
                userId,
                content,
                attachments
            );
            
            // Send response to Discord
            await this.sendResponse(messageRef, response);
            
        } catch (error) {
            console.error('Error processing message:', error);
            await this.sendErrorResponse(messageRef, error);
        }
    }
    
    async sendResponse(originalMessage, claudeResponse) {
        const { content, type } = claudeResponse;
        
        // Check if response needs to be split
        if (content.length > 2000) {
            const chunks = this.splitMessage(content);
            for (const chunk of chunks) {
                await originalMessage.reply(chunk);
            }
        } else {
            // Create embed for better formatting
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setDescription(content)
                .setFooter({ text: 'Powered by Claude Code' })
                .setTimestamp();
            
            await originalMessage.reply({ embeds: [embed] });
        }
    }
    
    splitMessage(content, maxLength = 2000) {
        const chunks = [];
        let currentChunk = '';
        
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLength) {
                chunks.push(currentChunk);
                currentChunk = line;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        
        return chunks;
    }
    
    isClaudeChannel(channel) {
        const allowedChannels = ['claude-chat', 'ai-assistance'];
        return allowedChannels.includes(channel.name);
    }
    
    isRateLimited(userId) {
        const cooldown = this.userCooldowns.get(userId);
        if (!cooldown) {
            this.userCooldowns.set(userId, Date.now());
            return false;
        }
        
        const timePassed = Date.now() - cooldown;
        if (timePassed < 6000) { // 6 seconds cooldown
            return true;
        }
        
        this.userCooldowns.set(userId, Date.now());
        return false;
    }
    
    async processAttachments(message) {
        const attachments = [];
        
        for (const [, attachment] of message.attachments) {
            if (attachment.size > 10485760) { // 10MB limit
                continue;
            }
            
            // Download and process attachment
            const response = await fetch(attachment.url);
            const buffer = await response.buffer();
            
            attachments.push({
                name: attachment.name,
                content: buffer.toString('base64'),
                contentType: attachment.contentType
            });
        }
        
        return attachments;
    }
    
    async sendErrorResponse(message, error) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Error')
            .setDescription('An error occurred while processing your request.')
            .addFields({ name: 'Error Details', value: error.message.slice(0, 1024) })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
}

module.exports = MessageHandler;
```

### 4. Command System

```javascript
// commands/claude.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claude')
        .setDescription('Manage Claude Code integration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset your conversation with Claude')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check Claude integration status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Get help with Claude commands')
        ),
    
    async execute(interaction, claudeService) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'reset':
                if (claudeService.clearContext) {
                    claudeService.clearContext(interaction.user.id);
                }
                await interaction.reply({
                    content: 'Your conversation with Claude has been reset.',
                    ephemeral: true
                });
                break;
                
            case 'status':
                const status = await this.checkStatus(claudeService);
                await interaction.reply({
                    content: `Claude Code Status: ${status}`,
                    ephemeral: true
                });
                break;
                
            case 'help':
                await interaction.reply({
                    content: this.getHelpText(),
                    ephemeral: true
                });
                break;
        }
    },
    
    async checkStatus(claudeService) {
        try {
            await claudeService.client.health();
            return '✅ Online and operational';
        } catch (error) {
            return '❌ Offline or experiencing issues';
        }
    },
    
    getHelpText() {
        return `**Claude Code Integration Help**
        
• Send messages in #claude-chat to talk with Claude
• Use /claude reset to start a new conversation
• Claude remembers your conversation context
• You can attach files and images to your messages
• Code blocks are automatically formatted
• Long responses are split into multiple messages`;
    }
};
```

### 5. Message Queue System

```javascript
// utils/messageQueue.js
class MessageQueue {
    constructor(options = {}) {
        this.queue = [];
        this.processing = false;
        this.maxSize = options.maxSize || 100;
        this.processingDelay = options.delay || 100;
        this.onProcess = options.onProcess || null;
    }
    
    async add(item) {
        if (this.queue.length >= this.maxSize) {
            throw new Error('Queue is full');
        }
        
        this.queue.push({
            ...item,
            timestamp: Date.now(),
            id: this.generateId()
        });
        
        if (!this.processing) {
            this.startProcessing();
        }
    }
    
    async startProcessing() {
        this.processing = true;
        
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            
            try {
                if (this.onProcess) {
                    await this.onProcess(item);
                }
                
                // Rate limiting delay
                await new Promise(resolve => 
                    setTimeout(resolve, this.processingDelay)
                );
                
            } catch (error) {
                console.error('Queue processing error:', error);
                // Optionally re-queue or handle error
            }
        }
        
        this.processing = false;
    }
    
    generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getSize() {
        return this.queue.length;
    }
    
    clear() {
        this.queue = [];
    }
}

module.exports = MessageQueue;
```

---

## Security Considerations

### 1. API Key Management

```javascript
// .env.example
DISCORD_TOKEN=your_discord_bot_token
# ANTHROPIC_API_KEY not needed for session-based integration
CLAUDE_INTEGRATION_METHOD=headless  # Options: headless, mcp, memory
NODE_ENV=development
LOG_LEVEL=debug

# Security settings
MAX_MESSAGE_LENGTH=2000
MAX_ATTACHMENT_SIZE=10485760
ALLOWED_FILE_TYPES=txt,js,py,md,json,yaml,yml
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### 2. Input Validation

```javascript
// validators/messageValidator.js
class MessageValidator {
    static validateMessage(message) {
        // Check message length
        if (message.content.length > process.env.MAX_MESSAGE_LENGTH) {
            throw new Error('Message too long');
        }
        
        // Check for malicious patterns
        const suspiciousPatterns = [
            /\beval\s*\(/gi,
            /\bexec\s*\(/gi,
            /<script/gi,
            /javascript:/gi
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(message.content)) {
                throw new Error('Message contains suspicious content');
            }
        }
        
        return true;
    }
    
    static sanitizeInput(input) {
        // Remove potential command injection attempts
        return input
            .replace(/[;&|`$]/g, '')
            .replace(/\.\.\//g, '')
            .trim();
    }
}
```

### 3. Permission Management

```javascript
// middleware/permissions.js
class PermissionManager {
    constructor() {
        this.userPermissions = new Map();
        this.rolePermissions = new Map();
    }
    
    async checkPermission(user, action) {
        // Check user-specific permissions
        const userPerms = this.userPermissions.get(user.id);
        if (userPerms && userPerms.includes(action)) {
            return true;
        }
        
        // Check role-based permissions
        for (const role of user.roles.cache.values()) {
            const rolePerms = this.rolePermissions.get(role.id);
            if (rolePerms && rolePerms.includes(action)) {
                return true;
            }
        }
        
        return false;
    }
    
    setUserPermission(userId, permissions) {
        this.userPermissions.set(userId, permissions);
    }
    
    setRolePermission(roleId, permissions) {
        this.rolePermissions.set(roleId, permissions);
    }
}
```

### 4. Audit Logging

```javascript
// utils/auditLogger.js
const winston = require('winston');

const auditLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ 
            filename: 'logs/audit.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    ]
});

class AuditLogger {
    static logMessage(userId, messageId, action, details = {}) {
        auditLogger.info({
            timestamp: new Date().toISOString(),
            userId,
            messageId,
            action,
            details
        });
    }
    
    static logError(error, context = {}) {
        auditLogger.error({
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context
        });
    }
    
    static logSecurityEvent(event, userId, details = {}) {
        auditLogger.warn({
            timestamp: new Date().toISOString(),
            event,
            userId,
            details,
            type: 'SECURITY'
        });
    }
}

module.exports = AuditLogger;
```

---

## Prototype Code Implementation

### Main Bot File

```javascript
// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const ClaudeService = require('./services/claudeService');
const MessageHandler = require('./handlers/messageHandler');
const AuditLogger = require('./utils/auditLogger');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['Channel', 'Message']
});

// Initialize services based on integration method
const integrationMethod = process.env.CLAUDE_INTEGRATION_METHOD || 'headless';
const messageHandler = new MessageHandler(client, integrationMethod);

// Load commands
client.commands = new Collection();
// ... command loading logic

// Event handlers
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    AuditLogger.logMessage(null, null, 'BOT_START', { 
        botId: client.user.id 
    });
});

client.on('messageCreate', async (message) => {
    try {
        await messageHandler.handleMessage(message);
    } catch (error) {
        AuditLogger.logError(error, { 
            messageId: message.id,
            userId: message.author.id 
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    
    if (!command) return;
    
    try {
        await command.execute(interaction, messageHandler.claudeService);
    } catch (error) {
        AuditLogger.logError(error, { 
            commandName: interaction.commandName 
        });
        await interaction.reply({ 
            content: 'There was an error executing this command!', 
            ephemeral: true 
        });
    }
});

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
    AuditLogger.logError(error, { type: 'UNHANDLED_REJECTION' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// Start bot
client.login(process.env.DISCORD_TOKEN);
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Run application
CMD ["node", "index.js"]
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'discord-claude-bot',
        script: './index.js',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production'
        },
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_file: './logs/pm2-combined.log',
        time: true,
        
        // Auto-restart settings
        min_uptime: '10s',
        max_restarts: 10,
        autorestart: true,
        
        // Graceful shutdown
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 10000
    }]
};
```

---

## Development Setup

### 1. Prerequisites

**Required:**
- Node.js 18+
- Claude Code installed and accessible via `claude` command
- Discord bot token

**Optional for advanced features:**
- tmux (for terminal control integration)
- chokidar (for file watching)

### 2. Development Environment Setup

```bash
# 1. Clone or create your Discord bot project
git clone <your-discord-bot-repo>
cd discord-claude-bot

# 2. Install dependencies
npm install discord.js dotenv ws chokidar

# 3. Set up environment
cp .env.example .env
# Edit .env with your Discord bot token

# 4. Test Claude Code CLI access
claude --help
claude -p "Hello, this is a test"

# 5. Start development
npm run dev
```

### 3. Quick Start Guide

#### Option 1: Headless Integration (Recommended for beginners)

1. Set `CLAUDE_INTEGRATION_METHOD=headless` in `.env`
2. Ensure `claude` command is in your PATH
3. Start the bot - it will use command-line piping

#### Option 2: MCP Server Integration (Advanced)

1. Create a custom MCP server (see MCP documentation)
2. Set `CLAUDE_INTEGRATION_METHOD=mcp` in `.env`
3. Configure WebSocket connection to your MCP server

#### Option 3: Memory File Integration (Hook-based)

1. Set `CLAUDE_INTEGRATION_METHOD=memory` in `.env`
2. Ensure `.claude-memory/` directory is created
3. Set up Claude Code hooks to monitor memory files

### 4. Development Scripts

```bash
# package.json scripts for development
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "test-claude": "claude -p 'Test message from Discord bot'",
    "test-integration": "node test/integration-test.js",
    "debug": "DEBUG=discord:* node index.js"
  }
}
```

```bash
# Development workflow
npm run test-claude          # Test Claude CLI access
npm run test-integration      # Test Discord integration
npm run debug                # Debug with verbose logging
npm run dev                  # Start with auto-reload
```

### 3. Monitoring Setup

```javascript
// monitoring/healthcheck.js
const http = require('http');

const options = {
    host: 'localhost',
    port: process.env.HEALTH_CHECK_PORT || 3000,
    path: '/health',
    timeout: 2000
};

const request = http.request(options, (res) => {
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

request.on('error', () => {
    process.exit(1);
});

request.end();
```

---

## Testing & Debugging

### 1. Integration Testing

```javascript
// test/integration-test.js
const ClaudeHeadlessService = require('../services/claudeHeadlessService');

async function testClaudeIntegration() {
    console.log('Testing Claude Code integration...');
    
    const service = new ClaudeHeadlessService();
    
    try {
        const response = await service.processMessage(
            'test-user',
            'Hello Claude, please respond with a simple greeting.',
            []
        );
        
        console.log('✅ Integration test successful');
        console.log('Response:', response.content);
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        process.exit(1);
    }
}

testClaudeIntegration();
```

### 2. Unit Tests

```javascript
// tests/claudeService.test.js
const ClaudeService = require('../services/claudeService');

describe('ClaudeService', () => {
    let service;
    
    beforeEach(() => {
        service = new ClaudeService();
    });
    
    test('should create session for new user', async () => {
        const sessionId = await service.createSession('user123');
        expect(sessionId).toBeDefined();
        expect(service.sessions.has('user123')).toBe(true);
    });
    
    test('should format code responses correctly', () => {
        const response = {
            type: 'code',
            language: 'javascript',
            content: 'console.log("test");'
        };
        
        const formatted = service.formatResponse(response);
        expect(formatted.content).toContain('```javascript');
        expect(formatted.type).toBe('code');
    });
});
```

### 3. Manual Testing

```javascript
// tests/integration/messageFlow.test.js
describe('Message Flow Integration', () => {
    test('should process Discord message through Claude', async () => {
        const mockMessage = {
            content: 'Hello Claude',
            author: { id: 'user123', bot: false },
            channel: { name: 'claude-chat' }
        };
        
        const response = await messageHandler.handleMessage(mockMessage);
        expect(response).toBeDefined();
    });
});
```

```javascript
// test/manual-test.js
const { Client, GatewayIntentBits } = require('discord.js');
const MessageHandler = require('../handlers/messageHandler');

// Simple test client for manual testing
const testClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const handler = new MessageHandler(testClient, 'headless');

// Mock message for testing
const mockMessage = {
    content: 'Test message from manual test',
    author: { id: 'test-user-123', bot: false },
    channel: { name: 'claude-chat', sendTyping: async () => {} },
    reply: async (content) => console.log('Bot response:', content),
    attachments: new Map()
};

// Run test
handler.handleMessage(mockMessage)
    .then(() => console.log('Manual test completed'))
    .catch(console.error);
```

### 4. Debugging Tools

```javascript
// debug/debugger.js
class DebugHelper {
    static logMessage(userId, message, method) {
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`[DEBUG] User ${userId} (${method}): ${message}`);
        }
    }
    
    static logClaudeProcess(command, args) {
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`[DEBUG] Claude Command: ${command} ${args.join(' ')}`);
        }
    }
    
    static logError(error, context) {
        console.error(`[ERROR] ${context}:`, error.message);
        if (process.env.LOG_LEVEL === 'debug') {
            console.error('Stack trace:', error.stack);
        }
    }
    
    static async testClaudeAccess() {
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
            const test = spawn('claude', ['--version']);
            
            test.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Claude CLI is accessible');
                    resolve(true);
                } else {
                    console.log('❌ Claude CLI not found or not accessible');
                    resolve(false);
                }
            });
        });
    }
}

module.exports = DebugHelper;
```

---

## Recommendations

### 1. Getting Started (Day 1)

1. **Install Claude Code** and verify CLI access with `claude --help`
2. **Set up Discord bot** with basic message listening
3. **Test headless integration** with simple message forwarding
4. **Create dedicated #claude-chat channel** for testing

### 2. Prototype Best Practices

1. **Start with headless mode** - it's the simplest to implement and debug
2. **Use verbose logging** during development to understand the flow
3. **Test with simple messages first** before trying complex attachments
4. **Keep context windows small** to avoid token limits
5. **Implement basic error handling** to gracefully handle Claude CLI failures

### 3. Advanced Features (Week 2+)

1. **Upgrade to MCP server** for real-time bidirectional communication
2. **Implement file attachment processing** for code sharing
3. **Add conversation threading** to maintain context
4. **Create development dashboard** for monitoring

### 4. Migration to Production (Optional)

1. **Transition to API-based approach** when ready for production
2. **Implement comprehensive rate limiting** and security measures
3. **Add monitoring and alerting** for production reliability
4. **Consider hosting and scaling** requirements

### 5. Prototype Roadmap

**Day 1-3: Basic Setup**
- Headless integration working
- Simple Discord message forwarding
- Basic error handling

**Week 1: Enhanced Features**
- Context management
- File attachment support
- Command system

**Week 2: Advanced Integration**
- MCP server implementation
- Real-time features
- Development tools

**Week 3+: Production Transition**
- API-based approach
- Security hardening
- Deployment automation

---

## Conclusion

This prototype integration plan provides multiple approaches for connecting Discord with Claude Code without requiring API access. The session-based methods offer cost-effective experimentation while maintaining the power of Claude Code's development capabilities.

### Key Success Factors:

1. **Start Simple** - Begin with headless mode integration for quick setup
2. **Iterate Quickly** - Use the prototype to test ideas and workflows
3. **Maintain Context** - Implement basic conversation management
4. **Debug Extensively** - Use verbose logging to understand the integration flow
5. **Plan for Scale** - Design with future API migration in mind

### Prototype Advantages:

- **No API costs** during development and testing
- **Full Claude Code capabilities** including tool usage and code execution
- **Real development environment** with actual file system access
- **Flexible architecture** supporting multiple integration methods
- **Easy iteration** and experimentation

### When to Consider Production Migration:

- **High user volume** requiring robust rate limiting
- **24/7 availability** needs without manual intervention
- **Enterprise security** requirements
- **Multi-instance deployment** for scaling

The prototype approach allows you to validate the concept, test user workflows, and iterate on features before committing to a full production implementation.

---

## Appendix

### A. Environment Variables

```bash
# Required
DISCORD_TOKEN=
# ANTHROPIC_API_KEY=  # Not needed for session-based integration
CLAUDE_INTEGRATION_METHOD=headless

# Optional
NODE_ENV=production
LOG_LEVEL=info
MAX_MESSAGE_LENGTH=2000
MAX_ATTACHMENT_SIZE=10485760
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
HEALTH_CHECK_PORT=3000
```

### B. NPM Dependencies

```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1",
    "ws": "^8.14.2",
    "chokidar": "^3.5.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "eslint": "^8.54.0"
  },
  "optionalDependencies": {
    "winston": "^3.11.0",
    "express": "^4.18.2"
  }
}
```

### C. Project Structure (Prototype)

```
discord-claude-prototype/
├── commands/
│   └── claude.js
├── config/
│   └── discord.config.js
├── handlers/
│   └── messageHandler.js
├── services/
│   ├── claudeHeadlessService.js
│   ├── claudeMcpService.js
│   └── claudeMemoryService.js
├── utils/
│   └── messageQueue.js
├── debug/
│   └── debugger.js
├── test/
│   ├── integration-test.js
│   └── manual-test.js
├── .claude-memory/          # For memory-based integration
│   └── discord_*.md
├── mcp-server/              # Optional: Custom MCP server
│   ├── server.js
│   └── discord-mcp.json
├── .env
├── .env.example
├── index.js
├── package.json
└── README.md
```

### D. MCP Server Configuration (Advanced)

```json
// mcp-server/discord-mcp.json
{
  "mcpServers": {
    "discord-integration": {
      "command": "node",
      "args": ["./mcp-server/server.js"],
      "env": {
        "DISCORD_TOKEN": "your-discord-token"
      }
    }
  }
}
```

---

*This report was compiled based on official Discord.js v14 documentation and Claude Code session-based integration research. The prototype approaches described here are intended for development and experimentation. For production deployment, consider transitioning to the official Claude Code API with appropriate security and scaling measures.*