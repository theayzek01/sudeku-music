const { SlashCommandBuilder } = require('discord.js');
const { search } = require('../../player/search');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Müzik çalar veya sıraya ekler.')
    .addStringOption(option =>
      option.setName('sorgu')
        .setDescription('Şarkı adı veya YouTube / Spotify bağlantısı.')
        .setRequired(true)
    ),
  aliases: ['p'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const query = interaction.options.getString('sorgu');
    const voiceChannel = interaction.member.voice.channel;
    
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Önce bir ses kanalına katılmalısınız!**`
        }],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const tracks = await search(query, interaction.user);
      if (tracks.length === 0) {
        return interaction.editReply({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **Sonuç bulunamadı!**`
          }]
        });
      }

      const queue = playerManager.getOrCreateQueue(interaction.guildId, voiceChannel.id, interaction.channel);
      queue.addTrack(tracks);

      if (tracks.length > 1) {
        return interaction.editReply({
          embeds: [{
            color: 0x8b5cf6,
            description: `${EMOJIS.tick} **${tracks.length} şarkı** başarıyla sıraya eklendi.`
          }]
        });
      } else {
        return interaction.editReply({
          embeds: [{
            color: 0x8b5cf6,
            description: `${EMOJIS.tick} [**${tracks[0].title}**](${tracks[0].url || tracks[0].spotifyUrl}) sıraya eklendi.`
          }]
        });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} Şarkı eklenirken hata oluştu: \`${err.message}\``
        }]
      });
    }
  },

  async run(message, args, client, prefix, playerManager) {
    const query = args.join(' ');
    if (!query) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Lütfen bir şarkı ismi veya YouTube/Spotify linki girin!**`
        }]
      });
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Önce bir ses kanalına katılmalısınız!**`
        }]
      });
    }

    const loadingMsg = await message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.loading} **Şarkı aranıyor...**`
      }]
    });

    try {
      const tracks = await search(query, message.author);
      if (tracks.length === 0) {
        return loadingMsg.edit({
          embeds: [{
            color: 0xff3333,
            description: `${EMOJIS.cross} **Sonuç bulunamadı!**`
          }]
        });
      }

      const queue = playerManager.getOrCreateQueue(message.guildId, voiceChannel.id, message.channel);
      queue.addTrack(tracks);

      if (tracks.length > 1) {
        return loadingMsg.edit({
          embeds: [{
            color: 0x8b5cf6,
            description: `${EMOJIS.tick} **${tracks.length} şarkı** başarıyla sıraya eklendi.`
          }]
        });
      } else {
        return loadingMsg.edit({
          embeds: [{
            color: 0x8b5cf6,
            description: `${EMOJIS.tick} [**${tracks[0].title}**](${tracks[0].url || tracks[0].spotifyUrl}) sıraya eklendi.`
          }]
        });
      }
    } catch (err) {
      console.error(err);
      return loadingMsg.edit({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} Şarkı eklenirken hata oluştu: \`${err.message}\``
        }]
      });
    }
  }
};
