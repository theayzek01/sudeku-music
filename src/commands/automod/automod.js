const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Otomatik koruma (AutoMod) sistemini yapılandırır.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('durum')
        .setDescription('Mevcut AutoMod durumunu görüntüler.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kufur')
        .setDescription('Küfür filtresini açar veya kapatır.')
        .addBooleanOption(option => option.setName('aktif').setDescription('Aktif et veya Devre dışı bırak').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('link')
        .setDescription('Link/Bağlantı filtresini açar veya kapatır.')
        .addBooleanOption(option => option.setName('aktif').setDescription('Aktif et veya Devre dışı bırak').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('spam')
        .setDescription('Spam filtresini açar veya kapatır.')
        .addBooleanOption(option => option.setName('aktif').setDescription('Aktif et veya Devre dışı bırak').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('davet')
        .setDescription('Discord sunucu davet filtresini açar veya kapatır.')
        .addBooleanOption(option => option.setName('aktif').setDescription('Aktif et veya Devre dışı bırak').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  aliases: ['koruma', 'otokoruma'],
  category: 'automod',
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const config = Database.getGuildConfig(interaction.guildId);

    if (subcommand === 'durum') {
      return interaction.reply({
        embeds: [{
          title: `${EMOJIS.moderator} AutoMod Koruma Durumu`,
          description: `Sunucunun otomatik koruma filtreleri aşağıda listelenmiştir:\n\n` +
            `• **Küfür Filtresi:** ${config.swearFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n` +
            `• **Link Filtresi:** ${config.linkFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n` +
            `• **Spam Filtresi:** ${config.spamFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n` +
            `• **Davet Filtresi:** ${config.inviteFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n\n` +
            `*Filtreleri değiştirmek için: \`/automod <filtre> <aktif: true/false>\`*`,
          color: 0x8b5cf6
        }]
      });
    }

    const aktif = interaction.options.getBoolean('aktif');
    const dbVal = aktif ? 1 : 0;
    const updateField = {};

    if (subcommand === 'kufur') {
      updateField.swearFilter = dbVal;
      Database.updateGuildConfig(interaction.guildId, updateField);
      return interaction.reply({ content: `${EMOJIS.tick} Küfür filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.` });
    }
    if (subcommand === 'link') {
      updateField.linkFilter = dbVal;
      Database.updateGuildConfig(interaction.guildId, updateField);
      return interaction.reply({ content: `${EMOJIS.tick} Link filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.` });
    }
    if (subcommand === 'spam') {
      updateField.spamFilter = dbVal;
      Database.updateGuildConfig(interaction.guildId, updateField);
      return interaction.reply({ content: `${EMOJIS.tick} Spam filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.` });
    }
    if (subcommand === 'davet') {
      updateField.inviteFilter = dbVal;
      Database.updateGuildConfig(interaction.guildId, updateField);
      return interaction.reply({ content: `${EMOJIS.tick} Davet filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.` });
    }
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!`);
    }

    const config = Database.getGuildConfig(message.guildId);
    const sub = args[0] ? args[0].toLowerCase() : null;

    if (!sub || sub === 'durum' || sub === 'stats' || sub === 'info') {
      return message.reply({
        embeds: [{
          title: `${EMOJIS.moderator} AutoMod Koruma Durumu`,
          description: `Sunucunun otomatik koruma filtreleri aşağıda listelenmiştir:\n\n` +
            `• **Küfür Filtresi:** ${config.swearFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n` +
            `• **Link Filtresi:** ${config.linkFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n` +
            `• **Spam Filtresi:** ${config.spamFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n` +
            `• **Davet Filtresi:** ${config.inviteFilter ? `${EMOJIS.tick} \`Açık\`` : `${EMOJIS.cross} \`Kapalı\``}\n\n` +
            `*Filtreleri değiştirmek için: \`${prefix}automod <kufur/link/spam/davet> <ac/kapat>\`*`,
          color: 0x8b5cf6
        }]
      });
    }

    const action = args[1] ? args[1].toLowerCase() : null;
    if (!action || (action !== 'ac' && action !== 'kapat' && action !== 'on' && action !== 'off')) {
      return message.reply(`${EMOJIS.cross} Geçersiz eylem! Lütfen \`ac\` veya \`kapat\` yazın. Örn: \`${prefix}automod kufur ac\``);
    }

    const aktif = (action === 'ac' || action === 'on');
    const dbVal = aktif ? 1 : 0;
    const updateField = {};

    if (sub === 'kufur' || sub === 'swear') {
      updateField.swearFilter = dbVal;
      Database.updateGuildConfig(message.guildId, updateField);
      return message.reply(`${EMOJIS.tick} Küfür filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.`);
    }
    if (sub === 'link' || sub === 'url') {
      updateField.linkFilter = dbVal;
      Database.updateGuildConfig(message.guildId, updateField);
      return message.reply(`${EMOJIS.tick} Link filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.`);
    }
    if (sub === 'spam') {
      updateField.spamFilter = dbVal;
      Database.updateGuildConfig(message.guildId, updateField);
      return message.reply(`${EMOJIS.tick} Spam filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.`);
    }
    if (sub === 'davet' || sub === 'invite' || sub === 'reklam') {
      updateField.inviteFilter = dbVal;
      Database.updateGuildConfig(message.guildId, updateField);
      return message.reply(`${EMOJIS.tick} Davet filtresi **${aktif ? 'Açıldı' : 'Kapatıldı'}**.`);
    }

    return message.reply(`${EMOJIS.cross} Geçersiz filtre adı! Kullanılabilecekler: \`kufur\`, \`link\`, \`spam\`, \`davet\`.`);
  }
};
