const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botun gecikme sürelerini ölçer.'),

  run: async (client, interaction) => {
    const requiredPermissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ReadMessageHistory,
    ];

    const perms = interaction.channel.permissionsFor(interaction.guild.members.me);
    if (perms) {
      const missing = requiredPermissions.filter(p => !perms.has(p));
      if (missing.length > 0) {
        return interaction.reply({
          content: `Gerekli izinlerim eksik kanka. Şu izinleri vermen lazım: ${missing.map(p => Object.keys(PermissionsBitField.Flags).find(k => PermissionsBitField.Flags[k] === p)).join(', ')}`,
          ephemeral: true
        });
      }
    }

    const sent = Date.now();
    await interaction.reply({ content: '🏓 Pong ölçülüyor...', ephemeral: true });
    const apiLatency = Date.now() - sent;

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong! Canlı Telemetri')
      .setColor(config.color || '#2dd4bf')
      .addFields(
        { name: 'WebSocket Gecikmesi (WS Ping)', value: `\`${client.ws.ping}ms\``, inline: true },
        { name: 'API Yanıt Süresi', value: `\`${apiLatency}ms\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] }).catch(() => null);
  },
};
