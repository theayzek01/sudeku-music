const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Kanalın yavaş mod süresini ayarlar.')
    .addIntegerOption(option =>
      option.setName('süre')
        .setDescription('Yavaş mod süresi (saniye cinsinden, 0 kapatır)')
        .setRequired(true)
        .setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  aliases: ['yavasmod', 'yavas-mod'],
  category: 'moderation',
  
  async execute(interaction) {
    const seconds = interaction.options.getInteger('süre');
    await interaction.channel.setRateLimitPerUser(seconds);

    const desc = seconds === 0 ? 'Yavaş mod kapatıldı.' : `Yavaş mod süresi **${seconds} saniye** olarak ayarlandı.`;
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${desc}**`
      }]
    });
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısın!`);
    }

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir saniye girin! Örn: \`${prefix}slowmode 5\``);
    }

    await message.channel.setRateLimitPerUser(seconds);
    const desc = seconds === 0 ? 'Yavaş mod kapatıldı.' : `Yavaş mod süresi **${seconds} saniye** olarak ayarlandı.`;
    
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${desc}**`
      }]
    });
  }
};
