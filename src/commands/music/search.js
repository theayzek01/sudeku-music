const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { search } = require('../../player/search');
const EMOJIS = require('../../utils/emojis');

function pickEmoji(track) {
  return track.source === 'spotify' ? EMOJIS.spotify : EMOJIS.youtube;
}

function withEmoji(button, emoji) {
  return emoji ? button.setEmoji(emoji) : button;
}

function buildEmbed(query, tracks, index) {
  const track = tracks[index];
  const list = tracks.slice(0, 5).map((item, idx) => {
    const marker = idx === index ? '>' : ' ';
    return `${marker} ${idx + 1}. ${pickEmoji(item)} [**${item.title}**](${item.url || item.spotifyUrl || 'https://www.youtube.com'}) | ${item.duration || 'Bilinmiyor'}`;
  }).join('\n');

  const embed = {
    color: 0x8b5cf6,
    title: `${EMOJIS.note} Arama Sonuçları`,
    description: [
      `**Sorgu:** \`${query}\``,
      `**Seçili:** \`${index + 1}/${tracks.length}\``,
      '',
      `${pickEmoji(track)} [**${track.title}**](${track.url || track.spotifyUrl || 'https://www.youtube.com'})`,
      `Süre: \`${track.duration || 'Bilinmiyor'}\``,
      `İsteyen: <@${track.requester.id}>`,
      '',
      'İlk 5 sonuç:',
      list
    ].join('\n'),
    footer: { text: 'Oklarla gez, çal butonuyla sıraya ekle.' }
  };

  if (track.thumbnail) {
    embed.thumbnail = { url: track.thumbnail };
  }

  return { embeds: [embed] };
}

function buildRows(disabled = false) {
  const prev = withEmoji(new ButtonBuilder().setCustomId('search_prev').setLabel('Önceki').setStyle(ButtonStyle.Secondary).setDisabled(disabled), EMOJIS.prev);
  const play = withEmoji(new ButtonBuilder().setCustomId('search_play').setLabel('Çal').setStyle(ButtonStyle.Success).setDisabled(disabled), EMOJIS.play);
  const next = withEmoji(new ButtonBuilder().setCustomId('search_next').setLabel('Sonraki').setStyle(ButtonStyle.Secondary).setDisabled(disabled), EMOJIS.skip);
  const close = withEmoji(new ButtonBuilder().setCustomId('search_close').setLabel('Kapat').setStyle(ButtonStyle.Danger).setDisabled(disabled), EMOJIS.cross);
  return [new ActionRowBuilder().addComponents(prev, play, next, close)];
}

async function handleCollect(i, ownerId, query, tracks, state, playerManager) {
  if (i.user.id !== ownerId) {
    return i.reply({ content: `${EMOJIS.cross} Bu arama sana ait değil.`, flags: 64 });
  }

  if (i.customId === 'search_close') {
    state.collector.stop('closed');
    return i.update({ components: buildRows(true) });
  }

  if (i.customId === 'search_prev') {
    state.index = (state.index - 1 + tracks.length) % tracks.length;
    return i.update({ ...buildEmbed(query, tracks, state.index), components: buildRows() });
  }

  if (i.customId === 'search_next') {
    state.index = (state.index + 1) % tracks.length;
    return i.update({ ...buildEmbed(query, tracks, state.index), components: buildRows() });
  }

  if (i.customId === 'search_play') {
    const voiceChannel = i.member?.voice?.channel;
    if (!voiceChannel) {
      return i.reply({ content: `${EMOJIS.cross} Önce bir ses kanalına girmen lazım.`, flags: 64 });
    }

    const track = tracks[state.index];
    const queue = playerManager.getOrCreateQueue(i.guildId, voiceChannel.id, i.channel);
    queue.addTrack(track);
    return i.reply({ content: `${EMOJIS.tick} Sıraya eklendi: **${track.title}**`, flags: 64 });
  }
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

    const tracks = await search(query, interaction.user, 5);
    if (!tracks.length) {
      return interaction.editReply({ content: `${EMOJIS.cross} Sonuç bulunamadı.` });
    }

    const state = { index: 0, collector: null };
    const response = await interaction.editReply({ ...buildEmbed(query, tracks, state.index), components: buildRows() });
    state.collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
    state.collector.on('collect', i => handleCollect(i, interaction.user.id, query, tracks, state, playerManager));
    state.collector.on('end', async () => {
      await response.edit({ components: buildRows(true) }).catch(() => {});
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const query = args.join(' ');
    if (!query) {
      return message.reply(`${EMOJIS.cross} Kullanım: \`${prefix}search şarkı adı\``);
    }

    const tracks = await search(query, message.author, 5);
    if (!tracks.length) {
      return message.reply(`${EMOJIS.cross} Sonuç bulunamadı.`);
    }

    const state = { index: 0, collector: null };
    const response = await message.reply({ ...buildEmbed(query, tracks, state.index), components: buildRows() });
    state.collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });
    state.collector.on('collect', i => handleCollect(i, message.author.id, query, tracks, state, playerManager));
    state.collector.on('end', async () => {
      await response.edit({ components: buildRows(true) }).catch(() => {});
    });
  }
};
