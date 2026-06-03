const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const guildConfig = require('../../services/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aiconfig')
    .setDescription('Sunucu AI ayarları')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('ayar').setDescription('Değiştirilecek ayar').setRequired(true).addChoices(
      { name: 'enabled', value: 'enabled' },
      { name: 'learn', value: 'learn' },
      { name: 'proactive', value: 'proactive' },
      { name: 'react', value: 'react' },
      { name: 'gifs', value: 'gifs' },
      { name: 'mentionOnly', value: 'mentionOnly' },
    ))
    .addBooleanOption(o => o.setName('deger').setDescription('true/false').setRequired(true)),

  run: async (client, interaction) => {
    if (!interaction.guildId) return interaction.reply({ content: 'dm için ayar yok ya', flags: MessageFlags.Ephemeral });
    const key = interaction.options.getString('ayar', true);
    const value = interaction.options.getBoolean('deger', true);
    const cfg = guildConfig.set(interaction.guildId, { [key]: value });
    await interaction.reply({ content: `tamam ${key} = ${value}\naktif ayar: ${JSON.stringify(cfg)}`, flags: MessageFlags.Ephemeral });
  },
};
