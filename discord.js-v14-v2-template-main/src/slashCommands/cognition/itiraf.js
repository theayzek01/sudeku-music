const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chatEngine = require('../../services/chatEngine');
const config = require('../../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('itiraf')
    .setDescription('Sude\'ye gizli bir itirafta bulunursun. Sırrını aranızda saklar ve yorum yapar.')
    .addStringOption(option => 
      option.setName('itiraf')
        .setDescription('İtirafta bulunmak istediğin sırrın nedir?')
        .setRequired(true)),

  run: async (client, interaction) => {
    const confession = interaction.options.getString('itiraf').trim();
    
    await interaction.deferReply({ ephemeral: true });

    // Call Ollama to generate a reaction
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

      const embed = new EmbedBuilder()
        .setTitle('🤫 | Sude\'ye Gelen Gizli İtiraf')
        .setDescription(`Bir kullanıcı Sude'ye gizlice itirafta bulundu...\n\n**İtiraf:**\n*"${confession}"*`)
        .setColor('#d946ef')
        .addFields(
          { name: 'Sude\'nin Tepkisi', value: `*"${cleanedResponse}"*` }
        )
        .setFooter({ text: 'İtirafı yapan kişinin ismi gizli tutulmuştur. Aramızda bebeğim...' })
        .setTimestamp();

      // We send it as a public channel message to build sunucu interaction, or keeping it strictly in channels!
      await interaction.channel.send({ embeds: [embed] });
      return interaction.editReply({ content: 'itirafın başarıyla paylaşıldı ve yorumlandı bebeğim!' });
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: 'itirafını dinlerken zihnim karıştı ya, sonra tekrar anlatırsın bebeğim...' });
    }
  }
};
