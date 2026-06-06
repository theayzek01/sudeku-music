const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Döngü modunu ayarlar.')
    .addIntegerOption(option =>
      option.setName('mod')
        .setDescription('0: Kapalı, 1: Şarkı Tekrarı, 2: Sıra Tekrarı')
        .setRequired(true)
        .addChoices(
          { name: 'Döngü: Kapalı', value: 0 },
          { name: 'Döngü: Şarkı Tekrarı', value: 1 },
          { name: 'Döngü: Sıra Tekrarı', value: 2 }
        )
    ),
  aliases: ['dongu'],
  category: 'music',
  
  async execute(interaction, playerManager) {
    const queue = playerManager.getQueue(interaction.guildId);
    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }],
        flags: 64
      });
    }

    const mode = interaction.options.getInteger('mod');
    queue.setLoopMode(mode);

    let desc = 'Döngü kapatıldı.';
    if (mode === 1) desc = 'Şarkı tekrarı aktif edildi.';
    if (mode === 2) desc = 'Tüm sıra tekrarı aktif edildi.';

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${desc}**`
      }]
    });
  },

  async run(message, args, client, prefix, playerManager) {
    const queue = playerManager.getQueue(message.guildId);
    if (!queue || !queue.currentTrack) {
      return message.reply({
        embeds: [{
          color: 0xff3333,
          description: `${EMOJIS.cross} **Aktif bir çalma oturumu yok!**`
        }]
      });
    }

    const modeStr = args[0];
    let mode = 0;
    if (modeStr === '1' || modeStr === 'song' || modeStr === 'track') mode = 1;
    else if (modeStr === '2' || modeStr === 'queue' || modeStr === 'all') mode = 2;
    else if (modeStr === '0' || modeStr === 'off') mode = 0;
    else {
      // Toggle loop
      mode = (queue.loopMode + 1) % 3;
    }

    queue.setLoopMode(mode);
    let desc = 'Döngü kapatıldı.';
    if (mode === 1) desc = 'Şarkı tekrarı aktif edildi.';
    if (mode === 2) desc = 'Tüm sıra tekrarı aktif edildi.';

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `${EMOJIS.tick} **${desc}**`
      }]
    });
  }
};
