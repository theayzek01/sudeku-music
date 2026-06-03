const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Kullanıcıyı sunucuda susturur (Mute rolü verir).')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Susturulacak üye')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep')
        .setDescription('Susturma sebebi')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['susturrol', 'rolsustur'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`, ephemeral: true });
    }

    const muteRole = await getOrCreateMuteRole(interaction.guild);
    if (!muteRole) {
      return interaction.reply({ content: `${EMOJIS.cross} Susturma rolü oluşturulurken veya aranırken bir hata oluştu!`, ephemeral: true });
    }

    if (member.roles.cache.has(muteRole.id)) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı zaten susturulmuş!`, ephemeral: true });
    }

    await member.roles.add(muteRole, reason);

    await interaction.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye rol ile susturuldu.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${interaction.user.id}>`
      }]
    });

    sendModLog(interaction.guild, 'MUTE (ROLE)', user, interaction.user, reason);
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Üyeleri Sustur** yetkisine sahip olmalısın!`);
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

    const muteRole = await getOrCreateMuteRole(message.guild);
    if (!muteRole) {
      return message.reply(`${EMOJIS.cross} Susturma rolü oluşturulurken veya aranırken bir hata oluştu!`);
    }

    if (member.roles.cache.has(muteRole.id)) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcı zaten susturulmuş!`);
    }

    await member.roles.add(muteRole, reason);

    message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye rol ile susturuldu.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${message.author.id}>`
      }]
    });

    sendModLog(message.guild, 'MUTE (ROLE)', user, message.author, reason);
  }
};

async function getOrCreateMuteRole(guild) {
  const config = Database.getGuildConfig(guild.id);
  let muteRole = config.muteRoleId ? guild.roles.cache.get(config.muteRoleId) : null;

  if (!muteRole) {
    muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'susturulmuş' || r.name.toLowerCase() === 'muted');
  }

  if (!muteRole) {
    try {
      muteRole = await guild.roles.create({
        name: 'Susturulmuş',
        color: '#555555',
        permissions: [],
        reason: 'Susturulmuş rolü otomatik oluşturuldu.'
      });

      // Update db config
      Database.updateGuildConfig(guild.id, { muteRoleId: muteRole.id });

      // Apply channel overrides
      guild.channels.cache.forEach(async (channel) => {
        try {
          if (channel.type === ChannelType.GuildText) {
            await channel.permissionOverwrites.create(muteRole, {
              SendMessages: false,
              AddReactions: false
            });
          } else if (channel.type === ChannelType.GuildVoice) {
            await channel.permissionOverwrites.create(muteRole, {
              Speak: false
            });
          }
        } catch (e) {}
      });
    } catch (err) {
      console.error('Failed to create Muted role:', err);
      return null;
    }
  }

  return muteRole;
}

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
      color: 0x5a189a,
      timestamp: new Date().toISOString()
    }]
  }).catch(() => null);
}
