const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

// Active giveaways: Map<messageId, giveawayData>
const activeGiveaways = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Çekiliş sistemi.')
    .addSubcommand(sub =>
      sub.setName('baslat')
        .setDescription('Yeni bir çekiliş başlatır.')
        .addStringOption(o => o.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
        .addIntegerOption(o => o.setName('kazanan').setDescription('Kazanan sayısı').setRequired(true).setMinValue(1).setMaxValue(20))
        .addStringOption(o => o.setName('odül').setDescription('Çekiliş ödülü').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('bitir')
        .setDescription('Bir çekilişi erken bitirir.')
        .addStringOption(o => o.setName('mesaj_id').setDescription('Çekiliş mesaj ID\'si').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('yenile')
        .setDescription('Bir çekilişi yeniden çeker.')
        .addStringOption(o => o.setName('mesaj_id').setDescription('Çekiliş mesaj ID\'si').setRequired(true))
    ),
  aliases: ['cekilis'],
  category: 'fun',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'baslat') {
      const timeStr = interaction.options.getString('sure');
      const winnerCount = interaction.options.getInteger('kazanan');
      const prize = interaction.options.getString('odül');

      const ms = parseTimeToMs(timeStr);
      if (!ms || ms < 10000) {
        return interaction.reply({ content: `${EMOJIS.cross} Geçersiz süre! En az 10 saniye olmalıdır. Örn: \`10s\`, \`5m\`, \`2h\``, ephemeral: true });
      }

      const endsAt = Date.now() + ms;
      const endsAtSec = Math.floor(endsAt / 1000);

      await interaction.reply({ content: `${EMOJIS.tick} Çekiliş başlatılıyor...`, ephemeral: true });

      const msg = await interaction.channel.send({
        embeds: [buildGiveawayEmbed(prize, winnerCount, endsAtSec, interaction.user)]
      });

      await msg.react('1473947509733855344').catch(() => null);

      const gData = { prize, winnerCount, endsAt, hostId: interaction.user.id, channelId: interaction.channelId, guildId: interaction.guildId };
      activeGiveaways.set(msg.id, gData);

      // Timer
      setTimeout(() => endGiveaway(msg, gData), ms);

    } else if (sub === 'bitir') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: `${EMOJIS.cross} Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine ihtiyacınız var.`, ephemeral: true });
      }
      const msgId = interaction.options.getString('mesaj_id');
      const gData = activeGiveaways.get(msgId);
      if (!gData) return interaction.reply({ content: `${EMOJIS.cross} Aktif çekiliş bulunamadı!`, ephemeral: true });

      const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
      if (!msg) return interaction.reply({ content: `${EMOJIS.cross} Mesaj bulunamadı!`, ephemeral: true });

      activeGiveaways.delete(msgId);
      await endGiveaway(msg, gData);
      return interaction.reply({ content: `${EMOJIS.tick} Çekiliş erken bitirildi.`, ephemeral: true });

    } else if (sub === 'yenile') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: `${EMOJIS.cross} Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine ihtiyacınız var.`, ephemeral: true });
      }
      const msgId = interaction.options.getString('mesaj_id');
      const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
      if (!msg) return interaction.reply({ content: `${EMOJIS.cross} Mesaj bulunamadı!`, ephemeral: true });

      const reaction = msg.reactions.cache.get('1473947509733855344');
      if (!reaction) return interaction.reply({ content: `${EMOJIS.cross} Çekiliş mesajında ${EMOJIS.giveaway} reaksiyonu bulunamadı!`, ephemeral: true });

      const users = await reaction.users.fetch();
      const eligible = users.filter(u => !u.bot);
      if (eligible.size === 0) {
        return interaction.reply({ content: `${EMOJIS.cross} Yeniden çekilecek katılımcı yok!`, ephemeral: true });
      }

      const arr = eligible.map(u => u);
      const winner = arr[Math.floor(Math.random() * arr.length)];

      await interaction.channel.send({
        content: `${EMOJIS.giveaway} Yeni kazanan: <@${winner.id}>! Tebrikler!`
      });

      return interaction.reply({ content: `${EMOJIS.tick} Çekiliş yenilendi.`, ephemeral: true });
    }
  },

  async run(message, args, client, prefix) {
    return message.reply(`${EMOJIS.cross} Bu komut yalnızca slash komut olarak kullanılabilir: \`/giveaway baslat\``);
  }
};

function buildGiveawayEmbed(prize, winnerCount, endsAtSec, host) {
  return {
    title: '${EMOJIS.giveaway} ÇEKİLİŞ BAŞLADI!',
    description: `**Ödül:** ${prize}\n\n${EMOJIS.giveaway} Katılmak için reaksiyon bırakın!\n\n**Kazanan Sayısı:** ${winnerCount}\n**Bitiş:** <t:${endsAtSec}:R> (<t:${endsAtSec}:f>)\n**Düzenleyen:** ${host}`,
    color: 0x8b5cf6,
    footer: { text: `${winnerCount} kazanan • Bitiş zamanı` },
    timestamp: new Date(endsAtSec * 1000).toISOString()
  };
}

async function endGiveaway(msg, gData) {
  const reaction = msg.reactions.cache.get('1473947509733855344') || (await msg.fetch().then(m => m.reactions.cache.get('1473947509733855344')).catch(() => null));

  let winners = [];
  if (reaction) {
    const users = await reaction.users.fetch().catch(() => null);
    if (users) {
      const eligible = users.filter(u => !u.bot).map(u => u);
      const shuffled = eligible.sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, gData.winnerCount);
    }
  }

  if (winners.length === 0) {
    await msg.edit({
      embeds: [{
        title: '${EMOJIS.giveaway} ÇEKİLİŞ BİTTİ',
        description: `**Ödül:** ${gData.prize}\n\n${EMOJIS.cross} Yeterli katılımcı olmadığı için kazanan belirlenemedi.`,
        color: 0x5a189a
      }]
    }).catch(() => null);

    await msg.channel.send({ content: `Çekiliş bitti (**${gData.prize}**) ama yeterli katılımcı yoktu!` }).catch(() => null);
    return;
  }

  const winnerMentions = winners.map(u => `<@${u.id}>`).join(', ');

  await msg.edit({
    embeds: [{
      title: '${EMOJIS.giveaway} ÇEKİLİŞ BİTTİ!',
      description: `**Ödül:** ${gData.prize}\n\n${EMOJIS.crownGold} **Kazanan(lar):** ${winnerMentions}\n\n*Tebrikler!*`,
      color: 0x7c3aed
    }]
  }).catch(() => null);

  await msg.channel.send({
    content: `${EMOJIS.giveaway} Tebrikler ${winnerMentions}! **${gData.prize}** çekilişini kazandınız!\n${EMOJIS.arrowss} [Çekiliş Mesajı](${msg.url})`
  }).catch(() => null);
}

function parseTimeToMs(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  switch (match[2].toLowerCase()) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}
