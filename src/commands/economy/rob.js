const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Bir kullanıcının cüzdanındaki coinleri çalmayı denersiniz (Riske dikkat!).')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Soyulacak kullanıcı')
        .setRequired(true)
    ),
  aliases: ['soy', 'hirsizlik', 'çal'],
  category: 'economy',
  
  async execute(interaction) {
    const target = interaction.options.getUser('kullanici');
    
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: `${EMOJIS.cross} Kendini soyamazsın kanka.`, ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: `${EMOJIS.cross} Botları soyamazsın!`, ephemeral: true });
    }

    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    const dbTarget = Database.getUser(interaction.guildId, target.id);

    const now = Date.now();
    const cooldown = 3 * 60 * 60 * 1000; // 3 hours

    if (now - dbUser.robLastClaim < cooldown) {
      const remaining = cooldown - (now - dbUser.robLastClaim);
      const hours = Math.floor(remaining / (3600 * 1000));
      const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
      return interaction.reply({
        content: `${EMOJIS.cross} Polisler hala seni arıyor! Kalan süre: **${hours} saat ${minutes} dakika**`,
        ephemeral: true
      });
    }

    if (dbTarget.coins < 50) {
      return interaction.reply({ content: `${EMOJIS.cross} Bu kullanıcının cüzdanı bomboş, soymaya değmez! (En az 50 Coin olmalı)`, ephemeral: true });
    }

    if (dbUser.coins < 100) {
      return interaction.reply({ content: `${EMOJIS.cross} Soygun girişimi cezası ödemek için cüzdanında en az 100 Coin olmalı!`, ephemeral: true });
    }

    const success = Math.random() < 0.45; // 45% chance
    Database.updateUser(interaction.guildId, interaction.user.id, { robLastClaim: now });

    if (success) {
      // Rob 20% to 50% of target cash
      const percent = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
      const amount = Math.floor((dbTarget.coins * percent) / 100);

      Database.addCoins(interaction.guildId, target.id, -amount);
      Database.addCoins(interaction.guildId, interaction.user.id, amount);

      return interaction.reply({
        embeds: [{
          color: 0x22c55e,
          description: `${EMOJIS.tick} **Başarılı Soygun!** <@${target.id}> adlı kullanıcının cüzdanından sinsi bir şekilde **\`${amount} Coin\`** (%${percent}) çaldın.`
        }]
      });
    } else {
      // Fine 100-300 coins
      const fine = Math.floor(Math.random() * (300 - 100 + 1)) + 100;
      const actualFine = Math.min(dbUser.coins, fine);

      Database.addCoins(interaction.guildId, interaction.user.id, -actualFine);
      
      return interaction.reply({
        embeds: [{
          color: 0xef4444,
          description: `${EMOJIS.cross} **Soygun Başarısız!** Yakalandın ve polisler sana **\`${actualFine} Coin\`** ceza kesti. Paranın bir kısmı uçtu!`
        }]
      });
    }
  },

  async run(message, args, client, prefix) {
    const target = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!target) {
      return message.reply(`${EMOJIS.cross} Lütfen soyulacak kişiyi etiketleyin!`);
    }

    if (target.id === message.author.id) {
      return message.reply(`${EMOJIS.cross} Kendini soyamazsın kanka.`);
    }
    if (target.bot) {
      return message.reply(`${EMOJIS.cross} Botları soyamazsın!`);
    }

    const dbUser = Database.getUser(message.guildId, message.author.id);
    const dbTarget = Database.getUser(message.guildId, target.id);

    const now = Date.now();
    const cooldown = 3 * 60 * 60 * 1000; // 3 hours

    if (now - dbUser.robLastClaim < cooldown) {
      const remaining = cooldown - (now - dbUser.robLastClaim);
      const hours = Math.floor(remaining / (3600 * 1000));
      const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
      return message.reply(`${EMOJIS.cross} Polisler hala seni arıyor! Kalan süre: **${hours} saat ${minutes} dakika**`);
    }

    if (dbTarget.coins < 50) {
      return message.reply(`${EMOJIS.cross} Bu kullanıcının cüzdanı bomboş, soymaya değmez! (En az 50 Coin olmalı)`);
    }

    if (dbUser.coins < 100) {
      return message.reply(`${EMOJIS.cross} Soygun girişimi cezası ödemek için cüzdanında en az 100 Coin olmalı!`);
    }

    const success = Math.random() < 0.45;
    Database.updateUser(message.guildId, message.author.id, { robLastClaim: now });

    if (success) {
      const percent = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
      const amount = Math.floor((dbTarget.coins * percent) / 100);

      Database.addCoins(message.guildId, target.id, -amount);
      Database.addCoins(message.guildId, message.author.id, amount);

      return message.reply({
        embeds: [{
          color: 0x22c55e,
          description: `${EMOJIS.tick} **Başarılı Soygun!** <@${target.id}> adlı kullanıcının cüzdanından sinsi bir şekilde **\`${amount} Coin\`** (%${percent}) çaldın.`
        }]
      });
    } else {
      const fine = Math.floor(Math.random() * (300 - 100 + 1)) + 100;
      const actualFine = Math.min(dbUser.coins, fine);

      Database.addCoins(message.guildId, message.author.id, -actualFine);
      
      return message.reply({
        embeds: [{
          color: 0xef4444,
          description: `${EMOJIS.cross} **Soygun Başarısız!** Yakalandın ve polisler sana **\`${actualFine} Coin\`** ceza kesti.`
        }]
      });
    }
  }
};
