const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Sıradaki şarkıları karıştırır.'),
  aliases: ['karistir'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || queue.tracks.length < 2) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Sırayı karıştırmak için en az 2 şarkı olmalı!**`
        }],
        ephemeral: true
      });
    }

    queue.shuffle();
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Sıradaki şarkılar başarıyla karıştırıldı.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || queue.tracks.length < 2) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Sırayı karıştırmak için en az 2 şarkı olmalı!**`
        }]
      });
    }

    queue.shuffle();
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Sıradaki şarkılar başarıyla karıştırıldı.**`
      }]
    });
  }
};
