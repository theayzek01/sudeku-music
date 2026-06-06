const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Çalmayı durdurur ve kanaldan ayrılır.'),
  aliases: ['dc', 'leave', 'kapat', 'durdur'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }],
        flags: 64
      });
    }

    queue.destroy();
    return interaction.reply({
      embeds: [{
        color: 0x121214,
        description: `${EMOJIS.moon} **Müzik durduruldu, sıradan çıkıldı.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }]
      });
    }

    queue.destroy();
    return message.reply({
      embeds: [{
        color: 0x121214,
        description: `${EMOJIS.moon} **Müzik durduruldu, sıradan çıkıldı.**`
      }]
    });
  }
};
