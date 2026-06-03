const chatEngine = require('../../services/chatEngine');

module.exports = {
  name: 'ai',
  aliases: ['ask', 'sohbet'],
  description: 'AI sohbet',
  usage: 'ai <mesaj>',
  async run(client, message, args) {
    const content = args.join(' ').trim();
    if (!content) return message.reply('ne yazmamı istiyosan mesajı da ekle ya');
    await message.channel.sendTyping().catch(() => null);
    const result = await chatEngine.replyRich({
      userId: message.author.id,
      userName: message.author.username,
      channelId: message.channelId,
      guildId: message.guildId,
      guild: message.guild,
      content,
    });
    const sent = await message.reply({ content: result.content, allowedMentions: { repliedUser: false } });
    if (sent && result.actions?.react) {
      const reacts = Array.isArray(result.actions.react) ? result.actions.react : [result.actions.react];
      for (const r of reacts) {
        await sent.react(r).catch(() => null);
      }
    }
    return sent;
  },
};
