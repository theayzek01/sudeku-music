const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Botu ses kanalına sokar.'),
  aliases: ['connect', 'summon'],
  category: 'music',

  async execute(interaction, playerManager) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: `${EMOJIS.cross} Önce bir ses kanalına girmen lazım.`, flags: 64 });
    }

    const queue = playerManager.getQueue(interaction.guildId);
    if (queue && queue.voiceChannelId === voiceChannel.id) {
      return interaction.reply({ content: `${EMOJIS.tick} Zaten bu ses kanalındayım.`, flags: 64 });
    }

    if (queue) {
      queue.destroy();
    }

    try {
      playerManager.getOrCreateQueue(interaction.guildId, voiceChannel.id, interaction.channel);
      return interaction.reply({ content: `${EMOJIS.tick} Ses kanalına katıldım.`, flags: 64 });
    } catch (error) {
      return interaction.reply({ content: `${EMOJIS.cross} Ses kanalına katılamadım: \`${error.message}\``, flags: 64 });
    }
  },

  async run(message, args, client, prefix, playerManager) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply(`${EMOJIS.cross} Önce bir ses kanalına girmen lazım.`);
    }

    const queue = playerManager.getQueue(message.guildId);
    if (queue && queue.voiceChannelId === voiceChannel.id) {
      return message.reply(`${EMOJIS.tick} Zaten bu ses kanalındayım.`);
    }

    if (queue) {
      queue.destroy();
    }

    try {
      playerManager.getOrCreateQueue(message.guildId, voiceChannel.id, message.channel);
      return message.reply(`${EMOJIS.tick} Ses kanalına katıldım.`);
    } catch (error) {
      return message.reply(`${EMOJIS.cross} Ses kanalına katılamadım: \`${error.message}\``);
    }
  }
};
