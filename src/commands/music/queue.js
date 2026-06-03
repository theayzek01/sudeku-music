const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Çalma sırasını listeler.'),
  aliases: ['q', 'sira'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Sırada şarkı bulunmuyor.**`
        }],
        ephemeral: true
      });
    }

    const list = queue.tracks.slice(0, 10).map((t, idx) => {
      return `\`${idx + 1}.\` [**${t.title}**](${t.url || t.spotifyUrl}) | \`${t.duration}\` | <@${t.requester.id}>`;
    }).join('\n');

    const desc = `**Şu An Çalıyor:**\n[**${queue.currentTrack.title}**](${queue.currentTrack.url || queue.currentTrack.spotifyUrl})\n\n**Sıra:**\n${list || '*Kuyruk boş.*'}`;

    return interaction.reply({
      embeds: [{
        title: `${EMOJIS.note} Çalma Sırası`,
        description: desc,
        color: 0x8b5cf6,
        footer: { text: `Toplam ${queue.tracks.length} şarkı var.` }
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Sırada şarkı bulunmuyor.**`
        }]
      });
    }

    const list = queue.tracks.slice(0, 10).map((t, idx) => {
      return `\`${idx + 1}.\` [**${t.title}**](${t.url || t.spotifyUrl}) | \`${t.duration}\` | <@${t.requester.id}>`;
    }).join('\n');

    const desc = `**Şu An Çalıyor:**\n[**${queue.currentTrack.title}**](${queue.currentTrack.url || queue.currentTrack.spotifyUrl})\n\n**Sıra:**\n${list || '*Kuyruk boş.*'}`;

    return message.reply({
      embeds: [{
        title: `${EMOJIS.note} Çalma Sırası`,
        description: desc,
        color: 0x8b5cf6,
        footer: { text: `Toplam ${queue.tracks.length} şarkı var.` }
      }]
    });
  }
};
