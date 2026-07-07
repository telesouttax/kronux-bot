const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DISCORD_API = 'https://discord.com/api/v10';

// ── Verificação ───────────────────────────────────────────────────────────────
async function verifyRequest(rawBody, signature, timestamp) {
  const encoder = new TextEncoder();
  const keyBytes = hexToUint8Array(PUBLIC_KEY);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify']);
  const message = encoder.encode(timestamp + rawBody);
  return crypto.subtle.verify('Ed25519', cryptoKey, hexToUint8Array(signature), message);
}
function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

// ── Discord API ───────────────────────────────────────────────────────────────
async function discordRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    method,
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`Discord ${res.status} em ${method} ${endpoint}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function respond(data) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

// ── Supabase API ──────────────────────────────────────────────────────────────
async function sbGet(table, filter = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function sbUpsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function sbUpdate(table, filter, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function sbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

// ── Sistema de XP ─────────────────────────────────────────────────────────────
const NIVEIS = [
  { nivel: 1,  xp: 0,    cargo: '🆕 SPAWNLING' },
  { nivel: 2,  xp: 100,  cargo: '🆕 SPAWNLING' },
  { nivel: 3,  xp: 250,  cargo: '🆕 SPAWNLING' },
  { nivel: 4,  xp: 500,  cargo: '🆕 SPAWNLING' },
  { nivel: 5,  xp: 800,  cargo: '🆕 SPAWNLING' },
  { nivel: 6,  xp: 1200, cargo: '⚔️ IRONBORN' },
  { nivel: 10, xp: 2500, cargo: '⚔️ IRONBORN' },
  { nivel: 15, xp: 5000, cargo: '⚔️ IRONBORN' },
  { nivel: 16, xp: 6000, cargo: '💎 VAULTIS' },
  { nivel: 25, xp: 12000,cargo: '💎 VAULTIS' },
  { nivel: 26, xp: 14000,cargo: '🔥 BLAZECOR' },
  { nivel: 40, xp: 25000,cargo: '🔥 BLAZECOR' },
  { nivel: 41, xp: 28000,cargo: '🐉 DRAKVEIL' },
  { nivel: 60, xp: 50000,cargo: '🐉 DRAKVEIL' },
  { nivel: 61, xp: 55000,cargo: '👑 KRONLORD' },
];

function calcNivel(xp) {
  let nivel = 1;
  let cargo = '🆕 SPAWNLING';
  for (const n of NIVEIS) {
    if (xp >= n.xp) { nivel = n.nivel; cargo = n.cargo; }
  }
  return { nivel, cargo };
}

function xpProximoNivel(xp) {
  for (let i = 0; i < NIVEIS.length - 1; i++) {
    if (xp < NIVEIS[i + 1].xp) return NIVEIS[i + 1].xp - xp;
  }
  return 0;
}

async function getOuCriarUsuario(userId, username, avatar) {
  const rows = await sbGet('usuarios', `?user_id=eq.${userId}`);
  if (rows && rows.length > 0) return rows[0];
  const novo = { user_id: userId, username, avatar, xp: 0, nivel: 1, mensagens: 0, horas_voz: 0, cargo: '🆕 SPAWNLING' };
  await sbUpsert('usuarios', novo);
  return novo;
}

async function adicionarXP(userId, username, avatar, quantidade) {
  const usuario = await getOuCriarUsuario(userId, username, avatar);
  const novoXP = (usuario.xp || 0) + quantidade;
  const { nivel, cargo } = calcNivel(novoXP);
  await sbUpdate('usuarios', `?user_id=eq.${userId}`, {
    xp: novoXP, nivel, cargo, username, avatar,
    mensagens: (usuario.mensagens || 0) + (quantidade === 10 ? 1 : 0),
    atualizado_em: new Date().toISOString(),
  });
  return { xpAnterior: usuario.xp, novoXP, nivelAnterior: usuario.nivel, novoNivel: nivel, cargo };
}

// ── Permissões ────────────────────────────────────────────────────────────────
const CARGOS_STAFF = ['👑 KRONLORD', '🐉 DRAKVEIL', '⚡ VORTEXUS', '🛡️ SHIELDRIX'];

function isStaff(member) {
  if (!member?.roles) return false;
  return member.roles.some(r => CARGOS_STAFF.some(c => r.includes && r.includes(c)));
}

// ── Comandos ──────────────────────────────────────────────────────────────────
async function handlePerfil(interaction) {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const username = interaction.member?.user?.username || interaction.user?.username;
  const avatarHash = interaction.member?.user?.avatar || interaction.user?.avatar;
  const avatar = avatarHash
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;

  const usuario = await getOuCriarUsuario(userId, username, avatar);
  const xpFalta = xpProximoNivel(usuario.xp || 0);
  const { nivel, cargo } = calcNivel(usuario.xp || 0);

  // Barra de progresso
  const pct = xpFalta > 0 ? Math.round(((usuario.xp % 1000) / 1000) * 10) : 10;
  const barra = '█'.repeat(pct) + '░'.repeat(10 - pct);

  return {
    type: 4,
    data: {
      embeds: [{
        title: `🎮 Perfil de ${username}`,
        thumbnail: { url: avatar },
        color: 0xffd700,
        fields: [
          { name: '🏅 Cargo', value: cargo, inline: true },
          { name: '📊 Nível', value: `**${nivel}**`, inline: true },
          { name: '⭐ XP Total', value: `**${usuario.xp || 0}** XP`, inline: true },
          { name: '📈 Progresso', value: `[${barra}] \n**${xpFalta}** XP para o próximo nível`, inline: false },
          { name: '💬 Mensagens', value: `**${usuario.mensagens || 0}**`, inline: true },
          { name: '🔊 Horas em Call', value: `**${(usuario.horas_voz || 0).toFixed(1)}h**`, inline: true },
          { name: '🎮 Jogo Favorito', value: usuario.jogo_favorito || 'Não definido', inline: true },
          { name: '📝 Bio', value: usuario.bio || '*Sem bio — use /definir-bio para adicionar!*', inline: false },
        ],
        footer: { text: `🐉 KRONUX • ID: ${userId}` },
        timestamp: new Date().toISOString(),
      }],
      flags: 64,
    },
  };
}

async function handleStats(guildId) {
  const guild = await discordRequest(`/guilds/${guildId}?with_counts=true`);
  const channels = await discordRequest(`/guilds/${guildId}/channels`);
  const roles = await discordRequest(`/guilds/${guildId}/roles`);

  const texto = channels.filter(c => c.type === 0).length;
  const voz = channels.filter(c => c.type === 2).length;
  const cats = channels.filter(c => c.type === 4).length;
  const cargos = roles.filter(r => r.name !== '@everyone').length;

  // Top 5 XP
  const top = await sbGet('usuarios', '?order=xp.desc&limit=5');
  const topStr = top?.map((u, i) => {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    return `${medals[i]} **${u.username}** — ${u.xp} XP (Nível ${u.nivel})`;
  }).join('\n') || 'Nenhum dado ainda';

  return {
    type: 4,
    data: {
      embeds: [{
        title: '📊 Estatísticas do KRONUX',
        color: 0x00d4ff,
        fields: [
          { name: '👥 Membros', value: `**${guild.approximate_member_count || '?'}**`, inline: true },
          { name: '🟢 Online', value: `**${guild.approximate_presence_count || '?'}**`, inline: true },
          { name: '🎭 Cargos', value: `**${cargos}**`, inline: true },
          { name: '💬 Canais de Texto', value: `**${texto}**`, inline: true },
          { name: '🔊 Canais de Voz', value: `**${voz}**`, inline: true },
          { name: '📁 Categorias', value: `**${cats}**`, inline: true },
          { name: '🏆 Top 5 XP', value: topStr, inline: false },
        ],
        footer: { text: '🐉 KRONUX Stats' },
        timestamp: new Date().toISOString(),
      }],
      flags: 64,
    },
  };
}

async function handleAnunciar(interaction, options) {
  if (!isStaff(interaction.member)) {
    return { type: 4, data: { content: '❌ Apenas staff pode usar este comando!', flags: 64 } };
  }

  const titulo = options.find(o => o.name === 'titulo')?.value;
  const mensagem = options.find(o => o.name === 'mensagem')?.value;
  const canal = options.find(o => o.name === 'canal')?.value;
  const mencionar = options.find(o => o.name === 'mencionar')?.value || false;

  const staffUser = interaction.member?.user;

  await discordRequest(`/channels/${canal}/messages`, 'POST', {
    content: mencionar ? '@everyone' : null,
    embeds: [{
      title: `📢 ${titulo}`,
      description: mensagem,
      color: 0xff6600,
      footer: { text: `📣 Anúncio por ${staffUser?.username} • KRONUX Staff` },
      timestamp: new Date().toISOString(),
    }],
  });

  return { type: 4, data: { content: `✅ Anúncio postado com sucesso em <#${canal}>!`, flags: 64 } };
}

