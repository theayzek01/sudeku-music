const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Bir kullanıcının tüm uyarılarını temizler.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Uyarıları temizlenecek üye')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['sicilitemizle', 'uyaritemizle'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const clearedCount = Database.clearWarns(interaction.guildId, user.id);

    if (clearedCount === 0) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **${user.tag}** adlı kullanıcının zaten uyarısı bulunmuyor.`
        }]
      });
    }

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${user.tag}** kullanıcısının tüm uyarıları (\`${clearedCount}\` adet) başarıyla temizlendi.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için yetkiniz bulunmuyor.`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir üye etiketleyin veya ID girin!`);
    }

    const clearedCount = Database.clearWarns(message.guildId, user.id);

    if (clearedCount === 0) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **${user.tag}** adlı kullanıcının zaten uyarısı bulunmuyor.`
        }]
      });
    }

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${user.tag}** kullanıcısının tüm uyarıları (\`${clearedCount}\` adet) başarıyla temizlendi.`
      }]
    });
  }
};
