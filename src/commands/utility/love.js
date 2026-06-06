const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

function hashScore(a, b) {
  const text = [a, b].sort().join(':');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return (hash % 101);
}

function buildBar(score) {
  const filled = Math.round(score / 10);
  return `${'💗'.repeat(filled)}${'🤍'.repeat(10 - filled)}`;
}

function pickLine(score) {
  if (score >= 90) return 'Tam bir masal ikilisi.';
  if (score >= 75) return 'Cidden tatlı bir eşleşme.';
  if (score >= 55) return 'Fena değil, biraz kıvılcım var.';
  if (score >= 35) return 'Biraz ısınmaya ihtiyaç var.';
  return 'Kalpleri aynı ritimde değil henüz.';
}

function resolveTargetUser(ctx, args) {
  if (ctx.isChatInputCommand()) {
    return ctx.options.getUser('kullanıcı') || ctx.user;
  }

  return ctx.mentions?.users?.first() || ctx.guild?.members?.cache?.get(args[0])?.user || ctx.author;
}

function buildLoveEmbed(author, target) {
  const score = hashScore(author.id, target.id);
  return {
    embeds: [{
      color: 0xff7ab6,
      title: `${EMOJIS.heart} Aşk Ölçer`,
      description: [
        `**${author.username}** + **${target.username}**`,
        '',
        `${buildBar(score)} \`${score}%\``,
        pickLine(score)
      ].join('\n'),
      thumbnail: { url: target.displayAvatarURL({ extension: 'png', size: 128 }) },
      footer: { text: 'sade ama tatlı' },
      timestamp: new Date().toISOString()
    }]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('love')
    .setDescription('İki kişi arasındaki aşk uyumunu gösterir.')
    .addUserOption(option =>
      option.setName('kullanıcı')
        .setDescription('Aşk ölçülecek kişi')
        .setRequired(false)
    ),
  aliases: ['aşk', 'ask', 'lovecheck'],
  category: 'utility',

  async execute(interaction) {
    const target = interaction.options.getUser('kullanıcı') || interaction.user;
    return interaction.reply(buildLoveEmbed(interaction.user, target));
  },

  async run(message, args) {
    const target = resolveTargetUser(message, args);
    return message.reply(buildLoveEmbed(message.author, target));
  }
};
