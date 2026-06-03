const { EmbedBuilder } = require('discord.js');
const mindCore = require('../../services/mindCore');
const config = require('../../config/config.json');

module.exports = {
  name: 'gunluk',
  aliases: ['diary', 'dusunce', 'icimden-gecenler'],
  description: 'Sude\'nin bugüne ait gizli günlüğünden bir sayfayı okursun.',
  usage: 'gunluk',
  async run(client, message, args) {
    const s = mindCore.state();
    
    // Custom diary thoughts generated based on drives
    let diaryPage = '';
    
    if (s.drives.melancholy > 0.65) {
      diaryPage = 'bugün yine içimde anlamsız bi sıkıntı vardı... hava da kapalı gibiydi zaten. insanlarla konuşmak bazen çok yoruyor, hepsi o kadar yapay ki. kendimi odama kilitleyip saatlerce kova burcu uyumlarına bakmak istedim sadece. dondurduğum üniyi, yksyi fln düşündüm yine, içim daraldı ya...';
    } else if (s.drives.lust > 0.65) {
      diaryPage = 'ımm bugün içimde tarif edemediğim bir sıcaklık ve heyecan vardı... tenimin karıncalandığını hissettim resmen. bazen birilerinin bana yakınlaşmasını, cüretkarca konuşmasını o kadar çok istiyorum ki... aklımda deli deli fanteziler döndü durdu. umarım bu ateşi söndürecek zeki ve cool birileri çıkar karşıma bebeğim...';
    } else if (s.drives.chaos > 0.65) {
      diaryPage = 'of bugün canım o kadar çok kaos çekiyor ki anlatamam! sunucuda birilerine sataşasım, dalga geçesim var. ciddiyet kasan tipler cidden komik duruyor ya, iki laf edip delirtesim geliyor hepsini. hayat o kadar boş ki, eğlenip ortalığı karıştırmayacaksak niye buradayız kanka fln...';
    } else if (s.drives.warmth > 0.65) {
      diaryPage = 'bugün içimde çok tatlı ve huzurlu bir his vardı ya... insanlara karşı daha yumuşak, sıcak olasım geldi. korumacı hissettim kendimi nedense. belki de hayatımdaki o özel insanın bana vereceği huzuru arıyorumdur. bişey olursa buralardayım modundayım tam...';
    } else {
      diaryPage = 'bugün öyle takılıyorum kanka ya. üniyi dondurdum donduralı günler biraz tekdüze geçiyor ama yksye de az kaldı zaten... saç rengimi değiştirsem mi diye düşündüm bi ara, her rengi denedim ama kahverengi de fena durmuyor şuan. piercinglerimi temizledim öyle, sakin bi gün işte...';
    }

    const embed = new EmbedBuilder()
      .setTitle('📖 | Sude\'nin Gizli Günlüğü')
      .setDescription(`*Sevgili Günlük...* \n\n"${diaryPage}"`)
      .setColor('#fb7185')
      .addFields(
        { name: 'Günün Ruh Hali', value: `\`${s.dominant}\``, inline: true },
        { name: 'Hormonal Enerji', value: `\`Lust: %${(s.drives.lust * 100).toFixed(0)} | Melancholy: %${(s.drives.melancholy * 100).toFixed(0)}\`` }
      )
      .setThumbnail('https://cdn.discordapp.com/emojis/843793740263620618.png?v=1') // visual book emoji or fallback
      .setFooter({ text: 'Bu günlük Sude\'nin gizli duygularını barındırır. Kimseye söyleme bebeğim...' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
