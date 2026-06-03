const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

const questions = [
  {
    q: 'Hangi ünlü pop yıldızı "Thriller" albümüyle tanınır?',
    a: ['Michael Jackson', 'Prince', 'Madonna', 'George Michael'],
    correct: 0
  },
  {
    q: 'Kraliçe grubunun (Queen) ikonik solisti kimdir?',
    a: ['Freddie Mercury', 'David Bowie', 'Robert Plant', 'Mick Jagger'],
    correct: 0
  },
  {
    q: 'Müzikte 5 yatay çizgiden oluşan ve üzerine notaların yazıldığı şekle ne ad verilir?',
    a: ['Dizek (Porte)', 'Anahtar', 'Ölçü', 'Akort'],
    correct: 0
  },
  {
    q: 'Piyanonun toplamda kaç adet tuşu vardır?',
    a: ['88', '76', '92', '64'],
    correct: 0
  },
  {
    q: 'Hangi enstrüman yaylı çalgılar grubunun en büyüğüdür ve en pes sesleri üretir?',
    a: ['Kontrbas', 'Çello', 'Keman', 'Viyola'],
    correct: 0
  },
  {
    q: 'Kurt Cobain hangi efsanevi grunge grubunun solistiydi?',
    a: ['Nirvana', 'Pearl Jam', 'Soundgarden', 'Alice in Chains'],
    correct: 0
  },
  {
    q: 'Dünyaca ünlü "Bohemian Rhapsody" şarkısı hangi gruba aittir?',
    a: ['Queen', 'Led Zeppelin', 'Pink Floyd', 'The Beatles'],
    correct: 0
  },
  {
    q: 'Spotify hangi ülkede kurulmuştur?',
    a: ['İsveç', 'Amerika', 'Norveç', 'Almanya'],
    correct: 0
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Müzik ve genel kültür testi başlatır.'),
  aliases: ['bilgiyarismasi', 'test'],
  category: 'fun',

  async execute(interaction) {
    await interaction.deferReply();
    await runQuiz(interaction, true);
  },

  async run(message, args, client, prefix) {
    await runQuiz(message, false);
  }
};

async function runQuiz(ctx, isSlash) {
  const q = questions[Math.floor(Math.random() * questions.length)];
  const userId = isSlash ? ctx.user.id : ctx.author.id;

  // Shuffle options while keeping track of correct one
  const optionsWithIndices = q.a.map((option, idx) => ({ option, originalIndex: idx }));
  // Fisher-Yates Shuffle
  for (let i = optionsWithIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionsWithIndices[i], optionsWithIndices[j]] = [optionsWithIndices[j], optionsWithIndices[i]];
  }

  const buttons = optionsWithIndices.map((opt, i) => {
    return new ButtonBuilder()
      .setCustomId(`quiz_${i}`)
      .setLabel(opt.option)
      .setStyle(ButtonStyle.Secondary);
  });

  const row = new ActionRowBuilder().addComponents(buttons);

  const embed = {
    title: `${EMOJIS.star} Sudeku Quiz!`,
    description: `### ${q.q}\n\nDoğru yanıtı bulmak için 15 saniyeniz var!`,
    color: 0x8b5cf6,
    footer: { text: `Soruya cevap verecek kişi: ${isSlash ? ctx.user.username : ctx.author.username}` }
  };

  let response;
  if (isSlash) {
    response = await ctx.editReply({ embeds: [embed], components: [row] });
  } else {
    response = await ctx.reply({ embeds: [embed], components: [row] });
  }

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000
  });

  let answered = false;

  collector.on('collect', async i => {
    if (i.user.id !== userId) {
      return i.reply({ content: `${EMOJIS.cross} Bu yarışmayı başkası başlattı, sadece o cevaplayabilir!`, ephemeral: true });
    }

    answered = true;
    const clickedIndex = parseInt(i.customId.replace('quiz_', ''));
    const chosenOption = optionsWithIndices[clickedIndex];
    const isCorrect = chosenOption.originalIndex === q.correct;

    const disabledButtons = buttons.map((btn, idx) => {
      const opt = optionsWithIndices[idx];
      const isThisCorrect = opt.originalIndex === q.correct;
      let style = ButtonStyle.Secondary;

      if (isThisCorrect) style = ButtonStyle.Success;
      else if (idx === clickedIndex) style = ButtonStyle.Danger;

      return ButtonBuilder.from(btn).setStyle(style).setDisabled(true);
    });

    const updatedRow = new ActionRowBuilder().addComponents(disabledButtons);

    const resultEmbed = {
      title: isCorrect ? `${EMOJIS.tick} Tebrikler, Doğru!` : `${EMOJIS.cross} Hatalı Cevap!`,
      description: `### ${q.q}\n\n${isCorrect ? 'Doğru cevabı verdiniz!' : `Yanlış cevap! Doğru cevap: **${q.a[q.correct]}** idi.`}`,
      color: isCorrect ? 0x22c55e : 0xef4444,
      footer: { text: `Süreç tamamlandı.` }
    };

    await i.update({ embeds: [resultEmbed], components: [updatedRow] });
    collector.stop();
  });

  collector.on('end', async (_, reason) => {
    if (!answered && reason !== 'user') {
      const disabledButtons = buttons.map(btn => ButtonBuilder.from(btn).setDisabled(true));
      const updatedRow = new ActionRowBuilder().addComponents(disabledButtons);

      const timeoutEmbed = {
        title: `${EMOJIS.cross} Süre Doldu!`,
        description: `### ${q.q}\n\n15 saniye içinde cevap verilmedi. Doğru cevap: **${q.a[q.correct]}** idi.`,
        color: 0xef4444
      };

      if (isSlash) {
        await ctx.editReply({ embeds: [timeoutEmbed], components: [updatedRow] }).catch(() => {});
      } else {
        await response.edit({ embeds: [timeoutEmbed], components: [updatedRow] }).catch(() => {});
      }
    }
  });
}
