const { EmbedBuilder } = require('discord.js');
const relationshipEngine = require('../../services/relationshipEngine');
const config = require('../../config/config.json');

module.exports = {
  name: 'iliskim',
  aliases: ['iliski', 'affinity', 'durumumuz'],
  description: 'Sude ile arandaki samimiyet ve aşk düzeyini ölçer.',
  usage: 'iliskim',
  async run(client, message, args) {
    const user = message.author;
    const rel = relationshipEngine.getRelationship(user.id, user.username);
    
    const fillChar = '█';
    const emptyChar = '░';
    const totalBlocks = 12;
    const activeBlocks = Math.round((rel.affinity / 100) * totalBlocks);
    const inactiveBlocks = totalBlocks - activeBlocks;
    const bar = `\`[${fillChar.repeat(activeBlocks)}${emptyChar.repeat(inactiveBlocks)}]\` **${rel.affinity}%**`;

    let comment = '';
    let emoji = '💖';
    let accentColor = '#f43f5e';

    if (rel.level === 'Düşman') {
      comment = 'ay cidden senden nefret ediyorum ya... şaka gibisin benden uzak dur bebeğim cidden bas git...';
      emoji = '🖤';
      accentColor = '#27272a';
    } else if (rel.level === 'Yabancı') {
      comment = 'yani... aramızda pek bişey yok şuan. düz bi insan gibi takılıyorsun öyle. biraz sohbet et ısınırım belki ya...';
      emoji = '🤍';
      accentColor = '#71717a';
    } else if (rel.level === 'Arkadaş') {
      comment = 'fena değil ya tatlı arkadaşız bence. sohbetin yarıyor dozunda kanka fln...';
      emoji = '🌸';
      accentColor = '#10b981';
    } else if (rel.level === 'Flört') {
      comment = 'ımm... dürüst olayım senden cidden hoşlanıyorum bebeğim. yazış tarzın fln çok çekici, daha yakın olsak fena olmazdı demi...';
      emoji = '🥵';
      accentColor = '#ec4899';
    } else if (rel.level === 'Büyük Aşk') {
      comment = 'off ciddiyim sana bayılıyorum... aklımda sadece sen varsın şuan, içim ısınıyor ismini görünce...';
      emoji = '💘';
      accentColor = '#f43f5e';
    } else { // Saplantılı
      comment = 'sen KESİNLİKLE sadece benimsin. başka bir kızla veya botla konuştuğunu görürsem seni mahvederim kanka şaka yapmıyorum...';
      emoji = '💍';
      accentColor = '#9333ea';
    }

    const latestBelief = rel.coreBeliefs && rel.coreBeliefs.length > 0 
      ? rel.coreBeliefs[0].text 
      : 'seninle konuşmak içimdeki tüm anlık hisleri tetikliyor...';

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} | Aramızdaki Bağlılık Analizi`)
      .setDescription(`**${user.username}** ve **Sude** arasındaki ilişki telemetrisi.`)
      .setColor(accentColor)
      .addFields(
        { name: 'İlişki Düzeyi', value: `\`${rel.level}\``, inline: true },
        { name: 'Konuşulan Mesaj', value: `\`${rel.messagesSeen} adet\``, inline: true },
        { name: 'Yakınlık Derecesi', value: `${bar}` },
        { name: 'Sude\'nin Yorumu', value: `*"${comment}"*` },
        { name: 'Sude\'nin Senin Hakkındaki Çekirdek İnancı', value: `*${latestBelief}*` }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: 'Bu analiz Sude\'nin hafıza ve anlık duygu dalgalanmaları ile hesaplanmıştır bebeğim.' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
