const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Sunucu hakkında detaylı bilgi gösterir.'),
  aliases: ['sunucuinfo', 'si', 'guild'],
  category: 'utility',

  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.members.fetch().catch(() => {});
    sendServerInfo(guild, interaction.member, (data) => interaction.editReply(data));
  },

  async run(message, args, client, prefix) {
    const guild = message.guild;
    await guild.members.fetch().catch(() => {});
    sendServerInfo(guild, message.member, (data) => message.reply(data));
  }
};

async function sendServerInfo(guild, member, reply) {
  const owner = await guild.fetchOwner().catch(() => null);
  const totalMembers = guild.memberCount;
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = totalMembers - bots;
  const textCh = guild.channels.cache.filter(c => c.type === 0).size;
  const voiceCh = guild.channels.cache.filter(c => c.type === 2).size;
  const categories = guild.channels.cache.filter(c => c.type === 4).size;
  const boosts = guild.premiumSubscriptionCount || 0;
  const boostTier = guild.premiumTier;
  const roles = guild.roles.cache.size - 1;
  const emojis = guild.emojis.cache.size;
  const stickers = guild.stickers?.cache?.size || 0;
  const verificationLevels = ['Yok', 'Düşük', 'Orta', 'Yüksek', 'Çok Yüksek'];

  const features = guild.features.length > 0
    ? guild.features.slice(0, 5).map(f => `\`${f.toLowerCase().replace(/_/g, ' ')}\``).join(', ')
    : '*Özellik yok*';

  reply({
    embeds: [{
      title: `${EMOJIS.star} ${guild.name}`,
      color: 0x8b5cf6,
      thumbnail: { url: guild.iconURL({ extension: 'png', size: 256 }) || '' },
      image: guild.bannerURL({ size: 1024 }) ? { url: guild.bannerURL({ size: 1024 }) } : undefined,
      fields: [
        {
          name: `${EMOJIS.info} Genel`,
          value: [
            `• **Sahip:** ${owner ? `<@${owner.id}>` : 'Bilinmiyor'}`,
            `• **Kuruluş:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
            `• **ID:** \`${guild.id}\``,
            `• **Doğrulama:** \`${verificationLevels[guild.verificationLevel] || 'Bilinmiyor'}\``,
          ].join('\n'),
          inline: false
        },
        {
          name: `${EMOJIS.voice} Üyeler`,
          value: `• **Toplam:** \`${totalMembers}\`\n• **İnsan:** \`${humans}\`\n• **Bot:** \`${bots}\``,
          inline: true
        },
        {
          name: `${EMOJIS.textChannel} Kanallar`,
          value: `• **Yazı:** \`${textCh}\`\n• **Ses:** \`${voiceCh}\`\n• **Kategori:** \`${categories}\``,
          inline: true
        },
        {
          name: `${EMOJIS.moderator} Durum`,
          value: `• **Roller:** \`${roles}\`\n• **Emoji:** \`${emojis}\`\n• **Sticker:** \`${stickers}\`\n• **Boost:** \`${boosts}\` (Seviye ${boostTier})`,
          inline: true
        },
        {
          name: `${EMOJIS.spark || EMOJIS.star} Özellikler`,
          value: features,
          inline: false
        }
      ],
      footer: { text: `İsteyen: ${member.user.tag}` },
      timestamp: new Date().toISOString()
    }]
  });
}
