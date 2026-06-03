const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const EMOJIS = require('../../utils/emojis');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tüm kullanılabilir bot komutlarını kategorileriyle listeler.'),
  aliases: ['yardim', 'y', 'commands', 'komutlar'],
  category: 'utility',

  async execute(interaction) {
    await interaction.deferReply();
    await sendHelp(interaction, true);
  },

  async run(message, args, client, prefix) {
    await sendHelp(message, false);
  }
};

async function sendHelp(ctx, isSlash) {
  const client = isSlash ? ctx.client : ctx.client;

  // Dynamically group commands by category
  // Let's read from the client commands collection if available, or just read files
  // Let's load the categories map from the filesystem directly to make it extremely robust
  const categories = {
    music: { name: '🎵 Müzik', desc: 'Müzik oynatıcı, filtreler ve ses kontrolleri.' },
    moderation: { name: '🛡️ Moderasyon', desc: 'Yetkililer için sunucu düzenleme/ceza komutları.' },
    automod: { name: '🤖 AutoMod', desc: 'Küfür, link, davet ve spam engelleme ayarları.' },
    economy: { name: '💰 Ekonomi', desc: 'Günlük coin kazanma, çalışma, soygun ve dükkan işlemleri.' },
    fun: { name: '🎉 Eğlence', desc: 'AFK, hatırlatıcı, anket, quiz ve çekiliş komutları.' },
    utility: { name: '⚙️ Yardımcı / Genel', desc: 'İstatistikler, sıralama, seviye kartı ve sunucu bilgisi.' }
  };

  const commandDir = path.join(__dirname, '../..', 'commands');
  const commandsData = {};

  Object.keys(categories).forEach(cat => {
    commandsData[cat] = [];
    const catPath = path.join(commandDir, cat);
    if (fs.existsSync(catPath)) {
      const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
      files.forEach(file => {
        try {
          const cmd = require(path.join(catPath, file));
          if (cmd.data) {
            commandsData[cat].push({
              name: cmd.data.name,
              desc: cmd.data.description,
              aliases: cmd.aliases || []
            });
          }
        } catch (e) {
          // ignore error
        }
      });
    }
  });

  const embedColor = 0x8b5cf6;
  const homeEmbed = {
    title: `${EMOJIS.moon || '🌙'} Sudeku - Yardım Kılavuzu`,
    description: `Sudeku; üstün ses kalitesi, moderasyon araçları, eğlence, ekonomi ve otomasyon özellikleriyle donatılmış bir **All-in-One Discord Botu**dur.\n\n` +
      `Aşağıdaki açılır menüyü kullanarak kategoriler arasında geçiş yapabilirsiniz.\n\n` +
      `✨ **Kullanım Prefiksleri:** \`/\` (Slash), \`a.\` veya \`a!\` (Mesaj Prefiksi)\n\n` +
      Object.entries(categories).map(([key, val]) => {
        return `**${val.name}**\n*${val.desc}* (\`${commandsData[key]?.length || 0} komut\`)`;
      }).join('\n\n'),
    color: embedColor,
    thumbnail: { url: client.user.displayAvatarURL() },
    footer: { text: `Sudeku | Toplam ${Object.values(commandsData).flat().length} komut aktif!` },
    timestamp: new Date().toISOString()
  };

  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_select')
    .setPlaceholder('Bir kategori seçin...')
    .addOptions([
      { label: 'Ana Sayfa', value: 'home', emoji: '🏠', description: 'Ana yardım sayfasına geri dön.' },
      ...Object.entries(categories).map(([key, val]) => ({
        label: val.name.replace(/[^\p{L}\s]/gu, '').trim(),
        value: key,
        emoji: val.name.split(' ')[0],
        description: val.desc.substring(0, 100)
      }))
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  let response;
  if (isSlash) {
    response = await ctx.editReply({ embeds: [homeEmbed], components: [row] });
  } else {
    response = await ctx.reply({ embeds: [homeEmbed], components: [row] });
  }

  const userId = isSlash ? ctx.user.id : ctx.author.id;
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120000
  });

  collector.on('collect', async i => {
    if (i.user.id !== userId) {
      return i.reply({ content: `${EMOJIS.cross} Bu menüyü sadece komutu kullanan kişi yönetebilir!`, ephemeral: true });
    }

    const value = i.values[0];
    if (value === 'home') {
      await i.update({ embeds: [homeEmbed] });
    } else {
      const cat = categories[value];
      const cmds = commandsData[value] || [];

      const catEmbed = {
        title: `${cat.name} Komutları`,
        description: `${cat.desc}\n\n` + (cmds.length === 0 ? '*Bu kategoride henüz komut bulunmuyor.*' : cmds.map(c => {
          const aliasesText = c.aliases.length > 0 ? ` (Alternatif: \`${c.aliases.join(', ')}\`)` : '';
          return `• **\`/${c.name}\` / \`a.${c.name}\`**\n  *${c.desc || 'Açıklama belirtilmemiş.'}*${aliasesText}`;
        }).join('\n\n')),
        color: embedColor,
        thumbnail: { url: client.user.displayAvatarURL() },
        footer: { text: `Kategori: ${cat.name} • Sayfa otomatik kapanabilir.` },
        timestamp: new Date().toISOString()
      };

      await i.update({ embeds: [catEmbed] });
    }
  });

  collector.on('end', () => {
    response.edit({ components: [] }).catch(() => {});
  });
}
