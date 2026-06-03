const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Günlük ücretsiz coininizi talep edersiniz.'),
  aliases: ['gunlukpara', 'gunluk'],
  category: 'economy',
  
  async execute(interaction) {
    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (now - dbUser.dailyLastClaim < cooldown) {
      const remaining = cooldown - (now - dbUser.dailyLastClaim);
      const hours = Math.floor(remaining / (3600 * 1000));
      const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
      return interaction.reply({
        content: `${EMOJIS.cross} Günlük ödülünü zaten aldın! Kalan süre: **${hours} saat ${minutes} dakika**`,
        ephemeral: true
      });
    }

    // Random reward between 200 and 500 coins
    const reward = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
    Database.addCoins(interaction.guildId, interaction.user.id, reward);
    Database.updateUser(interaction.guildId, interaction.user.id, { dailyLastClaim: now });

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.gift} **Tebrikler!** Günlük ödülünüz olan **\`${reward} Coin\`** cüzdanınıza eklendi.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    const dbUser = Database.getUser(message.guildId, message.author.id);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (now - dbUser.dailyLastClaim < cooldown) {
      const remaining = cooldown - (now - dbUser.dailyLastClaim);
      const hours = Math.floor(remaining / (3600 * 1000));
      const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
      return message.reply(`${EMOJIS.cross} Günlük ödülünü zaten aldın! Kalan süre: **${hours} saat ${minutes} dakika**`);
    }

    const reward = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
    Database.addCoins(message.guildId, message.author.id, reward);
    Database.updateUser(message.guildId, message.author.id, { dailyLastClaim: now });

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.gift} **Tebrikler!** Günlük ödülünüz olan **\`${reward} Coin\`** cüzdanınıza eklendi.`
      }]
    });
  }
};
