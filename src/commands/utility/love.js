const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

function hashScore(a, b) {
  const text = [a, b].sort().join(':');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % 101;
}

function pickLine(score) {
  if (score >= 90) return 'İki taraf da aynı ritimde.';
  if (score >= 75) return 'Ciddi bir uyum var.';
  if (score >= 55) return 'Tatlı bir potansiyel var.';
  if (score >= 35) return 'Biraz ısınmaya ihtiyaç var.';
  return 'Ritimler şimdilik uzak.';
}

function drawBar(ctx, x, y, score) {
  const filled = Math.round(score / 10);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i < filled ? '#ec4899' : 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + i * 42, y, 34, 16);
  }
}

async function drawAvatar(ctx, user, x, y, size) {
  const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, x, y, size, size);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

async function buildLoveCard(a, b, score) {
  const W = 1000;
  const H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#140b1c');
  bg.addColorStop(1, '#2a1235');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.arc((i * 37) % W, (i * 61) % H, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  await drawAvatar(ctx, a, 90, 110, 150);
  await drawAvatar(ctx, b, 760, 110, 150);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Aşk Ölçer', W / 2, 92);

  ctx.font = 'bold 32px Segoe UI, Arial, sans-serif';
  ctx.fillText(a.username, 165, 300);
  ctx.fillText(b.username, 835, 300);

  ctx.fillStyle = '#f9a8d4';
  ctx.font = 'bold 88px Segoe UI, Arial, sans-serif';
  ctx.fillText(`${score}%`, W / 2, 220);

  drawBar(ctx, 290, 270, score);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '24px Segoe UI, Arial, sans-serif';
  ctx.fillText(pickLine(score), W / 2, 340);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '18px Segoe UI, Arial, sans-serif';
  ctx.fillText(`${a.username} x ${b.username}`, W / 2, 372);

  return canvas.toBuffer('image/png');
}

function resolvePair(ctx, args) {
  if (ctx.isChatInputCommand()) {
    const first = ctx.options.getUser('birinci') || ctx.user;
    const second = ctx.options.getUser('ikinci') || (ctx.options.getUser('birinci') ? ctx.user : first);
    return [first, second];
  }

  const first = ctx.mentions?.users?.first() || ctx.guild?.members?.cache?.get(args[0])?.user || ctx.author;
  const second = ctx.mentions?.users?.at(1) || ctx.guild?.members?.cache?.get(args[1])?.user || ctx.author;
  return [first, second];
}

function buildReply(a, b, score) {
  return {
    embeds: [{
      color: 0xff7ab6,
      description: `${a.username} ile ${b.username} uyumu: ${score}%`,
      footer: { text: pickLine(score) }
    }]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('love')
    .setDescription('İki kişi arasındaki aşk uyumunu gösterir.')
    .addUserOption(option => option.setName('birinci').setDescription('İlk kişi').setRequired(false))
    .addUserOption(option => option.setName('ikinci').setDescription('İkinci kişi').setRequired(false)),
  aliases: ['aşk', 'ask', 'lovecheck'],
  category: 'utility',

  async execute(interaction) {
    const [a, b] = resolvePair(interaction, []);
    const score = hashScore(a.id, b.id);
    const buf = await buildLoveCard(a, b, score);
    return interaction.reply({ files: [new AttachmentBuilder(buf, { name: 'love.png' })], ...buildReply(a, b, score) });
  },

  async run(message, args) {
    const [a, b] = resolvePair(message, args);
    const score = hashScore(a.id, b.id);
    const buf = await buildLoveCard(a, b, score);
    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'love.png' })], ...buildReply(a, b, score) });
  }
};
