const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Database = require('../../database');
const EMOJIS = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Destek (Ticket) sistemini yönetir.')
    .addSubcommand(sub =>
      sub.setName('kurulum')
        .setDescription('Destek panelini bu kanala kurar.')
        .addChannelOption(o => o.setName('kategori').setDescription('Bilet kanallarının açılacağı kategori').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
    )
    .addSubcommand(sub =>
      sub.setName('kapat')
        .setDescription('Aktif bilet kanalını kapatır.')
    ),
  aliases: ['destek', 'bilet'],
  category: 'utility',

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (sub === 'kurulum') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.editReply(`${EMOJIS.cross} Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!`);
      }

      const category = interaction.options.getChannel('kategori');
      const channel = interaction.channel;

      const embed = {
        title: `${EMOJIS.star || '⭐'} Sudeku Destek Sistemi`,
        description: 'Yetkili ekibimizle iletişime geçmek, şikayetlerinizi bildirmek veya yardım almak için aşağıdaki butona basarak yeni bir destek talebi (bilet) oluşturabilirsiniz.',
        color: 0x8b5cf6,
        footer: { text: 'Sudeku Destek Sistemi' },
        timestamp: new Date().toISOString()
      };

      const btn = new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Bilet Oluştur')
        .setEmoji('✉️')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(btn);

      // Update database config
      Database.updateGuildConfig(interaction.guildId, {
        ticketCategoryId: category.id,
        ticketChannelId: channel.id
      });

      const msg = await channel.send({ embeds: [embed], components: [row] });
      Database.updateGuildConfig(interaction.guildId, {
        ticketPanelMsgId: msg.id
      });

      return interaction.editReply(`${EMOJIS.tick} Destek paneli başarıyla bu kanala kuruldu! Biletler **${category.name}** kategorisinde açılacaktır.`);
    }

    if (sub === 'kapat') {
      const ticketInfo = Database.getTicket(interaction.channelId);
      if (!ticketInfo) {
        return interaction.editReply(`${EMOJIS.cross} Bu kanal aktif bir bilet kanalı değil!`);
      }

      await interaction.editReply(`${EMOJIS.loading} Bilet kapatılıyor ve kanal 5 saniye içinde siliniyor...`);
      Database.closeTicket(interaction.channelId);

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  },

  async run(message, args, client, prefix) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && args[0] === 'kurulum') {
      return message.reply(`${EMOJIS.cross} Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!`);
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'kurulum') {
      // Find category argument
      const categoryId = args[1]?.replace(/[^\d]/g, '');
      const category = message.guild.channels.cache.get(categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        return message.reply(`${EMOJIS.cross} Lütfen geçerli bir kategori ID'si veya etiketi belirtin: \`a.ticket kurulum <kategori-id>\``);
      }

      const embed = {
        title: `${EMOJIS.star || '⭐'} Sudeku Destek Sistemi`,
        description: 'Yetkili ekibimizle iletişime geçmek, şikayetlerinizi bildirmek veya yardım almak için aşağıdaki butona basarak yeni bir bilet oluşturabilirsiniz.',
        color: 0x8b5cf6,
        footer: { text: 'Sudeku Destek Sistemi' },
        timestamp: new Date().toISOString()
      };

      const btn = new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Bilet Oluştur')
        .setEmoji('✉️')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(btn);

      Database.updateGuildConfig(message.guildId, {
        ticketCategoryId: category.id,
        ticketChannelId: message.channel.id
      });

      const msg = await message.channel.send({ embeds: [embed], components: [row] });
      Database.updateGuildConfig(message.guildId, {
        ticketPanelMsgId: msg.id
      });

      return message.reply(`${EMOJIS.tick} Destek paneli başarıyla kuruldu!`);
    } else if (sub === 'kapat') {
      const ticketInfo = Database.getTicket(message.channelId);
      if (!ticketInfo) {
        return message.reply(`${EMOJIS.cross} Bu kanal aktif bir bilet kanalı değil!`);
      }

      const loadingMsg = await message.reply(`${EMOJIS.loading} Bilet kapatılıyor ve kanal 5 saniye içinde siliniyor...`);
      Database.closeTicket(message.channelId);

      setTimeout(async () => {
        await message.channel.delete().catch(() => {});
      }, 5000);
    } else {
      return message.reply(`${EMOJIS.cross} Geçersiz argüman! Kullanım: \`a.ticket kurulum <kategori-id>\` veya \`a.ticket kapat\``);
    }
  }
};
