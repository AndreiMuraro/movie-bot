import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';


const { BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!BOT_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ BOT_TOKEN, CLIENT_ID ou GUILD_ID não definidos no .env');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('addmovie')
    .setDescription('Adiciona um filme à sua lista')
    .addStringOption(o => o.setName('titulo').setDescription('Nome do filme').setRequired(true)),

  new SlashCommandBuilder()
    .setName('listmovies')
    .setDescription('Mostra sua lista de filmes'),

  new SlashCommandBuilder()
    .setName('removemovie')
    .setDescription('Remove um filme pelo índice')
    .addIntegerOption(o => o.setName('indice').setDescription('Posição na lista').setRequired(true)),

  new SlashCommandBuilder()
    .setName('watchedmovie')
    .setDescription('Marca um filme como assistido')
    .addIntegerOption(o => o.setName('indice').setDescription('Posição na lista').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unwatchedmovie')
    .setDescription('Marca um filme como não assistido')
    .addIntegerOption(o => o.setName('indice').setDescription('Posição na lista').setRequired(true)),

  new SlashCommandBuilder()
    .setName('meeting')
    .setDescription('Cria um encontro para assistir um filme')
    .addStringOption(o => o.setName('filme').setDescription('Nome do filme').setRequired(true))
    .addStringOption(o => o.setName('data').setDescription('Data do encontro (DD/MM/YYYY)').setRequired(true))
    .addStringOption(o => o.setName('horario').setDescription('Horário do encontro (HH:MM)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('listmeetings')
    .setDescription('Mostra sua lista de encontros'),

  new SlashCommandBuilder()
    .setName('removemeeting')
    .setDescription('Remove um encontro pelo índice')
    .addIntegerOption(o => o.setName('indice').setDescription('Posição na lista').setRequired(true)),

  new SlashCommandBuilder()
    .setName('randommovie')
    .setDescription('Mostra um filme aleatório da lista'),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    console.log('Iniciando registro de comandos...');

    // Registra os comandos no servidor específico (atualização instantânea)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('✅ Comandos registrados com sucesso no servidor.');

    // Registra os comandos globalmente (leva até 1 hora)
    // await rest.put(
    //   Routes.applicationCommands(CLIENT_ID),
    //   { body: commands },
    // );
    // console.log('✅ Comandos registrados globalmente (pode levar até 1 hora para atualizar).');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();
