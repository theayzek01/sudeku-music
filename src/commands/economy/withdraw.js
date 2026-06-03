const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Bankadaki coinlerinizi cüzdanınıza çeker.')
    .addStringOption(option =>
      option.setName('miktar')
        .setDescription('Çekilecek miktar veya "hepsi"')
        .setRequired(true)
    ),
  aliases: ['with', 'cek'],
  category: 'economy',
  
  async execute(interaction) {
    const miktarStr = interaction.options.getString('miktar');
    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    let amount = 0;

    if (miktarStr.toLowerCase() === 'hepsi' || miktarStr.toLowerCase() === 'all') {
      amount = dbUser.bank;
    } else {
      amount = parseInt(miktarStr);
    }

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ content: `${EMOJIS.cross} Geçersiz bakiye miktarı!`, ephemeral: true });
    }

    if (dbUser.bank < amount) {
      return interaction.reply({ content: `${EMOJIS.cross} Bankanızda o kadar coin bulunmuyor! (Mevcut: \`${dbUser.bank}\`)`, ephemeral: true });
    }

    Database.addBank(interaction.guildId, interaction.user.id, -amount);
    Database.addCoins(interaction.guildId, interaction.user.id, amount);

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **\`${amount} Coin\`** bankanızdan cüzdanınıza çekildi.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    const miktarStr = args[0];
    if (!miktarStr) {
      return message.reply(`${EMOJIS.cross} Lütfen çekilecek miktarı girin! Örn: \`${prefix}withdraw 100\` veya \`${prefix}withdraw hepsi\``);
    }

    const dbUser = Database.getUser(message.guildId, message.author.id);
    let amount = 0;

    if (miktarStr.toLowerCase() === 'hepsi' || miktarStr.toLowerCase() === 'all') {
      amount = dbUser.bank;
    } else {
      amount = parseInt(miktarStr);
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply(`${EMOJIS.cross} Geçersiz bakiye miktarı!`);
    }

    if (dbUser.bank < amount) {
      return message.reply(`${EMOJIS.cross} Bankanızda o kadar coin bulunmuyor! (Mevcut: \`${dbUser.bank}\`)`);
    }

    Database.addBank(message.guildId, message.author.id, -amount);
    Database.addCoins(message.guildId, message.author.id, amount);

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **\`${amount} Coin\`** bankanızdan cüzdanınıza çekildi.`
      }]
    });
  }
};
