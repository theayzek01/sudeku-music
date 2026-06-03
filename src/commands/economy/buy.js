const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

const SHOP_ITEMS = {
  // Backgrounds
  bg_neon: { name: 'Neon Mor Arka Plan', type: 'background', price: 1500, file: 'neon' },
  bg_forest: { name: 'Karanlık Orman Arka Plan', type: 'background', price: 2000, file: 'forest' },
  bg_cyber: { name: 'Cyberpunk Arka Plan', type: 'background', price: 3000, file: 'cyber' },
  
  // Badges
  badge_vip: { name: 'VIP Rozeti', type: 'badge', price: 5000, label: 'VIP' },
  badge_rich: { name: 'Zengin Rozeti', type: 'badge', price: 10000, label: 'RICH' },
  badge_legend: { name: 'Efsane Rozeti', type: 'badge', price: 25000, label: 'LEGEND' }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Mağazadan belirtilen kodu kullanarak ürün satın alır.')
    .addStringOption(option =>
      option.setName('urun_kodu')
        .setDescription('Satın alınacak ürünün kodu (Örn: bg_neon, badge_vip)')
        .setRequired(true)
    ),
  aliases: ['satinal', 'al'],
  category: 'economy',
  
  async execute(interaction) {
    const code = interaction.options.getString('urun_kodu').toLowerCase();
    const item = SHOP_ITEMS[code];

    if (!item) {
      return interaction.reply({ content: `${EMOJIS.cross} Geçersiz ürün kodu! Kodları görmek için \`/shop\` yazın.`, ephemeral: true });
    }

    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    if (dbUser.coins < item.price) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu ürünü satın almak için yeterli coininiz yok! (Gerekli: \`${item.price}\`, Sizde: \`${dbUser.coins}\`)`, ephemeral: true });
    }

    // Check ownership
    if (item.type === 'background') {
      if (dbUser.inventory.includes(code)) {
        return interaction.reply({ content: `${EMOJIS.cross} Bu arka plana zaten sahipsiniz! Profilinizde aktifleştirmek için veritabanında saklandı.`, ephemeral: true });
      }
      
      const newInv = [...dbUser.inventory, code];
      Database.addCoins(interaction.guildId, interaction.user.id, -item.price);
      Database.updateUser(interaction.guildId, interaction.user.id, {
        inventory: newInv,
        customBg: item.file
      });
    } else if (item.type === 'badge') {
      if (dbUser.badges.includes(item.label)) {
        return interaction.reply({ content: `${EMOJIS.cross} Bu rozete zaten sahipsiniz!`, ephemeral: true });
      }

      const newBadges = [...dbUser.badges, item.label];
      Database.addCoins(interaction.guildId, interaction.user.id, -item.price);
      Database.updateUser(interaction.guildId, interaction.user.id, {
        badges: newBadges
      });
    }

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Tebrikler!** **\`${item.name}\`** başarıyla satın alındı ve hesabınıza tanımlandı. Cüzdanınızdan **\`${item.price} Coin\`** düşüldü.`
      }]
    });
  },

  async run(message, args, client, prefix) {
    const code = args[0] ? args[0].toLowerCase() : null;
    if (!code) {
      return message.reply(`${EMOJIS.cross} Lütfen satın alınacak ürünün kodunu belirtin! Örn: \`${prefix}buy bg_neon\``);
    }

    const item = SHOP_ITEMS[code];
    if (!item) {
      return message.reply(`${EMOJIS.cross} Geçersiz ürün kodu! Kodları görmek için \`${prefix}shop\` yazın.`);
    }

    const dbUser = Database.getUser(message.guildId, message.author.id);
    if (dbUser.coins < item.price) {
      return message.reply(`${EMOJIS.cross} Bu ürünü satın almak için yeterli coininiz yok! (Gerekli: \`${item.price}\`, Sizde: \`${dbUser.coins}\`)`);
    }

    if (item.type === 'background') {
      if (dbUser.inventory.includes(code)) {
        return message.reply(`${EMOJIS.cross} Bu arka plana zaten sahipsiniz!`);
      }
      
      const newInv = [...dbUser.inventory, code];
      Database.addCoins(message.guildId, message.author.id, -item.price);
      Database.updateUser(message.guildId, message.author.id, {
        inventory: newInv,
        customBg: item.file
      });
    } else if (item.type === 'badge') {
      if (dbUser.badges.includes(item.label)) {
        return message.reply(`${EMOJIS.cross} Bu rozete zaten sahipsiniz!`);
      }

      const newBadges = [...dbUser.badges, item.label];
      Database.addCoins(message.guildId, message.author.id, -item.price);
      Database.updateUser(message.guildId, message.author.id, {
        badges: newBadges
      });
    }

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **Tebrikler!** **\`${item.name}\`** başarıyla satın alındı ve hesabınıza tanımlandı. Cüzdanınızdan **\`${item.price} Coin\`** düşüldü.`
      }]
    });
  }
};
