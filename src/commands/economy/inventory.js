const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Envanterinizdeki arka planları ve rozetleri listeler.'),
  aliases: ['inv', 'envanter', 'cantam', 'canta'],
  category: 'economy',
  
  async execute(interaction) {
    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    return interaction.reply({
      embeds: [getInventoryEmbed(interaction.user, dbUser)]
    });
  },

  async run(message, args, client, prefix) {
    const dbUser = Database.getUser(message.guildId, message.author.id);
    return message.reply({
      embeds: [getInventoryEmbed(message.author, dbUser)]
    });
  }
};

function getInventoryEmbed(user, dbUser) {
  const inv = dbUser.inventory || [];
  const badges = dbUser.badges || [];

  const bgsList = inv.length > 0
    ? inv.map(bg => `• \`${bg}\` (${bg === 'bg_neon' ? 'Neon Mor' : bg === 'bg_forest' ? 'Karanlık Orman' : 'Cyberpunk'})`).join('\n')
    : '*Hiç arka plan satın alınmamış.*';

  const badgesList = badges.length > 0
    ? badges.map(b => `• **${b}** Rozeti`).join('\n')
    : '*Hiç rozet satın alınmamış.*';

  const activeBg = dbUser.customBg
    ? `\`${dbUser.customBg.toUpperCase()}\``
    : '`VARSAYILAN`';

  return {
    title: `${EMOJIS.kitty} ${user.username} - Envanter`,
    description: `### 🖼️ Arka Planlar\n${bgsList}\n\n` +
      `### 🏆 Rozetler\n${badgesList}\n\n` +
      `**Aktif Arka Plan:** ${activeBg}\n` +
      `*Arka planları değiştirmek için \`/buy <kod>\` kullanarak o arka planı tekrar seçebilirsiniz (ücretsizdir).*`,
    color: 0x8b5cf6,
    thumbnail: { url: user.displayAvatarURL({ dynamic: true }) }
  };
}
