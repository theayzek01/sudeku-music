const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const EMOJIS = require('../../utils/emojis');

function pickTarget(ctx, args) {
  if (ctx.isChatInputCommand()) return ctx.options.getUser('kullanıcı') || ctx.user;
  return ctx.mentions?.users?.first() || ctx.guild?.members?.cache?.get(args[0])?.user || ctx.author;
}

async function buildAvatarCard(user) {
  const W = 900;
  const H = 320;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 1024 });
  const image = await loadImage(avatarUrl);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#111827');
  bg.addColorStop(1, '#1f1147');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 16; i++) ctx.fillRect(i * 64, (i % 2) * 24, 28, H);

  ctx.save();
  ctx.beginPath();
  ctx.arc(160, 160, 110, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, 50, 50, 220, 220);
  ctx.restore();

  ctx.strokeStyle = 'rgba(139,92,246,0.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(160, 160, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Segoe UI, Arial, sans-serif';
  ctx.fillText(user.username, 320, 120);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '20px Segoe UI, Arial, sans-serif';
  ctx.fillText(`ID: ${user.id}`, 320, 165);
  ctx.fillText(`Avatar: ${avatarUrl}`, 320, 202);

  return canvas.toBuffer('image/png');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Kullanıcı avatarını gösterir.')
    .addUserOption(o => o.setName('kullanıcı').setDescription('Hedef kullanıcı').setRequired(false)),
  aliases: ['pfp', 'profil', 'avatarim'],
  category: 'utility',

  async execute(interaction) {
    const target = interaction.options.getUser('kullanıcı') || interaction.user;
    const buf = await buildAvatarCard(target);
    return interaction.reply({ files: [new AttachmentBuilder(buf, { name: 'avatar.png' })] });
  },

  async run(message, args) {
    const target = pickTarget(message, args);
    const buf = await buildAvatarCard(target);
    return message.reply({ files: [new AttachmentBuilder(buf, { name: 'avatar.png' })] });
  }
};
