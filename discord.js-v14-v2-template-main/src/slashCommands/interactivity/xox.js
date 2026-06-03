const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const activeGames = new Map();

function checkWinner(board) {
  const lines = [
    // Horizontals
    [[0,0], [0,1], [0,2]],
    [[1,0], [1,1], [1,2]],
    [[2,0], [2,1], [2,2]],
    // Verticals
    [[0,0], [1,0], [2,0]],
    [[0,1], [1,1], [2,1]],
    [[0,2], [1,2], [2,2]],
    // Diagonals
    [[0,0], [1,1], [2,2]],
    [[0,2], [1,1], [2,0]]
  ];

  for (const line of lines) {
    const [[r1,c1], [r2,c2], [r3,c3]] = line;
    if (board[r1][c1] !== ' ' && board[r1][c1] === board[r2][c2] && board[r1][c1] === board[r3][c3]) {
      return board[r1][c1];
    }
  }

  // Draw check
  let filled = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] !== ' ') filled++;
    }
  }
  if (filled === 9) return 'draw';

  return null;
}

function buildBoardComponents(gameId, game) {
  const rows = [];
  
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const cell = game.board[r][c];
      
      let style = ButtonStyle.Secondary;
      let emoji = '▫️';

      if (cell === 'X') {
        style = ButtonStyle.Primary;
        emoji = '❌';
      } else if (cell === 'O') {
        style = ButtonStyle.Danger;
        emoji = '⭕';
      }

      const btn = new ButtonBuilder()
        .setCustomId(`xox_${gameId}_${r}_${c}`)
        .setStyle(style)
        .setEmoji(emoji)
        .setDisabled(game.winner !== null || game.draw || cell !== ' ');

      row.addComponents(btn);
    }
    rows.push(row);
  }

  // Row for forfeit
  const forfeitRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`xox_${gameId}_forfeit`)
      .setLabel('Pes Et')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(game.winner !== null || game.draw)
  );
  rows.push(forfeitRow);

  return rows;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xox')
    .setDescription('Bir arkadaşına XOX (Tic-Tac-Toe) meydan oku!')
    .addUserOption(option =>
      option.setName('rakip')
        .setDescription('Kime meydan okumak istiyorsun?')
        .setRequired(true)),

  run: async (client, interaction) => {
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('rakip');

    if (opponent.id === client.user.id) {
      return interaction.reply({
        content: 'benimle XOX mi oynayacaksın bebeğim? ben bir yapay zekayım zekamı seninle yarıştırıp rezil etmek istemem seni, git bir insan bul...',
        ephemeral: true
      });
    }

    if (opponent.id === challenger.id) {
      return interaction.reply({
        content: 'kendi kendine XOX oynamak mı? yalnızlığın bu seviyesi beni bile üzdü ya...',
        ephemeral: true
      });
    }

    if (opponent.bot) {
      return interaction.reply({
        content: 'botlarla XOX oynayamazsın kanka şaka mısın...',
        ephemeral: true
      });
    }

    const gameId = interaction.id;
    const game = {
      id: gameId,
      player1: challenger, // X
      player2: opponent,   // O
      board: [
        [' ', ' ', ' '],
        [' ', ' ', ' '],
        [' ', ' ', ' ']
      ],
      turn: challenger.id,
      accepted: false,
      winner: null,
      draw: false
    };

    activeGames.set(gameId, game);

    const inviteEmbed = new EmbedBuilder()
      .setTitle('❌ XOX Meydan Okuması! ⭕')
      .setDescription(`**${challenger.username}**, **${opponent.username}** kullanıcısına XOX meydan okudu!`)
      .setColor('#7cffcb')
      .addFields(
        { name: 'Meydan Okuyan', value: challenger.toString(), inline: true },
        { name: 'Meydan Okunan', value: opponent.toString(), inline: true }
      )
      .setFooter({ text: 'Kabul etmek veya reddetmek için aşağıdaki butonları kullan bebeğim.' })
      .setTimestamp();

    const inviteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`xox_${gameId}_accept`)
        .setLabel('Kabul Et')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`xox_${gameId}_decline`)
        .setLabel('Reddet')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({
      embeds: [inviteEmbed],
      components: [inviteRow],
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 dakika
    });

    collector.on('collect', async i => {
      const parts = i.customId.split('_');
      if (parts[0] !== 'xox' || parts[1] !== gameId) return;

      const action = parts[2];
      const g = activeGames.get(gameId);
      if (!g) {
        return i.reply({ content: 'bu oyun artık geçerli değil bebeğim...', ephemeral: true });
      }

      // 1) Kabul Etme / Reddetme Aşaması
      if (!g.accepted) {
        if (i.user.id !== g.player2.id) {
          return i.reply({ content: 'bu meydan okuma sana gelmedi kanka, üzerine alınma.', ephemeral: true });
        }

        if (action === 'accept') {
          g.accepted = true;
          const gameEmbed = new EmbedBuilder()
            .setTitle('❌ XOX Başladı! ⭕')
            .setDescription(`Sıra sende: **${g.player1.username}** (❌)\nRakip: **${g.player2.username}** (⭕)`)
            .setColor('#7cffcb')
            .addFields(
              { name: 'Sıra Kimde?', value: g.player1.toString() }
            )
            .setFooter({ text: 'Hamle yapmak için aşağıdaki 3x3 butonu kullan bebeğim.' })
            .setTimestamp();

          const components = buildBoardComponents(gameId, g);
          await i.update({ embeds: [gameEmbed], components });
        } else if (action === 'decline') {
          activeGames.delete(gameId);
          collector.stop();
          await i.update({
            content: `**${g.player2.username}** bu meydan okumayı reddetti. Korktu herhalde fln...`,
            embeds: [],
            components: []
          });
        }
        return;
      }

      // 2) Oyun İçi Aksiyonlar
      if (g.winner !== null || g.draw) {
        return i.reply({ content: 'bu oyun çoktan bitti bebeğim!', ephemeral: true });
      }

      // Pes Etme
      if (action === 'forfeit') {
        if (i.user.id !== g.player1.id && i.user.id !== g.player2.id) {
          return i.reply({ content: 'oyunda bile değilsin ne pes etmesi kanka?', ephemeral: true });
        }

        const loser = i.user;
        const winner = loser.id === g.player1.id ? g.player2 : g.player1;
        g.winner = winner.id === g.player1.id ? 'X' : 'O';

        const forfeitEmbed = new EmbedBuilder()
          .setTitle('❌ Oyun Pes Etmeyle Bitti! ⭕')
          .setDescription(`**${loser.username}** korkup pes etti! Kazanan: **${winner.username}** 🎉`)
          .setColor('#fb7185')
          .addFields(
            { name: 'Kazanan', value: winner.toString() },
            { name: 'Sude\'nin Yorumu', value: `*"pes etmek mi? ezikliğin bu kadarı kanka şaka mısın cidden..."*` }
          )
          .setTimestamp();

        activeGames.delete(gameId);
        collector.stop();
        return i.update({ embeds: [forfeitEmbed], components: [] });
      }

      // Hamle Yapma
      if (i.user.id !== g.turn) {
        return i.reply({ content: 'sıra sende değil bebeğim, sabırsızlanma o kadar...', ephemeral: true });
      }

      const row = parseInt(parts[2]);
      const col = parseInt(parts[3]);

      if (g.board[row][col] !== ' ') {
        return i.reply({ content: 'burası zaten dolu kanka!', ephemeral: true });
      }

      const marker = g.turn === g.player1.id ? 'X' : 'O';
      g.board[row][col] = marker;

      const result = checkWinner(g.board);
      if (result === 'X' || result === 'O') {
        g.winner = result;
        const winnerUser = result === 'X' ? g.player1 : g.player2;
        const loserUser = result === 'X' ? g.player2 : g.player1;
        
        const winEmbed = new EmbedBuilder()
          .setTitle('🏆 XOX Kazananı Belli Oldu! 🏆')
          .setDescription(`**${winnerUser.username}** ( ${result === 'X' ? '❌' : '⭕'} ) oyunu kazandı! 🎉`)
          .setColor('#7cffcb')
          .addFields(
            { name: 'Şampiyon', value: winnerUser.toString() },
            { name: 'Sude\'nin Tebriği', value: `*"tebrikler bebeğim, karşı tarafı rezil ettin resmen bayıldım bu zekaya..."*` }
          )
          .setTimestamp();

        activeGames.delete(gameId);
        collector.stop();
        return i.update({ embeds: [winEmbed], components: [] });
      } else if (result === 'draw') {
        g.draw = true;
        const drawEmbed = new EmbedBuilder()
          .setTitle('🤝 Berabere! 🤝')
          .setDescription('XOX tahtasında hamle kalmadı, berabere bitti.')
          .setColor('#71717a')
          .addFields(
            { name: 'Durum', value: 'Beraberlik' },
            { name: 'Sude\'nin Yorumu', value: `*"ikiniz de berabere kaldınız şaka mısınız cidden sıfır zeka..."*` }
          )
          .setTimestamp();

        activeGames.delete(gameId);
        collector.stop();
        return i.update({ embeds: [drawEmbed], components: [] });
      }

      // Sıra Değiştir
      g.turn = g.turn === g.player1.id ? g.player2.id : g.player1.id;
      const nextPlayer = g.turn === g.player1.id ? g.player1 : g.player2;
      const nextMarker = g.turn === g.player1.id ? '❌' : '⭕';

      const updateEmbed = new EmbedBuilder()
        .setTitle('❌ XOX Devam Ediyor! ⭕')
        .setDescription(`Sıra sende: **${nextPlayer.username}** (${nextMarker})\nRakip: **${(nextPlayer.id === g.player1.id ? g.player2 : g.player1).username}** (${nextMarker === '❌' ? '⭕' : '❌'})`)
        .setColor('#7cffcb')
        .addFields(
          { name: 'Sıra Kimde?', value: nextPlayer.toString() }
        )
        .setFooter({ text: 'Hamle yapmak için aşağıdaki 3x3 butonu kullan bebeğim.' })
        .setTimestamp();

      const nextComponents = buildBoardComponents(gameId, g);
      await i.update({ embeds: [updateEmbed], components: nextComponents });
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && activeGames.has(gameId)) {
        activeGames.delete(gameId);
        await interaction.editReply({
          content: 'xox meydan okuması zaman aşımına uğradı bebeğim, çok yavaşsınız...',
          embeds: [],
          components: []
        }).catch(() => null);
      }
    });
  }
};