async function handleDefinirBio(interaction, options) {
  const userId = interaction.member?.user?.id;
  const bio = options.find(o => o.name === 'texto')?.value;
  await sbUpdate('usuarios', `?user_id=eq.${userId}`, { bio });
  return { type: 4, data: { content: `✅ Bio atualizada: *${bio}*`, flags: 64 } };
}

async function handleDefinirJogo(interaction, options) {
  const userId = interaction.member?.user?.id;
  const jogo = options.find(o => o.name === 'jogo')?.value;
  await sbUpdate('usuarios', `?user_id=eq.${userId}`, { jogo_favorito: jogo });
  return { type: 4, data: { content: `✅ Jogo favorito definido: **${jogo}**`, flags: 64 } };
}

async function handleRanking() {
  const top = await sbGet('usuarios', '?order=xp.desc&limit=10');
  if (!top || top.length === 0) {
    return { type: 4, data: { content: '❌ Nenhum dado de XP ainda!', flags: 64 } };
  }
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  const lista = top.map((u, i) => `${medals[i]} **${u.username}** — ${u.xp} XP · Nível **${u.nivel}** · ${u.cargo}`).join('\n');
  return {
    type: 4,
    data: {
      embeds: [{
        title: '🏆 Ranking de XP — KRONUX',
        description: lista,
        color: 0xffd700,
        footer: { text: '🐉 KRONUX XP System' },
        timestamp: new Date().toISOString(),
      }],
      flags: 64,
    },
  };
}

