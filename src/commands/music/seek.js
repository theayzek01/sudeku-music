const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Şarkıyı belirli bir saniyeye/dakikaya sarar.')
    .addStringOption(option =>
      option.setName('sure')
        .setDescription('Örn: 90 (saniye) veya 1:30 (dakika:saniye)')
        .setRequired(true)
    ),
  aliases: ['sar', 'ilerisar'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif çalan bir şarkı yok!**`
        }],
        flags: 64
      });
    }

    const timeStr = interaction.options.getString('sure');
    let seconds = 0;
    
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const mins = parseInt(parts[0]);
      const secs = parseInt(parts[1]);
      if (isNaN(mins) || isNaN(secs)) {
        return interaction.reply({ content: `${EMOJIS.cross} Geçersiz süre formatı! Örn: \`1:30\``, flags: 64 });
      }
      seconds = mins * 60 + secs;
    } else {
      seconds = parseInt(timeStr);
      if (isNaN(seconds)) {
        return interaction.reply({ content: `${EMOJIS.cross} Geçersiz saniye! Örn: \`90\``, flags: 64 });
      }
    }

    const maxSec = Math.floor(queue.currentTrack.durationMs / 1000);
    if (seconds < 0 || seconds > maxSec) {
      return interaction.reply({
        content: `${EMOJIS.cross} Geçersiz süre! Şarkı süresini aşamaz (0 - ${maxSec} saniye arası olmalı).`,
        flags: 64
      });
    }

    await interaction.deferReply();
    await queue.seek(seconds);
    
    return interaction.editReply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Şarkı \`${timeStr}\` konumuna sarıldı.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif çalan bir şarkı yok!**`
        }]
      });
    }

    const timeStr = args[0];
    if (!timeStr) {
      return message.reply({ content: `${EMOJIS.cross} Örn: \`a.seek 1:30\` veya \`a.seek 90\`` });
    }

    let seconds = 0;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const mins = parseInt(parts[0]);
      const secs = parseInt(parts[1]);
      if (isNaN(mins) || isNaN(secs)) return message.reply(`${EMOJIS.cross} Geçersiz süre formatı! Örn: \`1:30\``);
      seconds = mins * 60 + secs;
    } else {
      seconds = parseInt(timeStr);
      if (isNaN(seconds)) return message.reply(`${EMOJIS.cross} Geçersiz saniye! Örn: \`90\``);
    }

    const maxSec = Math.floor(queue.currentTrack.durationMs / 1000);
    if (seconds < 0 || seconds > maxSec) {
      return message.reply(`${EMOJIS.cross} Geçersiz süre! Şarkı süresini aşamaz (0 - ${maxSec} saniye arası).`);
    }

    const loadingMsg = await message.reply({ content: `${EMOJIS.loading} Sarılıyor...` });
    await queue.seek(seconds);
    return loadingMsg.edit({
      content: null,
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Şarkı \`${timeStr}\` konumuna sarıldı.**`
      }]
    });
  }
};
