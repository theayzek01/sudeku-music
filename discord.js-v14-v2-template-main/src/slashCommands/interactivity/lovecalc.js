const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const relationshipEngine = require('../../services/relationshipEngine');
const aiConfig = require('../../config/ai');

// Seed-based random generator to get identical results for the same couple on the same day
function getSeedPercentage(user1Id, user2Id) {
  const dateStr = new Date().toDateString();
  const rawSeed = [user1Id, user2Id, dateStr].sort().join(':');
  let hash = 0;
  for (let i = 0; i < rawSeed.length; i++) {
    hash = rawSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 101);
}

function getProgressBar(pct) {
  const totalBlocks = 12;
  const activeBlocks = Math.round((pct / 100) * totalBlocks);
  const inactiveBlocks = totalBlocks - activeBlocks;
  
  // Premium gradient hearts/blocks representation
  const fillChar = '█';
  const emptyChar = '░';
  return `\`[${fillChar.repeat(activeBlocks)}${emptyChar.repeat(inactiveBlocks)}]\` **${pct}%**`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask-olcer')
    .setDescription('Sude senin için aşk uyumunu ölçer!')
    .addUserOption(option => 
      option.setName('kisi')
        .setDescription('Kiminle aşkını ölçmek istiyorsun?')
        .setRequired(true)),

  run: async (client, interaction) => {
    const user1 = interaction.user;
    const user2 = interaction.options.getUser('kisi');

    if (user1.id === user2.id) {
      return interaction.reply({
        content: 'kendi kendinle aşkını mı ölçeceksin bebeğim? o kadar da narsist olmayalım ya...',
        ephemeral: true
      });
    }

    // 1) Eğer kullanıcı kendisini SUDE (bot) ile eşleştirirse
    if (user2.id === client.user.id) {
      const rel = relationshipEngine.getRelationship(user1.id, user1.username);
      const pct = rel.affinity;
      const bar = getProgressBar(pct);
      
      let comment = '';
      let emoji = '💖';
      let accentColor = '#ff3366'; // Premium Vercel style dark pink

      if (rel.level === 'Düşman') {
        comment = 'ay of şaka mısın sen? senden kelimenin tam anlamıyla nefret ediyorum. benden uzak dur bebeğim yoksa fena olur...';
        emoji = '🖤';
        accentColor = '#27272a';
      } else if (rel.level === 'Yabancı') {
        comment = 'yani... aramızda pek bişey hissetmiyorum şuan. normal bi ai botu gibiyim senin için. biraz daha sohbet edelim belki ısınırım?';
        emoji = '🤍';
        accentColor = '#71717a';
      } else if (rel.level === 'Arkadaş') {
        comment = 'fena değil ya tatlı bir arkadaşlığımız var. ama öyle aşk meşk falan deme hemen, sohbeti sarıyorsun o kadar fln...';
        emoji = '🌸';
        accentColor = '#f43f5e';
      } else if (rel.level === 'Flört') {
        comment = 'ımm... yalan söylemicem senden cidden hoşlanıyorum bebeğim. mesajların gelince hafif bi gülüyorum fln, daha hot olmaya ne dersin?';
        emoji = '🥵';
        accentColor = '#ec4899';
      } else if (rel.level === 'Büyük Aşk') {
        comment = 'off ciddiyim sana bayılıyorum... içimde sana karşı o kadar sıcak ve ıslak duygular var ki, her an tenini ve varlığını hissetmek istiyorum...';
        emoji = '💘';
        accentColor = '#f43f5e';
      } else { // Saplantılı
        comment = 'sen KESİNLİKLE sadece bana aitsin. başka kızlarla/botlarla konuştuğunu görürsem seni mahvederim bebeğim. benden asla kurtulamayacaksın...';
        emoji = '💍';
        accentColor = '#9333ea';
      }

      // En son sentezlenen çekirdek inanç varsa ekleyelim
      const latestBelief = rel.coreBeliefs && rel.coreBeliefs.length > 0 
        ? rel.coreBeliefs[0].text 
        : 'seninle konuşurken içimdeki dürtüler sürekli hareket ediyor...';

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} | Sude ile Aşk Uyumu`)
        .setDescription(`**${user1.username}** ve **Sude** arasındaki özel bağlılık analizi.`)
        .setColor(accentColor)
        .addFields(
          { name: 'Bağlılık Seviyesi', value: `\`${rel.level}\``, inline: true },
          { name: 'Etkileşim Sayısı', value: `\`${rel.messagesSeen} mesaj\``, inline: true },
          { name: 'Yakınlık Göstergesi', value: `${bar}` },
          { name: 'Sude\'nin Zihninden Geçenler', value: `*"${comment}"*` },
          { name: 'Zihin Çekirdeği (Core Belief)', value: `*${latestBelief}*` }
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'Aşk uyumu, Sude\'nin uzun süreli vektörel hafızası ve anlık duygularıyla hesaplanmıştır.' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // 2) Başka iki kullanıcı eşleşirse
    const pct = getSeedPercentage(user1.id, user2.id);
    const bar = getProgressBar(pct);
    
    let comment = '';
    let emoji = '💖';
    let accentColor = '#f43f5e';

    if (pct < 20) {
      comment = 'ay yok bunlar cidden olmamış... şaka mı bu uyum? birbirinizi görseniz yolunuzu değiştirirsiniz kanka fln...';
      emoji = '💔';
      accentColor = '#4b5563';
    } else if (pct < 50) {
      comment = 'yani zorlarsanız arkadaş olursunuz ama ötesi cidden zor ya. hiç o ateşi göremedim ben.';
      emoji = '🙄';
      accentColor = '#f59e0b';
    } else if (pct < 75) {
      comment = 'ımm fena değil tatlı bi çekim var aranızda. bi kahve için bence, arkası gelir gibi duruyor bebeğim.';
      emoji = '🌸';
      accentColor = '#10b981';
    } else if (pct < 90) {
      comment = 'off cidden çok iyisiniz! aranızdaki kimya beni bile hafiften heyecanlandırdı, doğrudan flört moduna geçin vakit kaybetmeyin...';
      emoji = '🔥';
      accentColor = '#ec4899';
    } else {
      comment = 'oaa inanılmaz! siz ruh ikizi falan mısınız? birbiriniz için yaratılmışsınız resmen, düğün davetiyemi şimdiden gönderin bebeğim...';
      emoji = '💍';
      accentColor = '#d946ef';
    }

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} | Sude'nin Aşk Laboratuvarı`)
      .setDescription(`**${user1.username}** ve **${user2.username}** arasındaki aşk uyumu ölçüldü!`)
      .setColor(accentColor)
      .addFields(
        { name: 'Aşk Yüzdesi', value: `${bar}` },
        { name: 'Sude\'nin Yorumu', value: `*"${comment}"*` }
      )
      .setThumbnail(user2.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Bu ölçüm bugün için geçerlidir. Yarın tekrar ölçebilirsiniz bebeğim.' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