function handleAjuda() {
  return {
    type: 4,
    data: {
      embeds: [{
        title: '🐉 KRONUX — Central de Comandos',
        color: 0xffd700,
        fields: [
          {
            name: '👤 Perfil & XP',
            value: '`/perfil` — Veja seu card de jogador\n`/ranking` — Top 10 de XP do servidor\n`/definir-bio` — Defina sua bio\n`/definir-jogo` — Defina seu jogo favorito',
            inline: false,
          },
          {
            name: '📊 Servidor',
            value: '`/stats` — Estatísticas do servidor em tempo real',
            inline: false,
          },
          {
            name: '📢 Staff Only',
            value: '`/anunciar` — Posta anúncio formatado em qualquer canal\n`/setup-gamer` — Configura o servidor completo',
            inline: false,
          },
          {
            name: '🎮 Como ganhar XP',
            value: '💬 Enviar mensagens → **+10 XP**\n🔊 Ficar em call → **+5 XP por hora**\n🏆 Participar de eventos → **+XP bônus**',
            inline: false,
          },
          {
            name: '🏅 Níveis e Cargos',
            value: '🆕 SPAWNLING → Nível 1\n⚔️ IRONBORN → Nível 6\n💎 VAULTIS → Nível 16\n🔥 BLAZECOR → Nível 26\n🐉 DRAKVEIL → Nível 41\n👑 KRONLORD → Nível 61',
            inline: false,
          },
        ],
        footer: { text: '🐉 KRONUX Bot • Use os comandos acima!' },
        timestamp: new Date().toISOString(),
      }],
      flags: 64,
    },
  };
}

