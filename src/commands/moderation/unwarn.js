const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Kullanıcının belirtilen ID\'deki uyarısını siler.')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Uyarı ID\'si (Sorgulamak için /warns kullanın)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['uyarisil'],
  category: 'moderation',
  
  async execute(interaction) {
    const warnId = interaction.options.getString('id');
    const success = Database.removeWarn(warnId);

    if (!success) {
      return interaction.reply({ content: `${EMOJIS.cross} \`${warnId}\` ID'sine sahip bir uyarı bulunamadı!`, ephemeral: true });
    }

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **\`${warnId}\`** ID'li uyarı başarıyla silindi.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için yetkiniz bulunmuyor.`);
    }

    const warnId = args[0];
    if (!warnId) {
      return message.reply(`${EMOJIS.cross} Lütfen silinecek uyarının ID'sini belirtin! Örn: \`${prefix}unwarn abc1234\``);
    }

    const success = Database.removeWarn(warnId);

    if (!success) {
      return message.reply(`${EMOJIS.cross} \`${warnId}\` ID'sine sahip bir uyarı bulunamadı!`);
    }

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **\`${warnId}\`** ID'li uyarı başarıyla silindi.`
      }]
    });
  }
};
