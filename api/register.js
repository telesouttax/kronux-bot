const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APP_ID;
const REGISTER_SECRET = process.env.REGISTER_SECRET;

// integration_types: 0 = GUILD_INSTALL (comando instalado no servidor)
// contexts: 0 = GUILD (só pode ser usado dentro de um servidor, nunca em DM)
const GUILD_ONLY = { integration_types: [0], contexts: [0] };

const commands = [
  {
    name: 'setup-gamer',
    description: '🐉 Configura o servidor completo com tema gamer',
    ...GUILD_ONLY,
  },
  {
    name: 'perfil',
    description: '🎮 Veja seu card de jogador com XP, nível e cargo',
    ...GUILD_ONLY,
  },
  {
    name: 'ranking',
    description: '🏆 Veja o top 10 de XP do servidor',
    ...GUILD_ONLY,
  },
  {
    name: 'stats',
    description: '📊 Veja as estatísticas do servidor em tempo real',
    ...GUILD_ONLY,
  },
  {
    name: 'ajuda',
    description: '❓ Lista todos os comandos disponíveis do KRONUX',
    ...GUILD_ONLY,
  },
  {
    name: 'xp',
    description: '⭐ Ganhe XP enviando uma mensagem (teste)',
    ...GUILD_ONLY,
  },
  {
    name: 'definir-bio',
    description: '📝 Defina sua bio no perfil',
    options: [
      { name: 'texto', description: 'Sua bio (máximo 200 caracteres)', type: 3, required: true },
    ],
    ...GUILD_ONLY,
  },
  {
    name: 'definir-jogo',
    description: '🎮 Defina seu jogo favorito no perfil',
    options: [
      {
        name: 'jogo', description: 'Seu jogo favorito', type: 3, required: true,
        choices: [
          { name: '🎯 Valorant', value: 'Valorant' },
          { name: '💣 CS2', value: 'CS2' },
          { name: '🔥 Free Fire', value: 'Free Fire' },
          { name: '⚡ League of Legends', value: 'League of Legends' },
          { name: '🌀 Fortnite', value: 'Fortnite' },
          { name: '🎮 Outros', value: 'Outros' },
        ],
      },
    ],
    ...GUILD_ONLY,
  },
  {
    name: 'anunciar',
    description: '📢 [STAFF] Posta um anúncio formatado em um canal',
    options: [
      { name: 'titulo', description: 'Título do anúncio', type: 3, required: true },
      { name: 'mensagem', description: 'Conteúdo do anúncio', type: 3, required: true },
      { name: 'canal', description: 'Canal onde postar', type: 7, required: true },
      { name: 'mencionar', description: 'Mencionar @everyone?', type: 5, required: false },
    ],
    ...GUILD_ONLY,
  },
];

export default async function handler(req) {
  const secret = req.headers.get('x-register-secret');
  if (secret !== REGISTER_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const data = await res.json();
  return new Response(JSON.stringify({
    ok: true, message: `${data.length} comandos registrados!`,
    comandos: data.map(c => '/' + c.name),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
