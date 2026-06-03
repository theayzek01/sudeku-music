const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Müziğe ses filtresi uygular.')
    .addStringOption(option =>
      option.setName('efekt')
        .setDescription('Uygulanacak filtre')
        .setRequired(true)
        .addChoices(
          { name: 'Filtreyi Temizle (Normal)', value: 'none' },
          { name: 'Bassboost (Aşırı Bass)', value: 'bassboost' },
          { name: 'Nightcore (Hızlı & Tiz)', value: 'nightcore' },
          { name: '8D (Kulaklıkta Dönen Ses)', value: '8d' },
          { name: 'Vaporwave (Yavaş & Estetik)', value: 'vaporwave' },
          { name: 'Karaoke (Vokali Kısar)', value: 'karaoke' },
          { name: 'Speedup (1.5x Hız)', value: 'speedup' },
          { name: 'Slowmo (0.75x Hız)', value: 'slowmo' }
        )
    ),
  aliases: ['filtre', 'efekt'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif çalan bir şarkı yok!**`
        }],
        ephemeral: true
      });
    }

    const filterVal = interaction.options.getString('efekt');
    
    await interaction.deferReply();
    const success = await queue.setFilter(filterVal);
    
    if (!success) {
      return interaction.editReply({ content: `${EMOJIS.cross} Geçersiz filtre seçeneği.` });
    }

    const desc = filterVal === 'none' ? 'Tüm filtreler temizlendi.' : `\`${filterVal}\` filtresi uygulandı.`;
    return interaction.editReply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${desc}**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif çalan bir şarkı yok!**`
        }]
      });
    }

    const filterVal = args[0] ? args[0].toLowerCase() : null;
    const valid = ['none', 'clear', 'bassboost', 'nightcore', '8d', 'vaporwave', 'karaoke', 'speedup', 'slowmo'];
    
    if (!filterVal || !valid.includes(filterVal)) {
      return message.reply({
        embeds: [{
          title: `${EMOJIS.note} Ses Filtreleri`,
          description: `Kullanabileceğin filtreler:\n` +
            `• \`${prefix}filter bassboost\`\n` +
            `• \`${prefix}filter nightcore\`\n` +
            `• \`${prefix}filter 8d\`\n` +
            `• \`${prefix}filter vaporwave\`\n` +
            `• \`${prefix}filter karaoke\`\n` +
            `• \`${prefix}filter speedup\`\n` +
            `• \`${prefix}filter slowmo\`\n` +
            `• \`${prefix}filter clear\` (Filtreleri kapatır)`,
          color: 0x8b5cf6
        }]
      });
    }

    const mappedVal = filterVal === 'clear' ? 'none' : filterVal;
    const loadingMsg = await message.reply({ content: `${EMOJIS.loading} Filtre uygulanıyor (şarkı sarılıyor)...` });
    
    await queue.setFilter(mappedVal);
    const desc = mappedVal === 'none' ? 'Tüm filtreler temizlendi.' : `\`${mappedVal}\` filtresi uygulandı.`;
    
    return loadingMsg.edit({
      content: null,
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${desc}**`
      }]
    });
  }
};
