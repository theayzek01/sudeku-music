const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Belirtilen kullanıcıyı sunucudan yasaklar.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Yasaklanacak üye')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep')
        .setDescription('Yasaklama sebebi')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  aliases: ['yasakla', 'yargila'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`, ephemeral: true });
    }

    if (!member.bannable) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcıyı yasaklamaya yetkim yetmiyor!`, ephemeral: true });
    }

    await member.ban({ reason });

    // Send confirmation
    await interaction.reply({
      embeds: [{
        color: 0xff3333,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye yasaklandı.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${interaction.user.id}>`
      }]
    });

    // Send to logs channel
    sendModLog(interaction.guild, 'BAN', user, interaction.user, reason);
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısın!`);
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

    if (!member.bannable) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcıyı yasaklamaya yetkim yetmiyor!`);
    }

    await member.ban({ reason });

    message.reply({
      embeds: [{
        color: 0xff3333,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye yasaklandı.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${message.author.id}>`
      }]
    });

    sendModLog(message.guild, 'BAN', user, message.author, reason);
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
      color: 0xff3333,
      timestamp: new Date().toISOString()
    }]
  }).catch(() => null);
}
