const { EmbedBuilder } = require('discord.js');
const mindCore = require('../../services/mindCore');
const config = require('../../config/config.json');

module.exports = {
  name: 'mood',
  aliases: ['zihin', 'hormonlar', 'hissiyat', 'durumum'],
  description: 'Sude\'nin anlık hormonal ve zihinsel durumunu gösterir.',
  usage: 'mood',
  async run(client, message, args) {
    const s = mindCore.state();
    
    // Convert drives to clean visual percent bars
    const getBar = (val) => {
      const active = Math.round(val * 10);
      return `\`[${'█'.repeat(active)}${'░'.repeat(10 - active)}]\` **${(val * 100).toFixed(0)}%**`;
    };

    const embed = new EmbedBuilder()
      .setTitle('🧠 | Sude\'nin Psikolojik Kontrol Odası')
      .setDescription('Zihnimdeki hormonal salgılar ve anlık duygusal telemetri verileri.')
      .setColor(config.color || '#2dd4bf')
      .addFields(
        { name: 'Aktif Zihin Fazı', value: `\`${s.phase}\``, inline: true },
        { name: 'Baskın Duygu', value: `\`${s.dominant}\``, inline: true },
        { name: 'Zihinsel Döngü', value: `\`${s.cycle}. evre\``, inline: true },
        { name: 'İçsel Düşüncem', value: `*"${s.thought || 'Meditasyon yapıyorum...'}"*` },
        { name: '🔥 Lust / Şehvet & Erotizm', value: getBar(s.drives.lust || 0.5) },
        { name: '💜 Melankoli / Depresyon', value: getBar(s.drives.melancholy || 0.5) },
        { name: '🎭 Kaos & Öngörülemezlik', value: getBar(s.drives.chaos || 0.5) },
        { name: '💖 Sıcaklık & Güven', value: getBar(s.drives.warmth || 0.5) },
        { name: '🎮 Oyunculuk & Neşe', value: getBar(s.drives.play || 0.5) },
        { name: '🔍 Merak & Arama Dürtüsü', value: getBar(s.drives.curiosity || 0.5) }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: 'Zihinsel hormonlar her mesajda ve sunucudaki havaya göre değişiyor kanka...' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
