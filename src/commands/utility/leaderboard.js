const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

function formatDur(ms) {
  if (!ms || ms <= 0) return '0 dk';
  const min = Math.floor(ms / 60000);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `${hr} sa ${min % 60} dk`;
  return `${min > 0 ? min + ' dk' : Math.floor(ms / 1000) + ' sn'}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Sunucu sıralamasını gösterir.')
    .addStringOption(o =>
      o.setName('tür').setDescription('Sıralama türü').setRequired(false)
        .addChoices(
          { name: '🔊 Ses Süresi', value: 'voice' },
          { name: '🎵 Şarkı Sayısı', value: 'tracks' },
          { name: '💰 Coin', value: 'coins' }
        )
    ),
  aliases: ['lb', 'siralama'],
  category: 'utility',

  async execute(interaction) {
    await interaction.deferReply();
    const type = interaction.options.getString('tür') || 'voice';
    await handleLeaderboard(interaction, type, true);
  },

  async run(message, args, client, prefix) {
    const typeMap = { 'ses': 'voice', 'sarki': 'tracks', 'sarki': 'tracks', 'coin': 'coins' };
    const type = typeMap[args[0]?.toLowerCase()] || 'voice';
    await handleLeaderboard(message, type, false);
  }
};

async function handleLeaderboard(ctx, startType, isSlash) {
  const guildId = isSlash ? ctx.guildId : ctx.guildId;
  const guild = isSlash ? ctx.guild : ctx.guild;
  let currentTab = startType;
  let page = 1;
  const ITEMS = 10;

  function getRows() {
    return Database.getLeaderboard(guildId, currentTab);
  }

  function buildEmbed() {
    const rows = getRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS));
    if (page > totalPages) page = totalPages;
    const slice = rows.slice((page - 1) * ITEMS, page * ITEMS);

    const titles = { voice: '🔊 Ses Kanalı Süresi', tracks: '🎵 Şarkı Dinleme', coins: '💰 Coin Sıralaması' };

    let desc = slice.length === 0 ? '*Henüz veri yok.*' : slice.map((u, i) => {
      const idx = (page - 1) * ITEMS + i + 1;
      const medal = idx === 1 ? EMOJIS.crown || '🥇' : idx === 2 ? '🥈' : idx === 3 ? '🥉' : `\`#${idx}\``;
      let val;
      if (currentTab === 'voice') val = `\`${formatDur(u.voiceTime)}\``;
      else if (currentTab === 'tracks') val = `\`${u.tracksPlayed} şarkı\``;
      else val = `\`${(u.coins || 0).toLocaleString()} 🪙\``;
      return `${medal} <@${u.userId}> — ${val} (Lv.\`${u.level}\`)`;
    }).join('\n');

    return {
      embeds: [{
        title: `${EMOJIS.star || '⭐'} Sunucu Sıralaması — ${titles[currentTab]}`,
        description: desc,
        color: 0x8b5cf6,
        footer: { text: `Sayfa ${page}/${totalPages} • ${rows.length} kayıt` },
        timestamp: new Date().toISOString()
      }]
    };
  }

  function buildButtons() {
    const rows = getRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS));
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lb_voice').setLabel('Ses').setEmoji('🔊').setStyle(currentTab === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('lb_tracks').setLabel('Şarkı').setEmoji('🎵').setStyle(currentTab === 'tracks' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('lb_coins').setLabel('Coin').setEmoji('💰').setStyle(currentTab === 'coins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lb_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
      new ButtonBuilder().setCustomId('lb_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages),
    );
    return [row1, row2];
  }

  const embedData = buildEmbed();
  let response;
  if (isSlash) {
    response = await ctx.editReply({ ...embedData, components: buildButtons() });
  } else {
    response = await ctx.reply({ ...embedData, components: buildButtons() });
  }

  const userId = isSlash ? ctx.user.id : ctx.author.id;
  const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180000 });

  collector.on('collect', async i => {
    if (i.user.id !== userId) return i.reply({ content: 'Bu menü sana ait değil!', ephemeral: true });

    if (i.customId === 'lb_voice') { currentTab = 'voice'; page = 1; }
    else if (i.customId === 'lb_tracks') { currentTab = 'tracks'; page = 1; }
    else if (i.customId === 'lb_coins') { currentTab = 'coins'; page = 1; }
    else if (i.customId === 'lb_prev') page = Math.max(1, page - 1);
    else if (i.customId === 'lb_next') page++;

    await i.update({ ...buildEmbed(), components: buildButtons() });
  });

  collector.on('end', () => {
    response.edit({ components: [] }).catch(() => {});
  });
}
