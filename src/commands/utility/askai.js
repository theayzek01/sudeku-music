const { SlashCommandBuilder } = require('discord.js');
const EMOJIS = require('../../utils/emojis');

// Try loading the chat engine
let chatEngine;
try {
  chatEngine = require('../../ai/services/chatEngine');
} catch (e) {
  console.warn('[AskAI] AI Servisi yüklenirken hata (ollama aktif olmayabilir):', e.message);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('askai')
    .setDescription('Yapay zeka (AI) modeline soru sorup sohbet edersiniz.')
    .addStringOption(o => o.setName('soru').setDescription('Yapay zekaya sormak istediğiniz soru').setRequired(true)),
  aliases: ['sor', 'ai', 'sohbet', 'ask'],
  category: 'utility',

  async execute(interaction) {
    if (!chatEngine) {
      return interaction.reply({ content: `${EMOJIS.cross} AI modülü şu anda yüklenemedi.`, flags: 64 });
    }

    await interaction.deferReply();
    const content = interaction.options.getString('soru');

    try {
      const response = await chatEngine.replyRich({
        userId: interaction.user.id,
        userName: interaction.user.username,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        guild: interaction.guild,
        content: content
      });

      return interaction.editReply(response.content || `${EMOJIS.cross} Yanıt alınamadı.`);
    } catch (err) {
      console.error('[AskAI Slash Error]', err);
      return interaction.editReply(`${EMOJIS.cross} AI ile iletişim kurulurken bir hata oluştu: \`${err.message}\``);
    }
  },

  async run(message, args, client, prefix) {
    if (!chatEngine) {
      return message.reply(`${EMOJIS.cross} AI modülü şu anda yüklenemedi.`);
    }

    const content = args.join(' ');
    if (!content) {
      return message.reply(`${EMOJIS.cross} Lütfen sormak istediğiniz soruyu yazın. Örnek: \`${prefix}askai naber?\``);
    }

    const loadingMsg = await message.reply(`${EMOJIS.loading} **Sudeku düşünüyor...**`);

    try {
      const response = await chatEngine.replyRich({
        userId: message.author.id,
        userName: message.author.username,
        channelId: message.channelId,
        guildId: message.guildId,
        guild: message.guild,
        content: content
      });

      return loadingMsg.edit(response.content || `${EMOJIS.cross} Yanıt alınamadı.`);
    } catch (err) {
      console.error('[AskAI Message Error]', err);
      return loadingMsg.edit(`${EMOJIS.cross} AI ile iletişim kurulurken bir hata oluştu: \`${err.message}\``);
    }
  }
};
