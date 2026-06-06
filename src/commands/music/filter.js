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
          { name: 'Normal (Temiz)', value: 'none' },
          { name: 'Temiz Ses', value: 'clean' },
          { name: 'Netlik', value: 'clarity' },
          { name: 'Bassboost', value: 'bassboost' },
          { name: 'Derin Bass', value: 'deepbass' },
          { name: 'Vokal Boost', value: 'vocalboost' },
          { name: 'Vokal Kısma', value: 'vocalcut' },
          { name: 'Radio', value: 'radio' },
          { name: 'Nightcore', value: 'nightcore' },
          { name: 'Vaporwave', value: 'vaporwave' },
          { name: '8D', value: '8d' },
          { name: 'Echo', value: 'echo' },
          { name: 'Speedup', value: 'speedup' },
          { name: 'Slowmo', value: 'slowmo' }
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
        flags: 64
      });
    }

    const filterVal = interaction.options.getString('efekt');
    
    await interaction.deferReply();
    const success = await queue.setFilter(filterVal);
    
    if (!success) {
      return interaction.editReply({ content: `${EMOJIS.cross} Geçersiz filtre seçeneği.` });
    }

    const desc = filterVal === 'none' || filterVal === 'normal' ? 'Tüm filtreler temizlendi.' : `\`${filterVal}\` filtresi uygulandı.`;
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
    const valid = ['none', 'clear', 'normal', 'clean', 'clarity', 'bassboost', 'deepbass', 'vocalboost', 'vocalcut', 'radio', 'nightcore', 'vaporwave', '8d', 'echo', 'speedup', 'slowmo'];
    
    if (!filterVal || !valid.includes(filterVal)) {
      return message.reply({
        embeds: [{
          title: `${EMOJIS.note} Ses Filtreleri`,
          description: `Kullanabileceğin filtreler:\n` +
            `• \`${prefix}filter clean\`\n` +
            `• \`${prefix}filter clarity\`\n` +
            `• \`${prefix}filter bassboost\`\n` +
            `• \`${prefix}filter deepbass\`\n` +
            `• \`${prefix}filter vocalboost\`\n` +
            `• \`${prefix}filter vocalcut\`\n` +
            `• \`${prefix}filter radio\`\n` +
            `• \`${prefix}filter nightcore\`\n` +
            `• \`${prefix}filter vaporwave\`\n` +
            `• \`${prefix}filter 8d\`\n` +
            `• \`${prefix}filter echo\`\n` +
            `• \`${prefix}filter speedup\`\n` +
            `• \`${prefix}filter slowmo\`\n` +
            `• \`${prefix}filter clear\` (Filtreleri kapatır)`,
          color: 0x8b5cf6
        }]
      });
    }

    const mappedVal = (filterVal === 'clear' || filterVal === 'normal') ? 'none' : filterVal;
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
