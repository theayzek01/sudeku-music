const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Cüzdanınızdaki coinleri bankaya yatırır.')
    .addStringOption(option =>
      option.setName('miktar')
        .setDescription('Yatırılacak miktar veya "hepsi"')
        .setRequired(true)
    ),
  aliases: ['dep', 'yatir'],
  category: 'economy',
  
  async execute(interaction) {
    const miktarStr = interaction.options.getString('miktar');
    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    let amount = 0;

    if (miktarStr.toLowerCase() === 'hepsi' || miktarStr.toLowerCase() === 'all') {
      amount = dbUser.coins;
    } else {
      amount = parseInt(miktarStr);
    }

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ content: `${EMOJIS.cross} Geçersiz bakiye miktarı!`, ephemeral: true });
    }

    if (dbUser.coins < amount) {
      return interaction.reply({ content: `${EMOJIS.cross} Cüzdanınızda o kadar coin bulunmuyor! (Mevcut: \`${dbUser.coins}\`)`, ephemeral: true });
    }

    Database.addCoins(interaction.guildId, interaction.user.id, -amount);
    Database.addBank(interaction.guildId, interaction.user.id, amount);

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **\`${amount} Coin\`** cüzdanınızdan bankaya yatırıldı.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    const miktarStr = args[0];
    if (!miktarStr) {
      return message.reply(`${EMOJIS.cross} Lütfen yatırılacak miktarı girin! Örn: \`${prefix}deposit 100\` veya \`${prefix}deposit hepsi\``);
    }

    const dbUser = Database.getUser(message.guildId, message.author.id);
    let amount = 0;

    if (miktarStr.toLowerCase() === 'hepsi' || miktarStr.toLowerCase() === 'all') {
      amount = dbUser.coins;
    } else {
      amount = parseInt(miktarStr);
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply(`${EMOJIS.cross} Geçersiz bakiye miktarı!`);
    }

    if (dbUser.coins < amount) {
      return message.reply(`${EMOJIS.cross} Cüzdanınızda o kadar coin bulunmuyor! (Mevcut: \`${dbUser.coins}\`)`);
    }

    Database.addCoins(message.guildId, message.author.id, -amount);
    Database.addBank(message.guildId, message.author.id, amount);

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **\`${amount} Coin\`** cüzdanınızdan bankaya yatırıldı.`
      }]
    });
  }
};
