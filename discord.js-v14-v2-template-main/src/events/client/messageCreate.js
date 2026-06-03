const config = require('../../config/config.json');
const aiConfig = require('../../config/ai');
const chatEngine = require('../../services/chatEngine');
const guildConfig = require('../../services/guildConfig');
const metrics = require('../../services/metrics');
const { EmbedBuilder } = require('discord.js');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(client, message) {
        if (!message || !message.content) return;
        if (message.author?.bot) return;
        metrics.inc('messagesSeen');
        
        const guildAiConfig = guildConfig.get(message.guildId || 'dm');
        if (guildAiConfig.learn) chatEngine.observe(message);

        const prefix = typeof config.prefix === 'string' ? config.prefix.trim() : '';
        const botName = typeof config.botName === 'string' && config.botName.trim().length > 0
            ? config.botName.trim().toLowerCase()
            : '';
        
        const mentionRegex = client.user
            ? new RegExp(`^<@!?${escapeRegex(client.user.id)}>(?:\\s+|$)`)
            : null;

        let content = message.content.trim();
        let triggerMatched = false;

        // 1) Prefix trigger, e.g. ?ping
        if (prefix && content.startsWith(prefix)) {
            triggerMatched = true;
            content = content.slice(prefix.length).trim();
        }

        // 2) Bot name trigger, e.g. sude ping
        if (!triggerMatched && botName) {
            const botNameRegex = new RegExp(`^${escapeRegex(botName)}(?:\\s+|$)`, 'i');
            const nameMatch = content.match(botNameRegex);
            if (nameMatch) {
                triggerMatched = true;
                content = content.slice(nameMatch[0].length).trim();
            }
        }

        // 3) Mention trigger, e.g. @sude ping
        if (!triggerMatched && mentionRegex) {
            const mentionMatch = content.match(mentionRegex);
            if (mentionMatch) {
                triggerMatched = true;
                content = content.slice(mentionMatch[0].length).trim();
            }
        }

        const isReplyToBot = Boolean(message.reference?.messageId) && await message.channel.messages.fetch(message.reference.messageId).then(m => m.author?.id === client.user?.id).catch(() => false);
        const naturalNameRegex = new RegExp(`^${escapeRegex(aiConfig.botName)}(?:\\s+|$)`, 'i');
        const naturalNameMatch = message.content.trim().match(naturalNameRegex);

        if (!triggerMatched && !isReplyToBot && !naturalNameMatch) {
            if (!guildAiConfig.proactive || guildAiConfig.mentionOnly) return;
            if (Math.random() > guildAiConfig.ambientChance) return;
            content = message.content.trim();
        }

        if (naturalNameMatch && !triggerMatched) {
            content = message.content.trim().slice(naturalNameMatch[0].length).trim();
            triggerMatched = true;
        }

        const args = content.split(/\s+/).filter(Boolean);
        if (args.length === 0) return;

        const input = args[0].toLowerCase();
        const resolvedName = client.commands.has(input) ? input : client.aliases.get(input);
        
        if (!resolvedName) {
            // Check if this was a natural conversation call to the bot (triggered matched or reply/proactive)
            if (triggerMatched || isReplyToBot || (guildAiConfig.proactive && !guildAiConfig.mentionOnly)) {
                await message.channel.sendTyping().catch(() => null);
                metrics.inc('aiRequests');
                const result = await chatEngine.replyRich({
                    userId: message.author.id,
                    userName: message.author.username,
                    channelId: message.channelId,
                    guildId: message.guildId,
                    guild: message.guild,
                    content,
                });
                
                // Dynamic organic typing delay (12ms per character, min 450ms, max 1600ms)
                const typingDelay = Math.min(1600, Math.max(450, (result.content || '').length * 12));
                await new Promise(resolve => setTimeout(resolve, typingDelay));

                const sent = await message.reply({ content: result.content, allowedMentions: { repliedUser: false } }).catch(() => null);
                metrics.reply({ user: message.author.username, guildId: message.guildId || 'dm', channelId: message.channelId, content: result.content.slice(0, 220), mood: result.mood });
                
                if (sent && result.actions?.react) {
                    const reacts = Array.isArray(result.actions.react) ? result.actions.react : [result.actions.react];
                    for (const r of reacts) {
                        await sent.react(r).then(() => metrics.inc('reactions')).catch(() => null);
                    }
                }
                if (result.actions?.gifQuery && message.channel?.send) {
                    message.channel.send({ content: `https://tenor.com/search/${encodeURIComponent(result.actions.gifQuery)}-gifs` }).catch(() => null);
                }
                return sent;
            }
            return;
        }

        args.shift();

        const command = client.commands.get(resolvedName);
        if (!command || typeof command.run !== 'function') return;

        try {
            await command.run(client, message, args, prefix);
        } catch (error) {
            console.error(`[MESSAGE COMMAND ERROR] ${resolvedName}:`, error);
            const errEmbed = new EmbedBuilder()
                .setTitle('⚠️ Komut Hatası')
                .setDescription('Bu komut çalıştırılırken beklenmedik bir hata oluştu kanka...')
                .setColor(config.color || '#fb7185')
                .setTimestamp();
            
            await message.reply({ embeds: [errEmbed] }).catch(() => null);
        }
    },
};
