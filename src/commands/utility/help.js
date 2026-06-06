const { SlashCommandBuilder } = require('discord.js');
const commandIndex = require('../../commands');
const EMOJIS = require('../../utils/emojis');

function buildHelpEmbed() {
  const grouped = new Map();
  for (const cmd of commandIndex.commands || []) {
    const category = cmd.category || 'diğer';
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(`\`/${cmd.data.name}\``);
  }

  return {
    embeds: [{
      color: 0x8b5cf6,
      title: `${EMOJIS.note} Yardım`,
      description: 'Komutlar kısa listede.',
      fields: [...grouped.entries()].map(([category, list]) => ({
        name: category,
        value: list.join(' '),
        inline: false
      })),
      footer: { text: 'Sudeku Music' }
    }]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Komut listesini gösterir.'),
  aliases: ['yardim', 'yardım'],
  category: 'utility',

  async execute(interaction) {
    return interaction.reply(buildHelpEmbed());
  },

  async run(message) {
    return message.reply(buildHelpEmbed());
  }
};
