const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Bir kullanıcının uyarı geçmişini görüntüler.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Uyarılarına bakılacak üye')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['uyarilar', 'sicil'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const userWarns = Database.getWarns(interaction.guildId, user.id);

    if (userWarns.length === 0) {
      return interaction.reply({
        embeds: [{
          color: 0x8b5cf6,
          description: `${EMOJIS.tick} **${user.tag}** adlı kullanıcının hiç uyarısı bulunmuyor.`
        }]
      });
    }

    const list = userWarns.map((w, idx) => {
      const dateStr = new Date(w.date).toLocaleDateString('tr-TR');
      return `\`#${idx + 1}\` | ID: \`${w.id}\` | **Sebep:** \`${w.reason}\` | **Yetkili:** <@${w.moderatorId}> | \`${dateStr}\``;
    }).join('\n');

    return interaction.reply({
      embeds: [{
        title: `${EMOJIS.moderator} ${user.tag} - Uyarı Sicili`,
        description: list,
        color: 0xffaa00,
        footer: { text: `Toplam ${userWarns.length} uyarı bulunuyor.` }
      }]
    });
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için yetkiniz bulunmuyor.`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null) || message.author;
    const userWarns = Database.getWarns(message.guildId, user.id);

    if (userWarns.length === 0) {
      return message.reply({
        embeds: [{
          color: 0x8b5cf6,
          description: `${EMOJIS.tick} **${user.tag}** adlı kullanıcının hiç uyarısı bulunmuyor.`
        }]
      });
    }

    const list = userWarns.map((w, idx) => {
      const dateStr = new Date(w.date).toLocaleDateString('tr-TR');
      return `\`#${idx + 1}\` | ID: \`${w.id}\` | **Sebep:** \`${w.reason}\` | **Yetkili:** <@${w.moderatorId}> | \`${dateStr}\``;
    }).join('\n');

    return message.reply({
      embeds: [{
        title: `${EMOJIS.moderator} ${user.tag} - Uyarı Sicili`,
        description: list,
        color: 0xffaa00,
        footer: { text: `Toplam ${userWarns.length} uyarı bulunuyor.` }
      }]
    });
  }
};