async function handleXP(interaction, options) {
  const userId = interaction.member?.user?.id;
  const username = interaction.member?.user?.username;
  const avatarHash = interaction.member?.user?.avatar;
  const avatar = avatarHash
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;
  const resultado = await adicionarXP(userId, username, avatar, 10);
  const subiu = resultado.novoNivel > resultado.nivelAnterior;
  let msg = `⭐ +10 XP! Total: **${resultado.novoXP} XP**`;
  if (subiu) msg += `\n🎉 **LEVEL UP!** Você chegou ao nível **${resultado.novoNivel}** — ${resultado.cargo}!`;
  return { type: 4, data: { content: msg, flags: 64 } };
}

// ── Setup Gamer ───────────────────────────────────────────────────────────────
const P = {
  ADMIN:0x8n, MANAGE_GUILD:0x20n, MANAGE_CHANNELS:0x10n, MANAGE_ROLES:0x10000000n,
  MANAGE_MESSAGES:0x2000n, KICK:0x2n, BAN:0x4n, MODERATE:0x400000000n,
  MOVE_MEMBERS:0x1000000n, MUTE_MEMBERS:0x400000n, DEAFEN_MEMBERS:0x800000n,
  VIEW_AUDIT:0x80n, SEND:0x800n, READ_HISTORY:0x10000n, VIEW:0x400n,
  CONNECT:0x100000n, SPEAK:0x200000n, STREAM:0x200n, USE_CMDS:0x80000000n,
  ADD_REACTIONS:0x40n, ATTACH:0x8000n, EMBED:0x4000n, PRIORITY:0x100n,
};
function perms(...flags) { return flags.reduce((a,f)=>a|f,0n).toString(); }

const DENY_ALL = (0x800n|0x10000n|0x400n|0x100000n|0x200000n|0x40n|0x8000n|0x4000n).toString();
const ALLOW_MEMBER = (0x800n|0x10000n|0x400n|0x100000n|0x200000n|0x40n|0x80000000n).toString();
const ALLOW_READONLY = (0x10000n|0x400n).toString();
const DENY_SEND = (0x800n).toString();

const TEXTOS = {
  regras:`╔══════════════════════════════════════╗\n       📜  R E G R A S  —  K R O N U X\n╚══════════════════════════════════════╝\n\n**1️⃣ RESPEITO ACIMA DE TUDO** — Sem xingamentos, bullying ou discriminação. Ban permanente.\n**2️⃣ SEM SPAM** — Não envie mensagens repetidas ou flood.\n**3️⃣ SEM DIVULGAÇÃO** — Proibido divulgar servidores sem autorização.\n**4️⃣ TOLERÂNCIA ZERO COM CHEATS** — Discussão sobre hacks = ban imediato.\n**5️⃣ USE O CANAL CORRETO** — Cada canal tem seu propósito.\n**6️⃣ SEM CONTEÚDO NSFW** — Proibido em todos os canais.\n**7️⃣ RESPEITE A STAFF** — Decisões da staff são finais.\n**8️⃣ NICK E AVATAR ADEQUADOS** — Nicks ofensivos serão alterados.\n**9️⃣ SEM MENÇÕES DESNECESSÁRIAS** — Não mencione @everyone sem motivo.\n**🔟 MARKETPLACE COM RESPONSABILIDADE** — Negocie com cautela.\n\n> ⚠️ Punições: Advertência → Mute → Kick → Ban\n> 🐉 KRONUX Staff Team`,
  boasVindas:`╔══════════════════════════════════════╗\n    👋  B E M - V I N D O  A O  K R O N U X  🐉⚡\n╚══════════════════════════════════════╝\n\n**O servidor gamer mais épico do Brasil!**\n\n🎮 Valorant • CS2 • Free Fire • LoL • Fortnite\n📊 Sistema de XP e níveis\n🏆 Torneios e eventos\n🎬 Canal de clipes e highlights\n🛒 Marketplace de itens\n🎉 Sorteios e giveaways\n\n**PRIMEIROS PASSOS:**\n1️⃣ Leia as 📜 regras\n2️⃣ Pegue seus 🎭 cargos\n3️⃣ Se apresente em 👥 apresentacoes\n4️⃣ Use /perfil para ver seu card\n5️⃣ Bora jogar! 🎮\n\n**GG e bem-vindo à família KRONUX!** 🐉⚡`,
  faq:`╔══════════════════════════════════════╗\n        ❓  F A Q  —  K R O N U X\n╚══════════════════════════════════════╝\n\n❔ **Como pego cargo de jogo?** → Canal 🎭 cargos\n❔ **Como funciona o XP?** → Mensagens +10XP, voz +5XP/hora\n❔ **Como entro em torneios?** → Canal 📢 anuncios\n❔ **Como funciona o marketplace?** → Canal 🛒 marketplace\n❔ **Como me torno staff?** → Fique de olho nos anúncios\n❔ **Como vejo meu perfil?** → Use /perfil\n❔ **Como vejo o ranking?** → Use /ranking\n❔ **Todos os comandos?** → Use /ajuda\n\n> 🐉 KRONUX Staff Team`,
  marketplace:`╔══════════════════════════════════════╗\n      🛒  M A R K E T P L A C E\n╚══════════════════════════════════════╝\n\n**MODELO OBRIGATÓRIO:**\n\`\`\`\n🎮 JOGO: [nome]\n📦 TIPO: [conta/skin/item]\n💰 PREÇO: [valor ou troca]\n📊 DETALHES: [descrição]\n📸 PRINTS: [anexe imagens]\n📞 CONTATO: [como contatar]\n\`\`\`\n\n⚠️ O servidor NÃO se responsabiliza por negociações.\n🐉 Golpistas serão banidos permanentemente.`,
  ranking:`╔══════════════════════════════════════╗\n       📊  R A N K I N G  X P\n╚══════════════════════════════════════╝\n\n**Use /ranking para ver o top 10!**\n**Use /perfil para ver seu card pessoal!**\n\n🏅 SISTEMA DE NÍVEIS:\n🆕 SPAWNLING → Nível 1\n⚔️ IRONBORN → Nível 6\n💎 VAULTIS → Nível 16\n🔥 BLAZECOR → Nível 26\n🐉 DRAKVEIL → Nível 41\n👑 KRONLORD → Nível 61`,
};

