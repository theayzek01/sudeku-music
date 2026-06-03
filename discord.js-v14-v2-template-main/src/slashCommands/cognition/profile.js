const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PersonaEngine } = require('../../services/persona');
const config = require('../../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Yüklenen karakter/stil profil özetini göster'),

  run: async (client, interaction) => {
    const persona = new PersonaEngine();
    const top = persona.profile.topWords.slice(0, 20).join(', ');
    const rules = persona.profile.styleRules.slice(0, 5).map(x => `- ${x}`).join('\n');
    
    const embed = new EmbedBuilder()
      .setTitle('👤 | Sude Karakter & Üslup Profili')
      .setDescription('Yapay zekanın üslubunu yöneten çekirdek dil modelleme özet bilgisi.')
      .setColor(config.color || '#2dd4bf')
      .addFields(
        { name: 'Dataset Soru Sayısı', value: `\`${persona.profile.count} adet\``, inline: true },
        { name: 'Üslup Kuralları', value: rules },
        { name: 'Sık Kullandığı Kelimeler', value: `\`${top}\`` }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
