const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Botu ses kanalından çıkarır.'),
  aliases: ['disconnect', 'dc', 'quit'],
  category: 'music',

  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: `${EMOJIS.cross} Zaten ses kanalında değilim.`, flags: 64 });
    }

    queue.destroy();
    return interaction.reply({ content: `${EMOJIS.tick} Ses kanalından çıktım.`, flags: 64 });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue) {
      return message.reply(`${EMOJIS.cross} Zaten ses kanalında değilim.`);
    }

    queue.destroy();
    return message.reply(`${EMOJIS.tick} Ses kanalından çıktım.`);
  }
};
