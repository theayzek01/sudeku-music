const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

function buildNowPlayingEmbed(track, playbackTimeMs = 0) {
  const current = Math.floor(playbackTimeMs / 1000);
  const total = track.durationMs ? Math.floor(track.durationMs / 1000) : 0;
  const currentMin = Math.floor(current / 60);
  const currentSec = String(current % 60).padStart(2, '0');
  const totalMin = Math.floor(total / 60);
  const totalSec = String(total % 60).padStart(2, '0');

  const embed = {
      color: 0x8b5cf6,
      title: 'Şu An Çalıyor',
      description: [
        `${EMOJIS.note} [**${track.title}**](${track.url || track.spotifyUrl})`,
        '',
        `**Süre:** \`${track.duration || `${totalMin}:${totalSec}`}\``,
        `**İsteyen:** <@${track.requester.id}>`,
        `**Zaman:** \`${currentMin}:${currentSec} / ${totalMin}:${totalSec}\``
      ].join('\n'),
      footer: { text: 'Sudeku Music' }
  };

  if (track.thumbnail) {
    embed.thumbnail = { url: track.thumbnail };
  }

  return { embeds: [embed] };
}

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
        flags: 64
      });
    }

    return interaction.reply(buildNowPlayingEmbed(queue.currentTrack, queue.playbackTimeMs || 0));
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

    return message.reply(buildNowPlayingEmbed(queue.currentTrack, queue.playbackTimeMs || 0));
  }
};
