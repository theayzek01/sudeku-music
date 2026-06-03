const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');
const { generateNowPlayingCard } = require('../../player/canvasGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Şu an çalan şarkıyı görsel kart ile gösterir.'),
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

    await interaction.deferReply();
    const track = queue.currentTrack;
    const ct = queue.playbackTimeMs || 0;

    try {
      const canvasBuffer = await generateNowPlayingCard(track, track.requester.username, ct);
      const attachment = new AttachmentBuilder(canvasBuffer, { name: 'nowplaying.png' });
      return interaction.editReply({
        files: [attachment]
      });
    } catch (err) {
      console.error('[Nowplaying Command Canvas Error]', err);
      // Fallback to text embed if canvas fails
      return interaction.editReply({
        embeds: [{
          title: `Şu An Çalıyor`,
          description: `${EMOJIS.note} [**${track.title}**](${track.url || track.spotifyUrl})\n\n**İsteyen:** <@${track.requester.id}>`,
          thumbnail: { url: track.thumbnail },
          color: 0x8b5cf6
        }]
      });
    }
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
    const ct = queue.playbackTimeMs || 0;

    try {
      const canvasBuffer = await generateNowPlayingCard(track, track.requester.username, ct);
      const attachment = new AttachmentBuilder(canvasBuffer, { name: 'nowplaying.png' });
      return message.reply({
        files: [attachment]
      });
    } catch (err) {
      console.error('[Nowplaying Command Canvas Error]', err);
      return message.reply({
        embeds: [{
          title: `Şu An Çalıyor`,
          description: `${EMOJIS.note} [**${track.title}**](${track.url || track.spotifyUrl})\n\n**İsteyen:** <@${track.requester.id}>`,
          thumbnail: { url: track.thumbnail },
          color: 0x8b5cf6
        }]
      });
    }
  }
};