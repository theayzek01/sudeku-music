const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const adaptiveState = require('../../services/adaptiveState');
const guildConfig = require('../../services/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adapt')
    .setDescription('Sunucu/DM konuşma tarzı adaptasyon durumunu göster'),

  run: async (client, interaction) => {
    const style = adaptiveState.styleContext({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
    });
    const cfg = guildConfig.get(interaction.guildId || 'dm');
    const lines = [
      `ruh hali: ${style.mood}`,
      `saat: ${style.hour}`,
      `ortalama mesaj uzunluğu: ${style.avgLen}`,
      `duygu skoru: ${style.sentiment}`,
      `ortam kelimeleri: ${style.topWords.slice(0, 18).join(', ') || 'henüz yok'}`,
      `ortam emojisi: ${style.emoji || 'henüz yok'}`,
      `ayarlar: ${JSON.stringify(cfg)}`,
    ];
    await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
  },
};
