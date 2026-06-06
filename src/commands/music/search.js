const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { search } = require('../../player/search');
const EMOJIS = require('../../utils/emojis');

function pickEmoji(track) {
  return track.source === 'spotify' ? EMOJIS.spotify : EMOJIS.youtube;
}

function buildEmbed(query, tracks, index) {
  const track = tracks[index];
  const embed = {
      color: 0x8b5cf6,
      title: `${EMOJIS.note} Arama Sonuçları`,
      description: [
        `**Sorgu:** \`${query}\``,
        `**Sonuç:** \`${index + 1}/${tracks.length}\``,
        '',
        `${pickEmoji(track)} [**${track.title}**](${track.url || track.spotifyUrl || 'https://www.youtube.com'})`,
        `• **Süre:** \`${track.duration || 'Bilinmiyor'}\``,
        `• **İsteyen:** <@${track.requester.id}>`
      ].join('\n'),
      footer: { text: 'Oklarla gez, çal butonuyla sıraya ekle.' }
  };

  if (track.thumbnail) {
    embed.thumbnail = { url: track.thumbnail };
  }

  return { embeds: [embed] };
}

function buildRows(disabled = false) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('search_prev').setEmoji('◀').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('search_play').setLabel('Çal').setEmoji(EMOJIS.play).setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('search_next').setEmoji('▶').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('search_close').setLabel('Kapat').setEmoji(EMOJIS.cross).setStyle(ButtonStyle.Danger).setDisabled(disabled)
  )];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Müzik arar ve sonuçları oklarla gezdirir.')
    .addStringOption(option =>
      option.setName('sorgu')
        .setDescription('Aranacak şarkı veya bağlantı')
        .setRequired(true)
    ),
  aliases: ['ara'],
  category: 'music',

  async execute(interaction, playerManager) {
    const query = interaction.options.getString('sorgu');
    await interaction.deferReply();

    const tracks = await search(query, interaction.user);
    if (!tracks.length) {
      return interaction.editReply({ content: `${EMOJIS.cross} Sonuç bulunamadı.` });
    }

    let index = 0;
    const response = await interaction.editReply({ ...buildEmbed(query, tracks, index), components: buildRows() });
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: `${EMOJIS.cross} Bu arama sana ait değil.`, flags: 64 });
      }

      if (i.customId === 'search_close') {
        collector.stop('closed');
        return i.update({ components: buildRows(true) });
      }

      if (i.customId === 'search_prev') {
        index = (index - 1 + tracks.length) % tracks.length;
        return i.update({ ...buildEmbed(query, tracks, index), components: buildRows() });
      }

      if (i.customId === 'search_next') {
        index = (index + 1) % tracks.length;
        return i.update({ ...buildEmbed(query, tracks, index), components: buildRows() });
      }

      if (i.customId === 'search_play') {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return i.reply({ content: `${EMOJIS.cross} Önce bir ses kanalına girmen lazım.`, flags: 64 });
        }

        const track = tracks[index];
        const queue = playerManager.getOrCreateQueue(interaction.guildId, voiceChannel.id, interaction.channel);
        queue.addTrack(track);
        return i.reply({ content: `${EMOJIS.tick} Sıraya eklendi: **${track.title}**`, flags: 64 });
      }
    });

    collector.on('end', async () => {
      await response.edit({ components: buildRows(true) }).catch(() => {});
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const query = args.join(' ');
    if (!query) {
      return message.reply(`${EMOJIS.cross} Kullanım: \`${prefix}search şarkı adı\``);
    }

    const tracks = await search(query, message.author);
    if (!tracks.length) {
      return message.reply(`${EMOJIS.cross} Sonuç bulunamadı.`);
    }

    let index = 0;
    const response = await message.reply({ ...buildEmbed(query, tracks, index), components: buildRows() });
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: `${EMOJIS.cross} Bu arama sana ait değil.`, flags: 64 });
      }

      if (i.customId === 'search_close') {
        collector.stop('closed');
        return i.update({ components: buildRows(true) });
      }

      if (i.customId === 'search_prev') {
        index = (index - 1 + tracks.length) % tracks.length;
        return i.update({ ...buildEmbed(query, tracks, index), components: buildRows() });
      }

      if (i.customId === 'search_next') {
        index = (index + 1) % tracks.length;
        return i.update({ ...buildEmbed(query, tracks, index), components: buildRows() });
      }

      if (i.customId === 'search_play') {
        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) {
          return i.reply({ content: `${EMOJIS.cross} Önce bir ses kanalına girmen lazım.`, flags: 64 });
        }

        const track = tracks[index];
        const queue = playerManager.getOrCreateQueue(message.guildId, voiceChannel.id, message.channel);
        queue.addTrack(track);
        return i.reply({ content: `${EMOJIS.tick} Sıraya eklendi: **${track.title}**`, flags: 64 });
      }
    });

    collector.on('end', async () => {
      await response.edit({ components: buildRows(true) }).catch(() => {});
    });
  }
};
