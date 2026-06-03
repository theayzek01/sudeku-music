const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coins')
    .setDescription('Mevcut coin ve banka bakiyenizi görüntüler.')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Bakiyesine bakılacak kullanıcı')
        .setRequired(false)
    ),
  aliases: ['c', 'bakiye', 'para', 'cash', 'money', 'bal'],
  category: 'economy',
  
  async execute(interaction) {
    const user = interaction.options.getUser('kullanici') || interaction.user;
    const dbUser = Database.getUser(interaction.guildId, user.id, user.username, user.displayAvatarURL({ extension: 'png', size: 128 }));

    return interaction.reply({
      embeds: [{
        title: `${EMOJIS.diamond} Bakiye Bilgisi`,
        description: `**Kullanıcı:** <@${user.id}>\n\n` +
          `${EMOJIS.won} **Cüzdan:** \`${dbUser.coins} Coin\`\n` +
          `${EMOJIS.goldCrown} **Banka:** \`${dbUser.bank} Coin\``,
        color: 0x8b5cf6,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) }
      }]
    });
  },

  async run(message, args, client, prefix) {
    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null) || message.author;
    const dbUser = Database.getUser(message.guildId, user.id, user.username, user.displayAvatarURL({ extension: 'png', size: 128 }));

    return message.reply({
      embeds: [{
        title: `${EMOJIS.diamond} Bakiye Bilgisi`,
        description: `**Kullanıcı:** <@${user.id}>\n\n` +
          `${EMOJIS.won} **Cüzdan:** \`${dbUser.coins} Coin\`\n` +
          `${EMOJIS.goldCrown} **Banka:** \`${dbUser.bank} Coin\``,
        color: 0x8b5cf6,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) }
      }]
    });
  }
};
