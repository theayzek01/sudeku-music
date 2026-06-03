const config = require('../../config/config.json');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(client, interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                // Block DM (server-only commands if needed)
                if (!interaction.guild) {
                    return interaction.reply({
                        content: `${config.crossmark_emoji || '❌'} Bu komut yalnızca bir sunucu içinde kullanılabilir bebeğim.`,
                        ephemeral: true
                    });
                }

                const command = client.slash.get(interaction.commandName);
                if (!command) return;

                await command.run(client, interaction, interaction.options);
            }
        } catch (err) {
            console.error('[INTERACTION ERROR]', err);

            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                interaction.reply({
                    content: 'Bu etkileşim işlenirken beklenmedik bir hata oluştu kanka...',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },
};
