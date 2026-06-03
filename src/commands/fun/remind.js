const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Belirli bir süre sonra size bir şeyi hatırlatır.')
    .addStringOption(option =>
      option.setName('sure')
        .setDescription('Süre (örn: 10s, 30m, 2h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('mesaj')
        .setDescription('Hatırlatılacak mesaj')
        .setRequired(true)
    ),
  aliases: ['hatirlat', 'alarm'],
  category: 'fun',
  
  async execute(interaction) {
    const timeStr = interaction.options.getString('sure');
    const msg = interaction.options.getString('mesaj');
    
    const ms = parseTimeToMs(timeStr);
    if (!ms) {
      return interaction.reply({ content: `${EMOJIS.cross} Geçersiz süre formatı! Örn: \`10s\`, \`30m\`, \`2h\`, \`1d\``, ephemeral: true });
    }

    await interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} Hatırlatıcı oluşturuldu! **${timeStr}** sonra sana DM üzerinden veya bu kanaldan hatırlatacağım.`
      }]
    });

    setTimeout(async () => {
      // Try DM first
      let sent = false;
      try {
        await interaction.user.send({
          embeds: [{
            title: `${EMOJIS.alarm || '⏰'} Hatırlatıcı Zamanı!`,
            description: `**Mesajın:** \`${msg}\`\n\n*Bu hatırlatıcıyı ${timeStr} önce kurmuştun.*`,
            color: 0x8b5cf6
          }]
        });
        sent = true;
      } catch (e) {}

      // If DM failed, send to channel
      if (!sent) {
        interaction.channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [{
            title: `${EMOJIS.alarm || '⏰'} Hatırlatıcı Zamanı!`,
            description: `**Mesajın:** \`${msg}\`\n\n*Bu hatırlatıcıyı ${timeStr} önce kurmuştun.*`,
            color: 0x8b5cf6
          }]
        }).catch(() => null);
      }
    }, ms);
  },

  async run(message, args, client, prefix) {
    const timeStr = args[0];
    const msg = args.slice(1).join(' ');

    if (!timeStr || !msg) {
      return message.reply(`${EMOJIS.cross} Kullanım: \`${prefix}remind 10m ders çalış\``);
    }

    const ms = parseTimeToMs(timeStr);
    if (!ms) {
      return message.reply(`${EMOJIS.cross} Geçersiz süre formatı! Örn: \`10s\`, \`30m\`, \`2h\`, \`1d\``);
    }

    await message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} Hatırlatıcı oluşturuldu! **${timeStr}** sonra sana hatırlatacağım.`
      }]
    });

    setTimeout(async () => {
      let sent = false;
      try {
        await message.author.send({
          embeds: [{
            title: `⏰ Hatırlatıcı Zamanı!`,
            description: `**Mesajın:** \`${msg}\`\n\n*Bu hatırlatıcıyı ${timeStr} önce kurmuştun.*`,
            color: 0x8b5cf6
          }]
        });
        sent = true;
      } catch (e) {}

      if (!sent) {
        message.channel.send({
          content: `<@${message.author.id}>`,
          embeds: [{
            title: `⏰ Hatırlatıcı Zamanı!`,
            description: `**Mesajın:** \`${msg}\`\n\n*Bu hatırlatıcıyı ${timeStr} önce kurmuştun.*`,
            color: 0x8b5cf6
          }]
        }).catch(() => null);
      }
    }, ms);
  }
};

function parseTimeToMs(str) {
  const match = str.match(/^(\d+)([ssmhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}
