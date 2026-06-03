const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const chatEngine = require('../../services/chatEngine');
const metrics = require('../../services/metrics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('AI ile hafızalı sohbet et')
    .addStringOption(option => option
      .setName('mesaj')
      .setDescription('Ne yazmak istiyorsun?')
      .setRequired(true)
      .setMaxLength(1800)),

  run: async (client, interaction) => {
    const content = interaction.options.getString('mesaj', true);
    await interaction.deferReply();
    metrics.inc('aiRequests');
    const result = await chatEngine.replyRich({
      userId: interaction.user.id,
      userName: interaction.user.username,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      guild: interaction.guild,
      content,
    });
    const sent = await interaction.editReply({ content: result.content, allowedMentions: { repliedUser: false } });
    metrics.reply({ user: interaction.user.username, guildId: interaction.guildId || 'dm', channelId: interaction.channelId, content: result.content.slice(0, 220), mood: result.mood });
    if (sent && result.actions?.react) {
      const reacts = Array.isArray(result.actions.react) ? result.actions.react : [result.actions.react];
      for (const r of reacts) {
        await sent.react(r).then(() => metrics.inc('reactions')).catch(() => null);
      }
    }
  },
};
