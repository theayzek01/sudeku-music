const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Kullanıcının susturmasını kaldırır.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Susturması kaldırılacak üye')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['susturmakaldir', 'susturma-ac'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`, ephemeral: true });
    }

    const config = Database.getGuildConfig(interaction.guildId);
    let muteRole = config.muteRoleId ? interaction.guild.roles.cache.get(config.muteRoleId) : null;

    if (!muteRole) {
      muteRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'susturulmuş' || r.name.toLowerCase() === 'muted');
    }

    if (!muteRole || !member.roles.cache.has(muteRole.id)) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı zaten susturulmamış!`, ephemeral: true });
    }

    await member.roles.remove(muteRole, 'Susturma kaldırıldı.');

    await interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${user.tag}** adlı üyenin susturması kaldırıldı.\n**Yetkili:** <@${interaction.user.id}>`
      }]
    });

    sendModLog(interaction.guild, 'UNMUTE (ROLE)', user, interaction.user);
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için yetkiniz bulunmuyor.`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir üye etiketleyin veya ID girin!`);
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`);
    }

    const config = Database.getGuildConfig(message.guildId);
    let muteRole = config.muteRoleId ? message.guild.roles.cache.get(config.muteRoleId) : null;

    if (!muteRole) {
      muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'susturulmuş' || r.name.toLowerCase() === 'muted');
    }

    if (!muteRole || !member.roles.cache.has(muteRole.id)) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcı zaten susturulmamış!`);
    }

    await member.roles.remove(muteRole, 'Susturma kaldırıldı.');

    message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${user.tag}** adlı üyenin susturması kaldırıldı.\n**Yetkili:** <@${message.author.id}>`
      }]
    });

    sendModLog(message.guild, 'UNMUTE (ROLE)', user, message.author);
  }
};

async function sendModLog(guild, action, targetUser, moderator) {
  const config = Database.getGuildConfig(guild.id);
  if (!config || !config.logChannelId) return;

  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;

  logChannel.send({
    embeds: [{
      title: `${EMOJIS.moderator} Moderasyon İşlemi: ${action}`,
      fields: [
        { name: 'Kullanıcı', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
        { name: 'Yetkili', value: `${moderator.tag} (\`${moderator.id}\`)`, inline: true }
      ],
      color: 0x8b5cf6,
      timestamp: new Date().toISOString()
    }]
  }).catch(() => null);
}
