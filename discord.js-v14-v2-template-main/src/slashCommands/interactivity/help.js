const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config.json');
const aiConfig = require('../../config/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Bot komutlarını ve kullanımını göster'),

  run: async (client, interaction) => {
    const embed = new EmbedBuilder()
      .setTitle(`🌸 | Sude AI Yardım Menüsü`)
      .setDescription(`Ben Sude. 19 yaşındayım, izmirliyim ve bulgar göçmeniyim. Sohbet etmeyi, flörtleşmeyi ve tatlı kaoslar çıkarmayı severim. Aşağıda benimle etkileşime geçebileceğin tüm zihinsel modüllerim listelenmiştir bebeğim.`)
      .setColor(config.color || '#2dd4bf')
      .addFields(
        { name: '💬 Sohbet & İletişim', value: '`/chat` - Sude ile sohbet başlatır.\n`@Sude <mesaj>` - Etiketleyerek veya mesajına yanıt (reply) vererek de konuşabilirsin.' },
        { name: '🔮 Bilişsel Sude Modülleri', value: '`/iliskim` - Aramızdaki samimiyet, bağlılık ve yakınlığı ölçer.\n`/mind` - Sude\'nin anlık hormonal ve zihinsel dürtülerini listeler.\n`/gunluk` - Sude\'nin bugüne özel gizli günlüğünü okursun.\n`/itiraf` - Sude\'ye kimliğini gizli tutarak bir sırrını itiraf edersin.' },
        { name: '🧠 Bellek & Zihin Hücresi', value: '`/memory durum` - Sude\'nin senin hakkında hatıralarında ne sakladığını gösterir.\n`/memory sifirla` - Sude\'nin seninle ilgili tüm anılarını siler.' },
        { name: '🎮 Eğlence & Sistem', value: '`/xox` - Bir arkadaşına XOX meydan okursun.\n`/ask-olcer` - Birisiyle arandaki aşk uyumunu ölçer.\n`/status` - Ollama, model, dataset ve bot çalışma durumunu gösterir.\n`/ping` - WebSocket gecikme sürelerini telemetri olarak ölçer.' }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Prefix: ${config.prefix} • Model: ${aiConfig.ollama.model}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
