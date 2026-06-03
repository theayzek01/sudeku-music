const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Kullanıcıyı uyarır ve veritabanına kaydeder.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Uyarılacak üye')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep')
        .setDescription('Uyarı sebebi')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['uyar'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`, ephemeral: true });
    }

    if (user.bot) {
      return interaction.reply({ content: `${EMOJIS.cross} Botları uyaramazsın!`, ephemeral: true });
    }

    const warnId = Database.addWarn(interaction.guildId, user.id, interaction.user.id, reason);
    const userWarns = Database.getWarns(interaction.guildId, user.id);

    // DM notify
    await member.send({
      embeds: [{
        color: 0xff3333,
        description: `${EMOJIS.moderator} **${interaction.guild.name}** sunucusunda uyarıldın!\n\n**Sebep:** \`${reason}\`\n**Uyarı ID:** \`${warnId}\``
      }]
    }).catch(() => null);

    await interaction.reply({
      embeds: [{
        color: 0xffaa00,
        description: `${EMOJIS.moderator} **${user.tag}** başarıyla uyarıldı.\n\n**Sebep:** \`${reason}\`\n**Uyarı ID:** \`${warnId}\`\n**Toplam Uyarı Sayısı:** \`${userWarns.length}\`\n**Yetkili:** <@${interaction.user.id}>`
      }]
    });

    sendModLog(interaction.guild, `UYARI (${warnId})`, user, interaction.user, reason, userWarns.length);
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Üyeleri Sustur** yetkisine sahip olmalısın!`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir üye etiketleyin veya ID girin!`);
    }

    if (user.bot) {
      return message.reply(`${EMOJIS.cross} Botları uyaramazsın!`);
    }

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`);
    }

    const warnId = Database.addWarn(message.guildId, user.id, message.author.id, reason);
    const userWarns = Database.getWarns(message.guildId, user.id);

    // DM notify
    await member.send({
      embeds: [{
        color: 0xff3333,
        description: `${EMOJIS.moderator} **${message.guild.name}** sunucusunda uyarıldın!\n\n**Sebep:** \`${reason}\`\n**Uyarı ID:** \`${warnId}\``
      }]
    }).catch(() => null);

    message.reply({
      embeds: [{
        color: 0xffaa00,
        description: `${EMOJIS.moderator} **${user.tag}** başarıyla uyarıldı.\n\n**Sebep:** \`${reason}\`\n**Uyarı ID:** \`${warnId}\`\n**Toplam Uyarı Sayısı:** \`${userWarns.length}\`\n**Yetkili:** <@${message.author.id}>`
      }]
    });

    sendModLog(message.guild, `UYARI (${warnId})`, user, message.author, reason, userWarns.length);
  }
};

async function sendModLog(guild, action, targetUser, moderator, reason, totalWarns) {
  const config = Database.getGuildConfig(guild.id);
  if (!config || !config.logChannelId) return;

  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;

  logChannel.send({
    embeds: [{
      title: `${EMOJIS.moderator} Moderasyon İşlemi: ${action}`,
      fields: [
        { name: 'Kullanıcı', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${moderator.tag} (\`${moderator.id}\`)`, inline: true },
        { name: 'Toplam Uyarı', value: `\`${totalWarns}\``, inline: true },
        { name: 'Sebep', value: `\`${reason}\``, inline: false }
      ],
      color: 0xffaa00,
      timestamp: new Date().toISOString()
    }]
  }).catch(() => null);
}
