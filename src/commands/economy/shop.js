const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Sudeku Mağazasını görüntüler.'),
  aliases: ['magaza', 'market', 'store'],
  category: 'economy',
  
  async execute(interaction) {
    return interaction.reply({
      embeds: [getShopEmbed()]
    });
  },

  async run(message, args, client, prefix) {
    return message.reply({
      embeds: [getShopEmbed()]
    });
  }
};

function getShopEmbed() {
  return {
    title: `${EMOJIS.gear} Sudeku Mağazası`,
    description: `Mağazadan profil kartınızı (/rank) özelleştirecek ögeler veya özel rozetler satın alabilirsiniz.\n` +
      `Satın almak için: \`/buy <ürün_kodu>\` veya \`a.buy <ürün_kodu>\`\n\n` +
      `🖼️ **Rank Kartı Arka Planları (Custom Backgrounds)**\n` +
      `• **Neon Mor** (Kod: \`bg_neon\`) — Fiyat: \`1,500 Coin\`\n` +
      `  *Profil kartınıza büyüleyici bir neon mor parlaklık katar.*\n` +
      `• **Karanlık Orman** (Kod: \`bg_forest\`) — Fiyat: \`2,000 Coin\`\n` +
      `  *Doğa temalı, koyu yeşil ve mistik bir atmosfer.*\n` +
      `• **Cyberpunk** (Kod: \`bg_cyber\`) — Fiyat: \`3,000 Coin\`\n` +
      `  *Fütüristik neon sokakların estetiğini yansıtan tasarım.*\n\n` +
      `🏆 **Özel Profil Rozetleri (Badges)**\n` +
      `• **VIP** (Kod: \`badge_vip\`) — Fiyat: \`5,000 Coin\`\n` +
      `  *Rank kartınızda parıldayan bir VIP tacı simgesi belirir.*\n` +
      `• **Zengin (Rich)** (Kod: \`badge_rich\`) — Fiyat: \`10,000 Coin\`\n` +
      `  *Rank kartınızda ışıltılı bir elmas simgesi.*\n` +
      `• **Efsane (Legend)** (Kod: \`badge_legend\`) — Fiyat: \`25,000 Coin\`\n` +
      `  *Rank kartınızda alevli bir efsane simgesi.*`,
    color: 0x8b5cf6
  };
}
