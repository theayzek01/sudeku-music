const config = require('../../config/config.json');
const aiConfig = require('../../config/ai');

module.exports = {
  name: 'help',
  aliases: ['yardım', 'yardim', 'komutlar', 'commands'],
  description: 'Komutları gösterir',
  usage: 'help',
  async run(client, message) {
    const text = [
      `**${aiConfig.botName} yardım**`,
      '',
      `**Prefix:** \`${config.prefix}\``,
      '',
      '**Sohbet & Etkileşim**',
      `- \`${config.prefix}ai <mesaj>\` Sude ile sohbet başlatır.`,
      `- \`${config.prefix}iliskim\` Sude ile arandaki samimiyet ve bağlılık derecesini ölçer.`,
      `- \`${config.prefix}mood\` Sude'nin anlık hormonal ve zihinsel durumunu gösterir.`,
      `- \`${config.prefix}hafiza\` Sude'nin senin hakkında hatıralarında ne sakladığını listeler.`,
      `- \`${config.prefix}gunluk\` Sude'nin bugüne ait gizli günlüğünü okursun.`,
      `- \`${config.prefix}itiraf <itirafın>\` Sude'ye gizli bir itirafta bulunursun.`,
      `- \`${config.prefix}xox <@rakip>\` Bir arkadaşına XOX (Tic-Tac-Toe) meydan okursun!`,
      `- \`${config.prefix}ping\` Latency kontrolü.`,
      `- \`${config.prefix}help\` Bu yardım menüsünü gösterir.`,
      '',
      '**Slash (Eğlence & Bilişsel) Komutları**',
      '- `/chat`, `/iliskim`, `/mind`, `/memory`, `/gunluk`, `/itiraf`, `/status`, `/ask-olcer`, `/xox`',
      '',
      '**Zihin Kontrol Odası & Web Panel**',
      '- `http://127.0.0.1:3030?token=ADMIN_TOKEN`',
    ].join('\n');
    return message.reply({ content: text, allowedMentions: { repliedUser: false } });
  },
};
