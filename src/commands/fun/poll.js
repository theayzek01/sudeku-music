const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Bir oylama/anket başlatır.')
    .addStringOption(option =>
      option.setName('soru')
        .setDescription('Anket sorusu')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('secenekler')
        .setDescription('Seçenekleri virgül (,) veya dik çizgi (|) ile ayırın.')
        .setRequired(true)
    ),
  aliases: ['anket', 'oylama'],
  category: 'fun',
  
  async execute(interaction) {
    const question = interaction.options.getString('soru');
    const optionsStr = interaction.options.getString('secenekler');

    let options = optionsStr.includes('|') ? optionsStr.split('|') : optionsStr.split(',');
    options = options.map(o => o.trim()).filter(Boolean);

    if (options.length < 2) {
      return interaction.reply({ content: `${EMOJIS.cross} En az 2 seçenek belirtmelisiniz!`, ephemeral: true });
    }
    if (options.length > 10) {
      return interaction.reply({ content: `${EMOJIS.cross} En fazla 10 seçenek belirtebilirsiniz!`, ephemeral: true });
    }

    let description = '';
    const reacts = [];
    options.forEach((opt, idx) => {
      description += `${NUMBER_EMOJIS[idx]} | **${opt}**\n\n`;
      reacts.push(NUMBER_EMOJIS[idx]);
    });

    const reply = await interaction.reply({
      embeds: [{
        title: `📊 Anket: ${question}`,
        description: description,
        color: 0x8b5cf6,
        footer: { text: `${interaction.user.tag} tarafından başlatıldı.` }
      }],
      fetchReply: true
    });

    for (const r of reacts) {
      await reply.react(r).catch(() => null);
    }
  },

  async run(message, args, client, prefix) {
    const fullText = args.join(' ');
    if (!fullText) {
      return message.reply(`${EMOJIS.cross} Kullanım: \`${prefix}poll Soru? | Seçenek 1 | Seçenek 2\``);
    }

    const parts = fullText.split('|').map(p => p.trim()).filter(Boolean);
    const question = parts[0];
    const options = parts.slice(1);

    if (!question || options.length < 2) {
      return message.reply(`${EMOJIS.cross} Lütfen soruyu ve en az 2 seçeneği dik çizgi (\`|\`) ile ayırarak girin! Örn: \`${prefix}poll Çay mı Kahve mi? | Çay | Kahve\``);
    }
    if (options.length > 10) {
      return message.reply(`${EMOJIS.cross} En fazla 10 seçenek belirtebilirsiniz!`);
    }

    let description = '';
    const reacts = [];
    options.forEach((opt, idx) => {
      description += `${NUMBER_EMOJIS[idx]} | **${opt}**\n\n`;
      reacts.push(NUMBER_EMOJIS[idx]);
    });

    const reply = await message.reply({
      embeds: [{
        title: `📊 Anket: ${question}`,
        description: description,
        color: 0x8b5cf6,
        footer: { text: `${message.author.tag} tarafından başlatıldı.` }
      }]
    });

    for (const r of reacts) {
      await reply.react(r).catch(() => null);
    }
  }
};
