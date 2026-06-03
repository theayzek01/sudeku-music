const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Başka bir kullanıcıya cüzdanınızdan coin transfer edersiniz.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Gönderilecek kullanıcı')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('miktar')
        .setDescription('Gönderilecek miktar')
        .setRequired(true)
        .setMinValue(1)
    ),
  aliases: ['gonder', 'pay', 'transfer', 'elver'],
  category: 'economy',
  
  async execute(interaction) {
    const target = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: `${EMOJIS.cross} Kendine para gönderemezsin kanka.`, ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: `${EMOJIS.cross} Botlara para gönderemezsin!`, ephemeral: true });
    }

    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    if (dbUser.coins < amount) {
      return interaction.reply({ content: `${EMOJIS.cross} Cüzdanınızda yeterli coin bulunmuyor! (Mevcut: \`${dbUser.coins}\`)`, ephemeral: true });
    }

    Database.addCoins(interaction.guildId, interaction.user.id, -amount);
    Database.addCoins(interaction.guildId, target.id, amount);

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} <@${interaction.user.id}>, <@${target.id}> kullanıcısına başarıyla **\`${amount} Coin\`** gönderdi.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!target) {
      return message.reply(`${EMOJIS.cross} Lütfen para gönderilecek kişiyi etiketleyin veya ID girin!`);
    }

    if (target.id === message.author.id) {
      return message.reply(`${EMOJIS.cross} Kendine para gönderemezsin kanka.`);
    }
    if (target.bot) {
      return message.reply(`${EMOJIS.cross} Botlara para gönderemezsin!`);
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply(`${EMOJIS.cross} Lütfen geçerli bir miktar girin! Örn: \`${prefix}send @user 100\``);
    }

    const dbUser = Database.getUser(message.guildId, message.author.id);
    if (dbUser.coins < amount) {
      return message.reply(`${EMOJIS.cross} Cüzdanınızda yeterli coin bulunmuyor! (Mevcut: \`${dbUser.coins}\`)`);
    }

    Database.addCoins(message.guildId, message.author.id, -amount);
    Database.addCoins(message.guildId, target.id, amount);

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} <@${message.author.id}>, <@${target.id}> kullanıcısına başarıyla **\`${amount} Coin\`** gönderdi.`
      }]
    });
  }
};
