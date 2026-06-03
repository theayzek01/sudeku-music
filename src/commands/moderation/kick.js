const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Belirtilen kullanıcıyı sunucudan atar.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Atılacak üye')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep')
        .setDescription('Atılma sebebi')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  aliases: ['at'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`, ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcıyı atmaya yetkim yetmiyor!`, ephemeral: true });
    }

    await member.kick(reason);

    await interaction.reply({
      embeds: [{
        color: 0xffaa00,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye atıldı.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${interaction.user.id}>`
      }]
    });

    sendModLog(interaction.guild, 'KICK', user, interaction.user, reason);
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Üyeleri At** yetkisine sahip olmalısın!`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir üye etiketleyin veya ID girin!`);
    }

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`);
    }

    if (!member.kickable) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcıyı atmaya yetkim yetmiyor!`);
    }

    await member.kick(reason);

    message.reply({
      embeds: [{
        color: 0xffaa00,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye atıldı.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${message.author.id}>`
      }]
    });

    sendModLog(message.guild, 'KICK', user, message.author, reason);
  }
};

async function sendModLog(guild, action, targetUser, moderator, reason) {
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
        { name: 'Sebep', value: `\`${reason}\``, inline: false }
      ],
      color: 0xffaa00,
      timestamp: new Date().toISOString()
    }]
  }).catch(() => null);
}
