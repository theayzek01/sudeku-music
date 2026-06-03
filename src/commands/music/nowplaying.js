const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');
const { formatMs } = require('../../player/search');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Şu an çalan şarkıyı gösterir.'),
  aliases: ['np', 'calan'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Şu an hiçbir şey çalmıyor.**`
        }],
        ephemeral: true
      });
    }

    const track = queue.currentTrack;
    const pb = queue.getProgressBar(15);
    const ct = queue.playbackTimeMs;

    return interaction.reply({
      embeds: [{
        title: `${EMOJIS.note} Şu An Çalıyor`,
        description: `[**${track.title}**](${track.url || track.spotifyUrl})\n\n${pb} \`[${formatMs(ct)} / ${track.duration}]\`\n\n**İsteyen:** <@${track.requester.id}>`,
        thumbnail: { url: track.thumbnail },
        color: 0x8b5cf6
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Şu an hiçbir şey çalmıyor.**`
        }]
      });
    }

    const track = queue.currentTrack;
    const pb = queue.getProgressBar(15);
    const ct = queue.playbackTimeMs;

    return message.reply({
      embeds: [{
        title: `${EMOJIS.note} Şu An Çalıyor`,
        description: `[**${track.title}**](${track.url || track.spotifyUrl})\n\n${pb} \`[${formatMs(ct)} / ${track.duration}]\`\n\n**İsteyen:** <@${track.requester.id}>`,
        thumbnail: { url: track.thumbnail },
        color: 0x8b5cf6
      }]
    });
  }
};
