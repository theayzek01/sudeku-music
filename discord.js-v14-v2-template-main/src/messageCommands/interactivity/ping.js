const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config/config.json');

module.exports = {
    name: 'ping',
    aliases: ['p', 'gecikme'],
    description: 'Botun gecikme sürelerini ölçer.',
    usage: 'ping',
    async run(client, message) {
        const requiredPermissions = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.ReadMessageHistory,
        ];

        const me = message.guild?.members.me;
        const perms = message.channel.permissionsFor(me);
        
        if (perms) {
            const missing = requiredPermissions.filter(p => !perms.has(p));
            if (missing.length > 0) {
                return message.reply(`Gerekli izinlerim eksik kanka. Şu izinleri vermen lazım: ${missing.map(p => Object.keys(PermissionsBitField.Flags).find(k => PermissionsBitField.Flags[k] === p)).join(', ')}`);
            }
        }

        const sent = Date.now();
        const initialReply = await message.reply({ content: '🏓 Pong ölçülüyor...' });
        const apiLatency = Date.now() - sent;

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong! Canlı Telemetri')
            .setColor(config.color || '#2dd4bf')
            .addFields(
                { name: 'WebSocket Gecikmesi (WS Ping)', value: `\`${client.ws.ping}ms\``, inline: true },
                { name: 'API Yanıt Süresi', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setTimestamp();

        return initialReply.edit({ content: '', embeds: [embed] }).catch(() => null);
    },
};
