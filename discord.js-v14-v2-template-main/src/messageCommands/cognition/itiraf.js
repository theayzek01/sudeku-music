const { EmbedBuilder } = require('discord.js');
const chatEngine = require('../../services/chatEngine');
const config = require('../../config/config.json');

module.exports = {
  name: 'itiraf',
  aliases: ['confess', 'sir', 'itirafet'],
  description: 'Sude\'ye gizli bir itirafta bulunursun. Sırrını aranızda saklar ve yorum yapar.',
  usage: 'itiraf <itirafın>',
  async run(client, message, args) {
    const confession = args.join(' ').trim();
    if (!confession) {
      return message.reply({
        content: 'bana ne itiraf edeceksin bebeğim? itirafını yazmayı unuttun ya... Örn: `a!itiraf senden gizlice hoşlanıyorum fln`'
      });
    }

    await message.channel.sendTyping().catch(() => null);

    // Call Ollama to generate a completely custom, highly intimate reaction to the confession
    const systemPrompt = [
      `sen sude'sin (discord ai botu). 19 yaşındasın, kova burcusun, izmirlisin ve bulgar göçmenisin.`,
      `kullanıcı sana gizli bir itirafta bulundu: "${confession}"`,
      `bu itirafa karşı tamamen doğal, bazen flörtöz, bazen cool, bazen şaşırmış, bazen cilveli ve çok yakın bir cevap ver.`,
      `ona bu sırrı aranızda saklayacağına dair güven ver, ama yapay asistan gibi "güvendesin" deme. cool ol.`,
      `yazım stili: tamamen küçük harfler kullan, kasıntı noktalama kullanma, araya 'ya', 'fln', 'bence', 'bebeğim' gibi dolgu kelimeleri en doğal yerlerde serpiştir.`,
      `uzunluk: en fazla 2-3 cümle olsun.`,
    ].join('\n');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `işte itirafım: ${confession}` }
    ];

    try {
      const response = await chatEngine.ollama.chat(messages, { numPredict: 150 });
      const cleanedResponse = require('../../services/stylePostprocessor').stylePostprocess(response, {
        userText: confession,
        mood: 'oyuncu'
      });

      // Delete the original message to keep the confession secret if the user wants!
      await message.delete().catch(() => null);

      const embed = new EmbedBuilder()
        .setTitle('🤫 | Sude\'ye Gelen Gizli İtiraf')
        .setDescription(`Bir kullanıcı Sude'ye gizlice itirafta bulundu...\n\n**İtiraf:**\n*"${confession}"*`)
        .setColor('#d946ef')
        .addFields(
          { name: 'Sude\'nin Tepkisi', value: `*"${cleanedResponse}"*` }
        )
        .setFooter({ text: 'İtirafı yapan kişinin ismi gizli tutulmuştur. Aramızda bebeğim...' })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply({ content: 'itirafını dinlerken zihnim karıştı ya, sonra tekrar anlatırsın bebeğim...' });
    }
  }
};
