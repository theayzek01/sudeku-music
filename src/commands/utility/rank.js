const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Kullanıcının seviye/XP kartını gösterir.')
    .addUserOption(o => o.setName('kullanıcı').setDescription('Hedef kullanıcı').setRequired(false)),
  aliases: ['seviye', 'level', 'xp'],
  category: 'utility',

  async execute(interaction) {
    const target = interaction.options.getUser('kullanıcı') || interaction.user;
    if (target.bot) return interaction.reply({ content: `${EMOJIS.cross} Botların seviye kartı bulunmaz!`, ephemeral: true });

    await interaction.deferReply();

    const dbUser = Database.getUser(interaction.guildId, target.id, target.username, target.displayAvatarURL({ extension: 'png', size: 128 }));
    const leaderboard = Database.getLeaderboard(interaction.guildId, 'voice');
    const rank = leaderboard.findIndex(u => u.userId === target.id) + 1 || leaderboard.length + 1;

    try {
      const { generateRankCard } = require('../../player/canvasGenerator');
      const buf = await generateRankCard(dbUser, rank, leaderboard.length || 1);
      const attachment = new AttachmentBuilder(buf, { name: 'rank.png' });
      return interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('[Rank Slash Error]', err);
      return interaction.editReply({ content: `${EMOJIS.cross} Kart oluşturulurken hata oluştu: \`${err.message}\`` });
    }
  },

  async run(message, args, client, prefix) {
    const target = message.mentions.users.first() || message.author;
    if (target.bot) return message.reply(`${EMOJIS.cross} Botların seviye kartı bulunmaz!`);

    const loadingMsg = await message.reply(`${EMOJIS.loading} **Kart hazırlanıyor...**`);

    const dbUser = Database.getUser(message.guildId, target.id, target.username, target.displayAvatarURL({ extension: 'png', size: 128 }));
    const leaderboard = Database.getLeaderboard(message.guildId, 'voice');
    const rank = leaderboard.findIndex(u => u.userId === target.id) + 1 || leaderboard.length + 1;

    try {
      const { generateRankCard } = require('../../player/canvasGenerator');
      const buf = await generateRankCard(dbUser, rank, leaderboard.length || 1);
      const attachment = new AttachmentBuilder(buf, { name: 'rank.png' });
      await loadingMsg.delete().catch(() => {});
      return message.reply({ files: [attachment] });
    } catch (err) {
      console.error('[Rank Msg Error]', err);
      return loadingMsg.edit(`${EMOJIS.cross} Kart oluşturulurken hata oluştu: \`${err.message}\``);
    }
  }
};
