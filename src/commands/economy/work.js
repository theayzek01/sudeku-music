const { SlashCommandBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

const JOBS = [
  'Yazılım Geliştirici olarak bir kod hatasını çözdün',
  'Müzik yapımcısı olarak yeni bir beat tasarladın',
  'Discord sunucusunda moderatör olarak shift tamamladın',
  'Süpermarkette kasiyer olarak çalıştın',
  'Tasarımcı olarak bir logo çizdin',
  'Twitch yayını açarak bağış topladın',
  'Sokak sanatçısı olarak gitar çaldın',
  'Kuryelik yaparak paket teslim ettin'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Bir işte çalışarak coin kazanırsınız.'),
  aliases: ['calis', 'is'],
  category: 'economy',
  
  async execute(interaction) {
    const dbUser = Database.getUser(interaction.guildId, interaction.user.id);
    const now = Date.now();
    const cooldown = 60 * 60 * 1000; // 1 hour

    if (now - dbUser.workLastClaim < cooldown) {
      const remaining = cooldown - (now - dbUser.workLastClaim);
      const minutes = Math.floor(remaining / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      return interaction.reply({
        content: `${EMOJIS.cross} Çalışıp yoruldun! Kalan dinlenme süren: **${minutes} dakika ${seconds} saniye**`,
        ephemeral: true
      });
    }

    const reward = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    
    Database.addCoins(interaction.guildId, interaction.user.id, reward);
    Database.updateUser(interaction.guildId, interaction.user.id, { workLastClaim: now });

    return interaction.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `💼 ${job} ve **\`${reward} Coin\`** kazandın!`
      }]
    });
  },

  async run(message, args, client, prefix) {
    const dbUser = Database.getUser(message.guildId, message.author.id);
    const now = Date.now();
    const cooldown = 60 * 60 * 1000; // 1 hour

    if (now - dbUser.workLastClaim < cooldown) {
      const remaining = cooldown - (now - dbUser.workLastClaim);
      const minutes = Math.floor(remaining / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      return message.reply(`${EMOJIS.cross} Çalışıp yoruldun! Kalan dinlenme süren: **${minutes} dakika ${seconds} saniye**`);
    }

    const reward = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    
    Database.addCoins(message.guildId, message.author.id, reward);
    Database.updateUser(message.guildId, message.author.id, { workLastClaim: now });

    return message.reply({
      embeds: [{
        color: 0x8b5cf6,
        description: `💼 ${job} ve **\`${reward} Coin\`** kazandın!`
      }]
    });
  }
};
