const { EmbedBuilder } = require('discord.js');
const chatEngine = require('../../services/chatEngine');
const config = require('../../config/config.json');

module.exports = {
  name: 'hafiza',
  aliases: ['memory', 'hatira', 'hatirladiklarin', 'neyiunutmadin'],
  description: 'Sude\'nin senin hakkında uzun süreli vektörel hafızasında neleri sakladığını gösterir.',
  usage: 'hafiza',
  async run(client, message, args) {
    const user = message.author;
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

    return message.reply({ embeds: [embed] });
  }
};
