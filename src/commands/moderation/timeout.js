const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Kullanıcıya susturma (timeout) cezası verir.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Cezalandırılacak üye')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('sure')
        .setDescription('Süre (dakika cinsinden)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep')
        .setDescription('Sebep')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['sustur', 'timeoutat', 'to'],
  category: 'moderation',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici');
    const minutes = interaction.options.getInteger('sure');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`, ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcıyı susturmaya yetkim yetmiyor!`, ephemeral: true });
    }

    await member.timeout(minutes * 60 * 1000, reason);

    await interaction.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye **${minutes} dakika** susturuldu.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${interaction.user.id}>`
      }]
    });

    sendModLog(interaction.guild, `TIMEOUT (${minutes}dk)`, user, interaction.user, reason);
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Üyeleri Sustur** yetkisine sahip olmalısın!`);
    }

    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir üye etiketleyin veya ID girin!`);
    }

    const minutes = parseInt(args[1]);
    if (isNaN(minutes) || minutes <= 0) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir dakika girin! Örn: \`${prefix}timeout @user 15 küfür\``);
    }

    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi.';
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcı sunucuda bulunmuyor.`);
    }

    if (!member.moderatable) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcıyı susturmaya yetkim yetmiyor!`);
    }

    await member.timeout(minutes * 60 * 1000, reason);

    message.reply({
      embeds: [{
        color: 0x5a189a,
        description: `${EMOJIS.moderator} **${user.tag}** adlı üye **${minutes} dakika** susturuldu.\n\n**Sebep:** \`${reason}\`\n**Yetkili:** <@${message.author.id}>`
      }]
    });

    sendModLog(message.guild, `TIMEOUT (${minutes}dk)`, user, message.author, reason);
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
      color: 0x5a189a,
      timestamp: new Date().toISOString()
    }]
  }).catch(() => null);
}