async function handleSetupGamer(guildId) {
  const guild = await discordRequest(`/guilds/${guildId}`);
  const everyoneId = guild.id;
  const overrideReadonly = [{id:everyoneId,type:0,allow:ALLOW_READONLY,deny:DENY_SEND}];
  const overrideMember = [{id:everyoneId,type:0,allow:ALLOW_MEMBER,deny:'0'}];
  const overrideBlocked = [{id:everyoneId,type:0,allow:'0',deny:DENY_ALL}];

  const cargos = [
    {name:'👑 KRONLORD',color:0xffd700,hoist:true,mentionable:true,permissions:perms(P.ADMIN)},
    {name:'🐉 DRAKVEIL',color:0xff0000,hoist:true,mentionable:true,permissions:perms(P.MANAGE_GUILD,P.MANAGE_CHANNELS,P.MANAGE_ROLES,P.BAN,P.KICK,P.MANAGE_MESSAGES,P.MODERATE,P.VIEW_AUDIT,P.MOVE_MEMBERS,P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.STREAM,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.READ_HISTORY)},
    {name:'⚡ VORTEXUS',color:0xff6600,hoist:true,mentionable:true,permissions:perms(P.MANAGE_CHANNELS,P.MANAGE_ROLES,P.BAN,P.KICK,P.MANAGE_MESSAGES,P.MODERATE,P.VIEW_AUDIT,P.MOVE_MEMBERS,P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.READ_HISTORY)},
    {name:'🛡️ SHIELDRIX',color:0xffaa00,hoist:true,mentionable:true,permissions:perms(P.MANAGE_MESSAGES,P.MODERATE,P.KICK,P.MOVE_MEMBERS,P.MUTE_MEMBERS,P.DEAFEN_MEMBERS,P.VIEW_AUDIT,P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.READ_HISTORY)},
    {name:'🔮 MYSTARA',color:0x9b59b6,hoist:true,mentionable:true,permissions:perms(P.MOVE_MEMBERS,P.MANAGE_MESSAGES,P.VIEW_AUDIT,P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.READ_HISTORY)},
    {name:'🔥 BLAZECOR',color:0xff4655,hoist:true,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.PRIORITY,P.READ_HISTORY)},
    {name:'🎥 STREAMVEX',color:0x6441a5,hoist:true,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.STREAM,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.READ_HISTORY)},
    {name:'💎 VAULTIS',color:0x00d4ff,hoist:true,mentionable:false,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.READ_HISTORY)},
    {name:'⚔️ IRONBORN',color:0x2ecc71,hoist:true,mentionable:false,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.ATTACH,P.EMBED,P.READ_HISTORY)},
    {name:'🆕 SPAWNLING',color:0x95a5a6,hoist:false,mentionable:false,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK,P.USE_CMDS,P.ADD_REACTIONS,P.READ_HISTORY)},
    {name:'🎯 Valorant',color:0xff4655,hoist:false,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK)},
    {name:'💣 CS2',color:0xf0a500,hoist:false,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK)},
    {name:'🔥 Free Fire',color:0xff6b35,hoist:false,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK)},
    {name:'⚡ LoL',color:0x00d4ff,hoist:false,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK)},
    {name:'🌀 Fortnite',color:0x9b59b6,hoist:false,mentionable:true,permissions:perms(P.SEND,P.VIEW,P.CONNECT,P.SPEAK)},
  ];

  const estrutura = [
    {categoria:'🐉 ── KRONUX ──',canais:[
      {name:'📜・regras',type:0,texto:TEXTOS.regras,override:overrideReadonly},
      {name:'👋・boas-vindas',type:0,texto:TEXTOS.boasVindas,override:overrideReadonly},
      {name:'📢・anuncios',type:0,override:overrideReadonly},
      {name:'❓・faq',type:0,texto:TEXTOS.faq,override:overrideReadonly},
      {name:'🎭・cargos',type:0,override:overrideReadonly},
      {name:'💡・sugestoes',type:0,override:overrideMember},
      {name:'🤖・comandos',type:0,override:overrideMember},
      {name:'🎥・lives-e-streams',type:0,override:overrideReadonly},
      {name:'🎉・sorteios',type:0,override:overrideReadonly},
      {name:'📊・ranking-xp',type:0,texto:TEXTOS.ranking,override:overrideReadonly},
    ]},
    {categoria:'💬 ── GERAL ──',canais:[
      {name:'💬・geral',type:0,override:overrideMember},
      {name:'👥・apresentacoes',type:0,override:overrideMember},
      {name:'📸・fotos-e-videos',type:0,override:overrideMember},
      {name:'🎬・clips-highlights',type:0,override:overrideMember},
      {name:'🎵・musica',type:0,override:overrideMember},
      {name:'🛒・marketplace',type:0,texto:TEXTOS.marketplace,override:overrideMember},
      {name:'🤝・parcerias',type:0,override:overrideReadonly},
      {name:'🏆・conquistas',type:0,override:overrideMember},
      {name:'🔊 Geral',type:2,user_limit:0,override:overrideMember},
      {name:'🎵 Música',type:2,user_limit:0,override:overrideMember},
      {name:'🔊 AFK',type:2,user_limit:0,override:overrideMember},
    ]},
    {categoria:'🎯 ── VALORANT ──',canais:[
      {name:'🎯・valorant-geral',type:0,override:overrideMember},
      {name:'👥・procurar-squad-val',type:0,override:overrideMember},
      {name:'💡・dicas-val',type:0,override:overrideMember},
      {name:'📊・ferro-a-prata',type:0,override:overrideMember},
      {name:'📊・ouro-a-platina',type:0,override:overrideMember},
      {name:'📊・diamante-a-ascendente',type:0,override:overrideMember},
      {name:'📊・imortal-e-radiante',type:0,override:overrideMember},
      {name:'🔊 Valorant #1',type:2,user_limit:5,override:overrideMember},
      {name:'🔊 Valorant #2',type:2,user_limit:5,override:overrideMember},
      {name:'🔊 Valorant #3',type:2,user_limit:5,override:overrideMember},
    ]},
    {categoria:'💣 ── CS2 ──',canais:[
      {name:'💣・cs2-geral',type:0,override:overrideMember},
      {name:'👥・procurar-squad-cs2',type:0,override:overrideMember},
      {name:'💡・dicas-cs2',type:0,override:overrideMember},
      {name:'📊・prata-a-ouro',type:0,override:overrideMember},
      {name:'📊・mge-a-supremo',type:0,override:overrideMember},
      {name:'📊・global-elite',type:0,override:overrideMember},
      {name:'🔊 CS2 #1',type:2,user_limit:5,override:overrideMember},
      {name:'🔊 CS2 #2',type:2,user_limit:5,override:overrideMember},
    ]},
    {categoria:'🔥 ── FREE FIRE ──',canais:[
      {name:'🔥・freefire-geral',type:0,override:overrideMember},
      {name:'👥・procurar-squad-ff',type:0,override:overrideMember},
      {name:'💡・dicas-ff',type:0,override:overrideMember},
      {name:'📊・bronze-a-prata-ff',type:0,override:overrideMember},
      {name:'📊・ouro-a-diamante-ff',type:0,override:overrideMember},
      {name:'📊・mestre-e-heroico-ff',type:0,override:overrideMember},
      {name:'🔊 Free Fire #1',type:2,user_limit:4,override:overrideMember},
      {name:'🔊 Free Fire #2',type:2,user_limit:4,override:overrideMember},
    ]},
    {categoria:'⚡ ── LEAGUE OF LEGENDS ──',canais:[
      {name:'⚡・lol-geral',type:0,override:overrideMember},
      {name:'👥・procurar-duo-lol',type:0,override:overrideMember},
      {name:'💡・dicas-lol',type:0,override:overrideMember},
      {name:'📊・ferro-a-prata-lol',type:0,override:overrideMember},
      {name:'📊・ouro-a-platina-lol',type:0,override:overrideMember},
      {name:'📊・esmeralda-a-diamante-lol',type:0,override:overrideMember},
      {name:'📊・mestre-e-challenger-lol',type:0,override:overrideMember},
      {name:'🔊 LoL #1',type:2,user_limit:5,override:overrideMember},
      {name:'🔊 LoL #2',type:2,user_limit:5,override:overrideMember},
    ]},
    {categoria:'🌀 ── FORTNITE ──',canais:[
      {name:'🌀・fortnite-geral',type:0,override:overrideMember},
      {name:'👥・procurar-squad-fn',type:0,override:overrideMember},
      {name:'💡・dicas-fn',type:0,override:overrideMember},
      {name:'📊・bronze-a-ouro-fn',type:0,override:overrideMember},
      {name:'📊・platina-a-diamante-fn',type:0,override:overrideMember},
      {name:'📊・elite-e-unreal-fn',type:0,override:overrideMember},
      {name:'🔊 Fortnite #1',type:2,user_limit:4,override:overrideMember},
      {name:'🔊 Fortnite #2',type:2,user_limit:4,override:overrideMember},
    ]},
    {categoria:'🎮 ── OUTROS JOGOS ──',canais:[
      {name:'🎮・outros-jogos',type:0,override:overrideMember},
      {name:'📱・mobile-games',type:0,override:overrideMember},
      {name:'🕹️・retro-games',type:0,override:overrideMember},
      {name:'🔊 Sala Livre #1',type:2,user_limit:0,override:overrideMember},
      {name:'🔊 Sala Livre #2',type:2,user_limit:0,override:overrideMember},
    ]},
    {categoria:'🏆 ── TORNEIOS ──',canais:[
      {name:'🏆・torneios-e-eventos',type:0,override:overrideReadonly},
      {name:'📋・inscricoes',type:0,override:overrideMember},
      {name:'🥇・hall-da-fama',type:0,override:overrideReadonly},
      {name:'💬・chat-torneio',type:0,override:overrideMember},
      {name:'🔊 Arena Torneio #1',type:2,user_limit:10,override:overrideMember},
      {name:'🔊 Arena Torneio #2',type:2,user_limit:10,override:overrideMember},
    ]},
    {categoria:'🛠️ ── STAFF ──',canais:[
      {name:'🛡️・chat-staff',type:0,override:overrideBlocked},
      {name:'📋・logs-gerais',type:0,override:overrideBlocked},
      {name:'📋・logs-moderacao',type:0,override:overrideBlocked},
      {name:'🚨・denuncias',type:0,override:overrideBlocked},
      {name:'📌・avisos-internos',type:0,override:overrideBlocked},
      {name:'🔊 Staff Voice',type:2,user_limit:0,override:overrideBlocked},
    ]},
  ];

  let criados = {categorias:0,canais:0,cargos:0,mensagens:0};

  for (const cargo of cargos) {
    await discordRequest(`/guilds/${guildId}/roles`,'POST',{name:cargo.name,color:cargo.color,hoist:cargo.hoist,mentionable:cargo.mentionable,permissions:cargo.permissions});
    criados.cargos++;
    await new Promise(r=>setTimeout(r,300));
  }

  for (const bloco of estrutura) {
    const cat = await discordRequest(`/guilds/${guildId}/channels`,'POST',{name:bloco.categoria,type:4,permission_overwrites:[{id:everyoneId,type:0,allow:'0',deny:DENY_ALL}]});
    criados.categorias++;
    for (const canal of bloco.canais) {
      const body = {name:canal.name,type:canal.type,parent_id:cat.id,permission_overwrites:canal.override||overrideMember};
      if (canal.type===2&&canal.user_limit!==undefined) body.user_limit=canal.user_limit;
      const canalCriado = await discordRequest(`/guilds/${guildId}/channels`,'POST',body);
      criados.canais++;
      if (canal.texto&&canal.type===0) {
        await new Promise(r=>setTimeout(r,600));
        await discordRequest(`/channels/${canalCriado.id}/messages`,'POST',{content:canal.texto});
        criados.mensagens++;
      }
      await new Promise(r=>setTimeout(r,400));
    }
  }

  return `⚡ **KRONUX Setup 100% Completo!** 🐉\n\n🎭 **${criados.cargos} cargos** com permissões únicas\n📁 **${criados.categorias} categorias** organizadas\n💬 **${criados.canais} canais** protegidos\n📝 **${criados.mensagens} textos** escritos automaticamente\n\n✅ Sistema de XP ativo\n✅ Perfis de jogador prontos\n✅ Ranking habilitado\n\n**GG — KRONUX está pronto para DOMINAR!** 🐉⚡`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method!=='POST') return new Response('Método não permitido',{status:405});
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await req.text();
  let isValid = false;
  try { isValid = await verifyRequest(rawBody,signature,timestamp); } catch { return new Response('Erro',{status:401}); }
  if (!isValid) return new Response('Inválido',{status:401});

  const interaction = JSON.parse(rawBody);
  if (interaction.type===1) return respond({type:1});

  if (interaction.type===2) {
    const {name,options=[]} = interaction.data;
    const guildId = interaction.guild_id;
    const GUILD_ONLY_COMMANDS = ['setup-gamer','stats','anunciar'];
    if (GUILD_ONLY_COMMANDS.includes(name) && !guildId) {
      return respond({type:4,data:{content:'❌ Este comando só funciona dentro de um servidor, não em DMs.',flags:64}});
    }
    try {
      let result;
      if (name==='setup-gamer') result = await handleSetupGamer(guildId);
      else if (name==='perfil') result = await handlePerfil(interaction);
      else if (name==='stats') result = await handleStats(guildId);
      else if (name==='ranking') result = await handleRanking();
      else if (name==='ajuda') result = handleAjuda();
      else if (name==='anunciar') result = await handleAnunciar(interaction,options);
      else if (name==='definir-bio') result = await handleDefinirBio(interaction,options);
      else if (name==='definir-jogo') result = await handleDefinirJogo(interaction,options);
      else if (name==='xp') result = await handleXP(interaction,options);
      else result = '❓ Comando não reconhecido.';

      if (typeof result==='object'&&result.type) return respond(result);
      return respond({type:4,data:{content:result,flags:64}});
    } catch (err) {
      return respond({type:4,data:{content:`❌ Erro: ${err.message}`,flags:64}});
    }
  }
  return new Response('Tipo desconhecido',{status:400});
}

export const config = {runtime:'edge'};
