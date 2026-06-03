const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('AFK (Klavyeden Uzakta) moduna geçersiniz.')
    .addStringOption(option =>
      option.setName('sebep')
        .setDescription('AFK olma sebebiniz')
        .setRequired(false)
    ),
  aliases: ['afkmod'],
  category: 'fun',
  
  async execute(interaction) {
    const reason = interaction.options.getString('sebep') || 'AFK';
    
    Database.setAfk(interaction.guildId, interaction.user.id, reason);
    
    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} Başarıyla AFK moduna geçtin. Bir mesaj yazdığında afk modun otomatik olarak kapatılacak.\n\n**Sebep:** \`${reason}\``
      }]
    });
  },

  async run(message, args, client, prefix) {
    const reason = args.join(' ') || 'AFK';
    
    Database.setAfk(message.guildId, message.author.id, reason);
    
    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} Başarıyla AFK moduna geçtin. Bir mesaj yazdığında afk modun otomatik olarak kapatılacak.\n\n**Sebep:** \`${reason}\``
      }]
    });
  }
};
