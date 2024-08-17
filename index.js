require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, Events, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ] 
});

const TOKEN = process.env.BOT_TOKEN;
const client_id = process.env.client_id;
const dataFile = path.join(__dirname, 'channel_data.json');

const db = new sqlite3.Database('./suggestions.db', (err) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            channelId TEXT,
            messageId TEXT,
            status TEXT,
            reason TEXT
        )`);
    }
});

async function getChannelInfo(guildId, channelId) {
    if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile));
        const channelData = (data[guildId] || []).find(info => info.channelId === channelId);
        return channelData;
    }
    return null;
}

const commands = [
    new SlashCommandBuilder()
        .setName('setup-suggestions')
        .setDescription('Setup the suggestions channel')
        .addChannelOption(option => 
            option.setName('channel')
                  .setDescription('Select a channel')
                  .setRequired(true))
        .addStringOption(option => 
            option.setName('emoji1')
                  .setDescription('First emoji for reactions')
                  .setRequired(true))
        .addStringOption(option => 
            option.setName('emoji2')
                  .setDescription('Second emoji for reactions')
                  .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                  .setDescription('Select a role that can use the buttons')
                  .setRequired(true))
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    try {
        console.log(`Logged in as ${client.user.tag}`);

        await rest.put(
            Routes.applicationCommands(client_id),
            { body: commands },
        );

        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, member } = interaction;
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        if (commandName === 'setup-suggestions') {
            const channel = options.getChannel('channel');
            const emoji1 = options.getString('emoji1');
            const emoji2 = options.getString('emoji2');
            const role = options.getRole('role');

            let data = {};
            if (fs.existsSync(dataFile)) {
                const fileContent = fs.readFileSync(dataFile);
                data = JSON.parse(fileContent);
            }

            if (!data[interaction.guild.id]) {
                data[interaction.guild.id] = [];
            }

            const existingChannel = data[interaction.guild.id].find(info => info.channelId === channel.id);
            if (existingChannel) {
                await interaction.reply({ content: `Channel ${channel} is already saved.`, ephemeral: true });
                return;
            }

            const channelInfo = {
                channelId: channel.id,
                channelName: channel.name,
                emoji1: emoji1,
                emoji2: emoji2,
                roleId: role.id
            };

            data[interaction.guild.id].push(channelInfo);

            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

            await interaction.reply({ content:`Saved channel ${channel} in server ${interaction.guild.name} with emojis ${emoji1} and ${emoji2}, and role ${role}`, ephemeral: true});
        }
    } else if (interaction.isButton()) {
        const { customId, member } = interaction;
        const channelInfo = await getChannelInfo(interaction.message.guild.id, interaction.message.channel.id);

        if (channelInfo) {
            const hasRole = member.roles.cache.has(channelInfo.roleId);

            if (!hasRole) {
                await interaction.reply({ content: 'You do not have permission to use this button', ephemeral: true });
                return;
            }
        }

        if (customId === 'accept' || customId === 'reject') {
            const modal = new ModalBuilder()
                .setCustomId(`${customId}_modal`)
                .setTitle(customId === 'accept' ? 'سبب القبول' : 'سبب الرفض');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason_input')
                .setLabel('اكتب السبب هنا')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

            await interaction.showModal(modal);
        }
    } else if (interaction.type === InteractionType.ModalSubmit) {
        const { customId } = interaction;
        const reason = interaction.fields.getTextInputValue('reason_input');
        
        if (customId === 'accept_modal' || customId === 'reject_modal') {
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);

            embed.spliceFields(0, 1, { name: `${customId === 'accept_modal' ? 'تم القبول' : 'تم الرفض'}`, value: `${reason}`, inline: true });

            if (customId === 'accept_modal') {
                embed.setColor('#1cde12');
            } else if (customId === 'reject_modal') {
                embed.setColor('#de1212'); 
            }

            // إرسال التحديثات إلى القناة
            await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('closed')
                    .setLabel('✨')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            )] });

            db.get('SELECT * FROM suggestions WHERE messageId = ?', [interaction.message.id], async (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }
                if (row) {
                    const user = await client.users.fetch(row.userId);
                    if (user) {
                        await user.send(`اقتراحك في القناة <#${row.channelId}> تم ${customId === 'accept_modal' ? 'قبوله' : 'رفضه'}`);
                    }
                }
            });

            db.run('UPDATE suggestions SET status = ?, reason = ? WHERE messageId = ?', [customId === 'accept_modal' ? 'قبول' : 'رفض', reason, interaction.message.id], (err) => {
                if (err) {
                    console.error(err);
                }
            });

            await interaction.followUp({ 
                content: `تم ${customId === 'accept_modal' ? 'قبول' : 'رفض'} الاقتراح بنجاح.`,
                ephemeral: true
            });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.channel.type !== 0) return; 

    const channelInfo = await getChannelInfo(message.guild.id, message.channel.id);
    if (channelInfo) {
        if (message.content) {
            const embed = new EmbedBuilder()
                .setTitle('اقتراح جديد :pencil:')
                .setDescription(`**الاقتراح :**\n\`\`\`${message.content}\`\`\``)
                .setThumbnail(message.author.displayAvatarURL()) 
                .setColor('#12cdde') 
                .addFields({ name: 'الحالة', value: 'قيد الانتظار :hourglass_flowing_sand:', inline: true })
                .setFooter({ text: `تم الارسال بواسطة : ${message.author.tag}` })
                .setTimestamp();
            const acceptButton = new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('قبول')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId('reject')
                .setLabel('رفض')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(acceptButton, rejectButton);

            const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

            await sentMessage.react(channelInfo.emoji1);
            await sentMessage.react(channelInfo.emoji2);

            db.run('INSERT INTO suggestions (userId, channelId, messageId, status, reason) VALUES (?, ?, ?, ?, ?)', [message.author.id, message.channel.id, sentMessage.id, 'قيد الانتظار', ''], (err) => {
                if (err) {
                    console.error(err);
                }
            });
            await message.delete();
        }
    }
});

client.login(TOKEN);
