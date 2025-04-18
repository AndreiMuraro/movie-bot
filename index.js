import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import fs from 'fs';

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN não definido');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Carrega/Inicializa DB local
const DB_PATH = './movies.json';
const MEETINGS_PATH = './meetings.json';
let movies = {};
let meetings = {};

if (fs.existsSync(DB_PATH)) {
  movies = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

if (fs.existsSync(MEETINGS_PATH)) {
  meetings = JSON.parse(fs.readFileSync(MEETINGS_PATH, 'utf-8'));
}

// Armazena a última mensagem da lista por canal
const lastListMessages = new Map();
const meetingMessages = new Map();

// Função para verificar e notificar encontros
const checkMeetings = async () => {
  const now = new Date();
  const nowStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  for (const [guildId, guildMeetings] of Object.entries(meetings)) {
    for (const [messageId, meeting] of Object.entries(guildMeetings)) {
      const meetingTime = `${meeting.data} ${meeting.horario}`;
      if (meetingTime === nowStr) {
        const channel = await client.channels.fetch(meeting.channelId);
        if (channel) {
          const message = await channel.messages.fetch(messageId);
          if (message) {
            const thumbsUp = message.reactions.cache.get('👍');
            if (thumbsUp) {
              const users = await thumbsUp.users.fetch();
              const participants = users.filter(u => !u.bot).map(u => `<@${u.id}>`).join(', ');
              await channel.send(`🎬 É hora do filme **${meeting.filme}**! 🎬\nParticipantes: ${participants}`);
            }
            delete meetings[guildId][messageId];
            fs.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2));
          }
        }
      }
    }
  }
};

// Verifica encontros a cada minuto
setInterval(checkMeetings, 60000);

// Função para gerar o embed da lista
const generateListEmbed = (guildId) => {
  const serverList = (movies[guildId] ||= []);
  return new EmbedBuilder()
    .setTitle('🍿  Filmes  🍿')
    .setColor('#ffb400')
    .setDescription(serverList.length > 0
      ? serverList
        .map((movie, i) => `\`${String(i + 1).padStart(2, '0')}.\`  ${movie.watched ? '✅' : '🟥'}  ${movie.title} - <@${movie.userId}>`)
        .join('\n')
      : '📂 A lista está vazia.')
    .setFooter({ text: 'Uma bela caceta e um bom filme é o que nois gosta IOF & CIA' });
};

// Função para atualizar a última lista
const updateLastList = async (channelId, guildId) => {
  const lastMessage = lastListMessages.get(channelId);
  if (lastMessage) {
    try {
      await lastMessage.edit({ embeds: [generateListEmbed(guildId)] });
    } catch (error) {
      console.error('Erro ao atualizar lista:', error);
    }
  }
};

// Ao conectar
client.once('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// Lida com slash-commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const guildId = interaction.guildId;
  const serverList = (movies[guildId] ||= []);

  // Se for um botão
  if (interaction.isButton()) {
    if (interaction.customId === 'view_list') {
      // Simplificando para usar reply direto
      const message = await interaction.reply({
        embeds: [generateListEmbed(guildId)],
        fetchReply: true
      });
      lastListMessages.set(interaction.channelId, message);
      return;
    }
    return;
  }

  const { commandName, user, options } = interaction;
  const viewButton = new ButtonBuilder()
    .setCustomId('view_list')
    .setLabel('👁️ Lista')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder()
    .addComponents(viewButton);

  switch (commandName) {
    case 'addmovie': {
      const title = options.getString('titulo');
      serverList.push({ watched: false, title, userId: user.id });
      fs.writeFileSync(DB_PATH, JSON.stringify(movies, null, 2));

      await updateLastList(interaction.channelId, guildId);

      await interaction.reply({
        content: `✅ Adicionado **${title}** à lista do servidor.`,
        components: [row],
        ephemeral: true
      });

      return;
    }
    case 'listmovies': {
      // Simplificando para usar reply direto
      const message = await interaction.reply({
        embeds: [generateListEmbed(guildId)],
        fetchReply: true
      });
      lastListMessages.set(interaction.channelId, message);
      return;
    }
    case 'removemovie': {
      const idx = options.getInteger('indice') - 1;
      if (idx < 0 || idx >= serverList.length)
        return interaction.reply('❌ Índice inválido.');

      const [removed] = serverList.splice(idx, 1);
      fs.writeFileSync(DB_PATH, JSON.stringify(movies, null, 2));

      await updateLastList(interaction.channelId, guildId);

      const reply = await interaction.reply({
        content: `🗑️ Removido **${removed.title}** da lista do servidor.`,
        components: [row]
      });

      setTimeout(() => {
        reply.delete().catch(console.error);
      }, 15000);

      return;
    }
    case 'watchedmovie': {
      const idx = options.getInteger('indice') - 1;
      if (idx < 0 || idx >= serverList.length)
        return interaction.reply('❌ Índice inválido.');

      serverList[idx].watched = true;
      fs.writeFileSync(DB_PATH, JSON.stringify(movies, null, 2));

      await updateLastList(interaction.channelId, guildId);

      const reply = await interaction.reply({
        content: `✅ Marcado como assistido **${serverList[idx].title}**.`,
        components: [row]
      });

      setTimeout(() => {
        reply.delete().catch(console.error);
      }, 15000);

      return;
    }
    case 'meeting': {
      const filme = options.getString('filme');
      const data = options.getString('data');
      const horario = options.getString('horario');

      try {
        // Primeiro responde à interação
        await interaction.deferReply({ ephemeral: true });

        // Envia a mensagem do encontro
        const message = await interaction.channel.send({
          content: `🎬 Sessão **${filme}** às **${horario}** do dia **${data}**\nQuem vamos?`
        });

        // Adiciona as reações
        await message.react('👍');
        await message.react('👎');

        // Salva o encontro
        if (!meetings[guildId]) meetings[guildId] = {};
        meetings[guildId][message.id] = {
          filme,
          data,
          horario,
          channelId: interaction.channelId
        };
        fs.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2));

        // Confirma que deu tudo certo
        await interaction.editReply({ content: '✅ Encontro criado!' });
      } catch (error) {
        console.error('Erro ao criar encontro:', error);
        await interaction.editReply({ content: '❌ Erro ao criar encontro. Tente novamente.' });
      }
      return;
    }
  }
});

// Conecta no Discord
client.login(BOT_TOKEN);
