const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Çalan şarkının veya belirtilen şarkının sözlerini bulur.')
    .addStringOption(option =>
      option.setName('sarki')
        .setDescription('Şarkı adı (isteğe bağlı)')
        .setRequired(false)
    ),
  aliases: ['soz', 'sozler', 'ly'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    let query = interaction.options.getString('sarki');
    const queue = playerManager.getQueue(interaction.guildId);
    
    if (!query) {
      if (!queue || !queue.currentTrack) {
        return interaction.reply({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **Şu an çalan bir şarkı yok! Lütfen bir şarkı adı belirtin.**`
          }],
          ephemeral: true
        });
      }
      // Clean up title (remove official video, lyrics, etc.)
      query = queue.currentTrack.title
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .split('|')[0]
        .split('-')[1] || queue.currentTrack.title.split('-')[0];
    }

    await interaction.deferReply();

    try {
      const lyricsData = await fetchLyrics(query);
      if (!lyricsData) {
        return interaction.editReply({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **\`${query.trim()}\` için şarkı sözleri bulunamadı!**`
          }]
        });
      }

      const embeds = makeLyricsEmbeds(lyricsData);
      return interaction.editReply({ embeds });
    } catch (err) {
      console.error(err);
      return interaction.editReply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} Şarkı sözleri aranırken hata oluştu: \`${err.message}\``
        }]
      });
    }
  },

  async run(message, args, client, prefix, playerManager) {
    let query = args.join(' ');
    const queue = playerManager.getQueue(message.guildId);

    if (!query) {
      if (!queue || !queue.currentTrack) {
        return message.reply({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **Şu an çalan bir şarkı yok! Lütfen bir şarkı adı belirtin.**`
          }]
        });
      }
      query = queue.currentTrack.title
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .split('|')[0]
        .split('-')[1] || queue.currentTrack.title.split('-')[0];
    }

    const loadingMsg = await message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.loading} **\`${query.trim()}\` sözleri aranıyor...**`
      }]
    });

    try {
      const lyricsData = await fetchLyrics(query);
      if (!lyricsData) {
        return loadingMsg.edit({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **\`${query.trim()}\` için şarkı sözleri bulunamadı!**`
          }]
        });
      }

      const embeds = makeLyricsEmbeds(lyricsData);
      return loadingMsg.edit({ embeds, content: null });
    } catch (err) {
      console.error(err);
      return loadingMsg.edit({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} Şarkı sözleri aranırken hata oluştu: \`${err.message}\``
        }]
      });
    }
  }
};

async function fetchLyrics(title) {
  try {
    // Attempt 1: some-random-api.com
    const res = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(title)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.lyrics) {
        return {
          title: json.title,
          artist: json.author,
          lyrics: json.lyrics,
          thumbnail: json.thumbnail?.genius
        };
      }
    }
  } catch (e) {}

  try {
    // Attempt 2: lyrist API fallback
    const res2 = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(title)}`);
    if (res2.ok) {
      const json = await res2.json();
      if (json && json.lyrics) {
        return {
          title: json.title,
          artist: json.artist,
          lyrics: json.lyrics,
          thumbnail: json.image
        };
      }
    }
  } catch (e) {}

  return null;
}

function makeLyricsEmbeds(data) {
  const lyrics = data.lyrics;
  const chunks = [];
  
  // Discord limit is 4096, but let's cut at 1800 per embed description to look clean
  for (let i = 0; i < lyrics.length; i += 1800) {
    chunks.push(lyrics.slice(i, i + 1800));
  }

  const embeds = [];
  chunks.forEach((chunk, index) => {
    const embed = {
      title: index === 0 ? `${EMOJIS.note} ${data.artist} - ${data.title}` : null,
      description: chunk,
      color: 0x8b5cf6,
      footer: { text: `Sayfa ${index + 1}/${chunks.length}` }
    };
    if (index === 0 && data.thumbnail) {
      embed.thumbnail = { url: data.thumbnail };
    }
    embeds.push(embed);
  });

  return embeds;
}
