const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chatEngine = require('../../services/chatEngine');
const config = require('../../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memory')
    .setDescription('Kişisel hafıza durumunu göster veya sıfırla')
    .addSubcommand(sub => sub.setName('durum').setDescription('Hafıza istatistiklerini göster'))
    .addSubcommand(sub => sub.setName('sifirla').setDescription('Sana ait hafızayı sil')),

  run: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();
    const user = interaction.user;

    if (sub === 'sifirla') {
      chatEngine.reset(user.id);
      return interaction.reply({
        content: `${config.checkmark_emoji || '✅'} tamam ya sana ait tüm konuşma hafızamı ve çıkarılan anıları sıfırladım bebeğim. beni unuttun resmen şuan fln...`,
        ephemeral: true
      });
    }

    const stats = chatEngine.stats(user.id);
    const bucket = chatEngine.memory.userBucket(user.id);

    const factsList = bucket.facts && bucket.facts.length > 0
      ? bucket.facts.map((f, i) => `**${i + 1}.** ${f.text}`).join('\n')
      : '*Henüz senin hakkında güçlü bir hatıra sentezlemedim bebeğim... Aramızda derin bişeyler konuşmamız lazım fln.*';

    const embed = new EmbedBuilder()
      .setTitle('🧠 | Sude\'nin Vektörel Hafıza Deposu')
      .setDescription(`**${user.username}** kullanıcısı için ayrılmış semantik hafıza hücreleri.`)
      .setColor('#9333ea')
      .addFields(
        { name: 'Kayıtlı Çekirdek Hatıra', value: `\`${stats.facts} adet\``, inline: true },
        { name: 'Konuşma Diyalog Hücresi', value: `\`${stats.turns} diyalog\``, inline: true },
        { name: 'Sentezlenen Gerçekler', value: factsList }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Konuştukça beynimdeki vektör uzayına yeni anılar ekliyorum kanka...' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
