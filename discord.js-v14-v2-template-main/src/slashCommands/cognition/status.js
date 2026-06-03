const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chatEngine = require('../../services/chatEngine');
const aiConfig = require('../../config/ai');
const { loadDataset } = require('../../services/persona');
const config = require('../../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('AI, Ollama ve dataset durumunu göster'),

  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const health = await chatEngine.health();
    const count = loadDataset().length;
    
    const embed = new EmbedBuilder()
      .setTitle('📊 | Sude Bilişsel Motor Durumu')
      .setDescription('Yapay zeka motorunun, veri setinin ve Ollama API katmanının canlı durumu.')
      .setColor(health.ok ? '#10b981' : '#ef4444')
      .addFields(
        { name: 'Yapay Zeka İsmi', value: `\`${aiConfig.botName}\``, inline: true },
        { name: 'Aktif Dil Modeli', value: `\`${aiConfig.ollama.model}\``, inline: true },
        { name: 'Ollama API Bağlantısı', value: health.ok ? '🟢 `Bağlandı/Aktif`' : '🔴 `Hata/Çevrimdışı`', inline: true },
        { name: 'Dil Modeli Durumu', value: health.modelInstalled ? '🟢 `Yüklü/Çalışıyor`' : '🟡 `Bulunamadı veya Kontrol Edilemedi`', inline: true },
        { name: 'Dataset Soru/Cevap Sayısı', value: `\`${count} adet\``, inline: true },
        { name: 'Bellek Katmanı', value: '🟣 `Adaptif + Vektörel Hafıza`', inline: true }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp();

    if (!health.ok && health.error) {
      embed.addFields({ name: 'Hata Mesajı', value: `\`\`\`${health.error}\`\`\`` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
