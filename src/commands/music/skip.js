const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Çalan şarkıyı geçer.'),
  aliases: ['s', 'next'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Şu an çalan bir şarkı bulunmuyor!**`
        }],
        flags: 64
      });
    }

    queue.skip();
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Şarkı başarıyla geçildi.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Şu an çalan bir şarkı bulunmuyor!**`
        }]
      });
    }

    queue.skip();
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Şarkı başarıyla geçildi.**`
      }]
    });
  }
};
