const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Belirtilen miktarda mesajı kanaldan siler.')
    .addIntegerOption(option =>
      option.setName('miktar')
        .setDescription('Silinecek mesaj sayısı (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  aliases: ['sil', 'temizle-mesaj'],
  category: 'moderation',
  
  async execute(interaction) {
    const amount = interaction.options.getInteger('miktar');
    
    await interaction.channel.bulkDelete(amount, true).then(deleted => {
      interaction.reply({
        embeds: [{
          color: 0x8b5cf6,
          description: `${EMOJIS.tick} **${deleted.size}** mesaj başarıyla silindi.`
        }],
        ephemeral: true
      });
    }).catch(err => {
      interaction.reply({
        content: `${EMOJIS.cross} Mesajlar silinirken bir hata oluştu. (14 günden eski mesajlar toplu silinemez)`,
        ephemeral: true
      });
    });
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın!`);
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply(`${EMOJIS.cross} Lütfen 1 ile 100 arasında geçerli bir mesaj sayısı girin!`);
    }

    await message.channel.bulkDelete(amount, true).then(async deleted => {
      const response = await message.channel.send({
        embeds: [{
          color: 0x8b5cf6,
          description: `${EMOJIS.tick} **${deleted.size}** mesaj başarıyla silindi.`
        }]
      });
      setTimeout(() => response.delete().catch(() => null), 4000);
    }).catch(err => {
      message.reply(`${EMOJIS.cross} Mesajlar silinirken bir hata oluştu. (14 günden eski mesajlar toplu silinemez)`);
    });
  }
};
