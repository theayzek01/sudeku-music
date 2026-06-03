const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ses seviyesini ayarlar.')
    .addIntegerOption(option =>
      option.setName('seviye')
        .setDescription('Ses seviyesi (0-150)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(150)
    ),
  aliases: ['ses', 'vol'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }],
        ephemeral: true
      });
    }

    const vol = interaction.options.getInteger('seviye');
    queue.setVolume(vol);
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Ses seviyesi \`%${vol}\` olarak ayarlandı.**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }]
      });
    }

    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 150) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Lütfen 0 ile 150 arasında geçerli bir ses seviyesi girin!**`
        }]
      });
    }

    queue.setVolume(vol);
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Ses seviyesi \`%${vol}\` olarak ayarlandı.**`
      }]
    });
  }
};
