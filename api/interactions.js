const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API = 'https://discord.com/api/v10';

async function verifyRequest(rawBody, signature, timestamp) {
  const encoder = new TextEncoder();
  const keyBytes = hexToUint8Array(PUBLIC_KEY);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify']);
  const message = encoder.encode(timestamp + rawBody);
  const sigBytes = hexToUint8Array(signature);
  return crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, message);
}

function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

async function discordRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    method,
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`Discord API ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function respond(data) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

// ── Permissões Discord ────────────────────────────────────────────────────────
const PERMS = {
  ADMIN:                    0x8n,
  MANAGE_GUILD:             0x20n,
  MANAGE_CHANNELS:          0x10n,
  MANAGE_ROLES:             0x10000000n,
  MANAGE_MESSAGES:          0x2000n,
  KICK_MEMBERS:             0x2n,
  BAN_MEMBERS:              0x4n,
  MODERATE_MEMBERS:         0x400000000n,
  MOVE_MEMBERS:             0x1000000n,
  MUTE_MEMBERS:             0x400000n,
  DEAFEN_MEMBERS:           0x800000n,
  VIEW_AUDIT_LOG:           0x80n,
  SEND_MESSAGES:            0x800n,
  READ_MESSAGE_HISTORY:     0x10000n,
  VIEW_CHANNEL:             0x400n,
  CONNECT:                  0x100000n,
  SPEAK:                    0x200000n,
  STREAM:                   0x200n,
  USE_APPLICATION_COMMANDS: 0x80000000n,
  ADD_REACTIONS:            0x40n,
  ATTACH_FILES:             0x8000n,
  EMBED_LINKS:              0x4000n,
  MENTION_EVERYONE:         0x20000n,
  MANAGE_WEBHOOKS:          0x20000000n,
  PRIORITY_SPEAKER:         0x100n,
};

function calcPerms(...flags) {
  return flags.reduce((acc, f) => acc | f, 0n).toString();
}

// ── Textos prontos ────────────────────────────────────────────────────────────
const TEXTOS = {
  regras: `# 📜 REGRAS DO SERVIDOR — KRONUX

**Bem-vindo! Para manter um ambiente saudável e divertido, siga as regras:**

**1️⃣ Respeito acima de tudo**
Trate todos com respeito. Não toleramos xingamentos, bullying, racismo ou qualquer tipo de discriminação.

**2️⃣ Sem spam**
Não envie mensagens repetidas, flood ou conteúdo irrelevante. Cada canal tem seu propósito.

**3️⃣ Sem divulgação não autorizada**
Proibido divulgar outros servidores ou links suspeitos sem autorização da staff.

**4️⃣ Sem cheats ou hacks**
Qualquer discussão sobre trapaças ou exploits é proibida e resultará em ban imediato.

**5️⃣ Fale no canal certo**
Use os canais de acordo com o tema. Valorant no canal do Valorant, CS2 no canal do CS2.

**6️⃣ Sem conteúdo adulto**
Proibido enviar conteúdo NSFW ou violento em qualquer canal.

**7️⃣ Respeite a staff**
As decisões da staff são finais. Em caso de dúvidas, abra um ticket.

**8️⃣ Divirta-se!** 🎮

> ⚠️ O descumprimento resulta em advertência, mute ou ban conforme a gravidade.`,

  boasVindas: `# 👋 BEM-VINDO AO KRONUX! 🐉⚡

**O servidor definitivo para gamers brasileiros!**

Aqui você vai encontrar:
- 🎮 Canais para Valorant, CS2, Free Fire, LoL, Fortnite e muito mais
- 🏆 Torneios e eventos exclusivos
- 👥 Uma comunidade ativa e respeitosa
- 🎯 Canais para encontrar squad

**Para começar:**
1. Leia as 📜 **#regras**
2. Pegue seus 🎭 **#cargos** de acordo com os jogos que você joga
3. Apresente-se no 👋 **#apresentacoes**
4. Bora jogar! 🎮

**GG e bem-vindo à família KRONUX!** 🐉`,

  faq: `# ❓ FAQ — PERGUNTAS FREQUENTES

**❔ Como pego meu cargo de jogo?**
Vá em 🎭 #cargos e reaja com o emoji do seu jogo favorito.

**❔ Como entro nos torneios?**
Fique de olho em 📢 #anuncios. Quando abrir inscrições, siga as instruções.

**❔ Fui banido injustamente, o que faço?**
Abra um ticket em 🎫 #suporte explicando o ocorrido.

**❔ Como me torno staff?**
Fique de olho em 📢 #anuncios. Abrimos seleção periodicamente.

**❔ Posso divulgar meu canal?**
Não. Divulgação não autorizada resulta em ban imediato.

**❔ Tem voz para jogar junto?**
Sim! Cada jogo tem seus próprios canais de voz.

**❔ Como viro VIP?**
Entre em contato com a staff para saber sobre o programa VIP.`,
};

// ── Setup Gamer ───────────────────────────────────────────────────────────────
async function handleSetupGamer(guildId) {
  // Cargos com permissões específicas
  const cargos = [
    {
      name: '👑 KRONLORD',
      color: 0xffd700,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(PERMS.ADMIN),
      desc: 'Dono absoluto',
    },
    {
      name: '🐉 DRAKVEIL',
      color: 0xff0000,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(
        PERMS.MANAGE_GUILD, PERMS.MANAGE_CHANNELS, PERMS.MANAGE_ROLES,
        PERMS.BAN_MEMBERS, PERMS.KICK_MEMBERS, PERMS.MANAGE_MESSAGES,
        PERMS.MODERATE_MEMBERS, PERMS.VIEW_AUDIT_LOG, PERMS.MOVE_MEMBERS,
        PERMS.MANAGE_WEBHOOKS, PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL,
        PERMS.CONNECT, PERMS.SPEAK, PERMS.STREAM, PERMS.USE_APPLICATION_COMMANDS,
      ),
      desc: 'Co-Dono',
    },
    {
      name: '⚡ VORTEXUS',
      color: 0xff6600,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(
        PERMS.MANAGE_CHANNELS, PERMS.MANAGE_ROLES, PERMS.BAN_MEMBERS,
        PERMS.KICK_MEMBERS, PERMS.MANAGE_MESSAGES, PERMS.MODERATE_MEMBERS,
        PERMS.VIEW_AUDIT_LOG, PERMS.MOVE_MEMBERS, PERMS.SEND_MESSAGES,
        PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK, PERMS.USE_APPLICATION_COMMANDS,
      ),
      desc: 'Admin',
    },
    {
      name: '🛡️ SHIELDRIX',
      color: 0xffaa00,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(
        PERMS.MANAGE_MESSAGES, PERMS.MODERATE_MEMBERS, PERMS.KICK_MEMBERS,
        PERMS.MOVE_MEMBERS, PERMS.MUTE_MEMBERS, PERMS.DEAFEN_MEMBERS,
        PERMS.VIEW_AUDIT_LOG, PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL,
        PERMS.CONNECT, PERMS.SPEAK, PERMS.USE_APPLICATION_COMMANDS,
      ),
      desc: 'Moderador',
    },
    {
      name: '🔮 MYSTARA',
      color: 0x9b59b6,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(
        PERMS.MOVE_MEMBERS, PERMS.MANAGE_MESSAGES, PERMS.VIEW_AUDIT_LOG,
        PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK,
        PERMS.USE_APPLICATION_COMMANDS, PERMS.ADD_REACTIONS,
      ),
      desc: 'Helper',
    },
    {
      name: '🔥 BLAZECOR',
      color: 0xff4655,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(
        PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK,
        PERMS.USE_APPLICATION_COMMANDS, PERMS.ADD_REACTIONS, PERMS.ATTACH_FILES,
        PERMS.EMBED_LINKS, PERMS.PRIORITY_SPEAKER,
      ),
      desc: 'Pro Player',
    },
    {
      name: '🎥 STREAMVEX',
      color: 0x6441a5,
      hoist: true,
      mentionable: true,
      permissions: calcPerms(
        PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK,
        PERMS.STREAM, PERMS.USE_APPLICATION_COMMANDS, PERMS.ADD_REACTIONS,
        PERMS.ATTACH_FILES, PERMS.EMBED_LINKS,
      ),
      desc: 'Streamer',
    },
    {
      name: '💎 VAULTIS',
      color: 0x00d4ff,
      hoist: true,
      mentionable: false,
      permissions: calcPerms(
        PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK,
        PERMS.USE_APPLICATION_COMMANDS, PERMS.ADD_REACTIONS, PERMS.ATTACH_FILES,
        PERMS.EMBED_LINKS,
      ),
      desc: 'VIP',
    },
    {
      name: '⚔️ IRONBORN',
      color: 0x2ecc71,
      hoist: true,
      mentionable: false,
      permissions: calcPerms(
        PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK,
        PERMS.USE_APPLICATION_COMMANDS, PERMS.ADD_REACTIONS, PERMS.ATTACH_FILES,
        PERMS.EMBED_LINKS, PERMS.READ_MESSAGE_HISTORY,
      ),
      desc: 'Membro verificado',
    },
    {
      name: '🆕 SPAWNLING',
      color: 0x95a5a6,
      hoist: false,
      mentionable: false,
      permissions: calcPerms(
        PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK,
        PERMS.USE_APPLICATION_COMMANDS, PERMS.ADD_REACTIONS, PERMS.READ_MESSAGE_HISTORY,
      ),
      desc: 'Novato',
    },
    // Cargos de jogo (sem hoist, só para identificação)
    { name: '🎯 Valorant', color: 0xff4655, hoist: false, mentionable: true, permissions: calcPerms(PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK), desc: 'Jogador de Valorant' },
    { name: '💣 CS2', color: 0xf0a500, hoist: false, mentionable: true, permissions: calcPerms(PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK), desc: 'Jogador de CS2' },
    { name: '🔥 Free Fire', color: 0xff6b35, hoist: false, mentionable: true, permissions: calcPerms(PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK), desc: 'Jogador de Free Fire' },
    { name: '⚡ LoL', color: 0x00d4ff, hoist: false, mentionable: true, permissions: calcPerms(PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK), desc: 'Jogador de LoL' },
    { name: '🌀 Fortnite', color: 0x9b59b6, hoist: false, mentionable: true, permissions: calcPerms(PERMS.SEND_MESSAGES, PERMS.VIEW_CHANNEL, PERMS.CONNECT, PERMS.SPEAK), desc: 'Jogador de Fortnite' },
  ];

  const estrutura = [
    {
      categoria: '🐉 ── KRONUX ──',
      canais: [
        { name: '📜・regras', type: 0, texto: TEXTOS.regras },
        { name: '👋・boas-vindas', type: 0, texto: TEXTOS.boasVindas },
        { name: '📢・anuncios', type: 0 },
        { name: '❓・faq', type: 0, texto: TEXTOS.faq },
        { name: '🎭・cargos', type: 0 },
        { name: '💡・sugestoes', type: 0 },
        { name: '🎫・suporte', type: 0 },
      ],
    },
    {
      categoria: '💬 ── GERAL ──',
      canais: [
        { name: '💬・geral', type: 0 },
        { name: '😂・memes-gamer', type: 0 },
        { name: '📸・clips-e-prints', type: 0 },
        { name: '🏆・conquistas', type: 0 },
        { name: '👥・apresentacoes', type: 0 },
        { name: '🎵・musica', type: 0 },
      ],
    },
    {
      categoria: '🎯 ── VALORANT ──',
      canais: [
        { name: '🎯・valorant-geral', type: 0 },
        { name: '👥・procurar-squad-val', type: 0 },
        { name: '📊・ranks-valorant', type: 0 },
        { name: '💡・dicas-valorant', type: 0 },
        { name: '🔊 Valorant #1', type: 2, user_limit: 5 },
        { name: '🔊 Valorant #2', type: 2, user_limit: 5 },
        { name: '🔊 Valorant #3', type: 2, user_limit: 5 },
      ],
    },
    {
      categoria: '💣 ── CS2 ──',
      canais: [
        { name: '💣・cs2-geral', type: 0 },
        { name: '👥・procurar-squad-cs2', type: 0 },
        { name: '📊・ranks-cs2', type: 0 },
        { name: '💡・dicas-cs2', type: 0 },
        { name: '🔊 CS2 #1', type: 2, user_limit: 5 },
        { name: '🔊 CS2 #2', type: 2, user_limit: 5 },
      ],
    },
    {
      categoria: '🔥 ── FREE FIRE ──',
      canais: [
        { name: '🔥・freefire-geral', type: 0 },
        { name: '👥・procurar-squad-ff', type: 0 },
        { name: '📊・ranks-freefire', type: 0 },
        { name: '💡・dicas-freefire', type: 0 },
        { name: '🔊 Free Fire #1', type: 2, user_limit: 4 },
        { name: '🔊 Free Fire #2', type: 2, user_limit: 4 },
      ],
    },
    {
      categoria: '⚡ ── LEAGUE OF LEGENDS ──',
      canais: [
        { name: '⚡・lol-geral', type: 0 },
        { name: '👥・procurar-duo-lol', type: 0 },
        { name: '📊・ranks-lol', type: 0 },
        { name: '💡・dicas-lol', type: 0 },
        { name: '🔊 LoL #1', type: 2, user_limit: 5 },
        { name: '🔊 LoL #2', type: 2, user_limit: 5 },
      ],
    },
    {
      categoria: '🌀 ── FORTNITE ──',
      canais: [
        { name: '🌀・fortnite-geral', type: 0 },
        { name: '👥・procurar-squad-fn', type: 0 },
        { name: '💡・dicas-fortnite', type: 0 },
        { name: '🔊 Fortnite #1', type: 2, user_limit: 4 },
        { name: '🔊 Fortnite #2', type: 2, user_limit: 4 },
      ],
    },
    {
      categoria: '🎮 ── OUTROS JOGOS ──',
      canais: [
        { name: '🎮・outros-jogos', type: 0 },
        { name: '📱・mobile-games', type: 0 },
        { name: '🕹️・retro-games', type: 0 },
        { name: '🔊 Sala Livre #1', type: 2, user_limit: 0 },
        { name: '🔊 Sala Livre #2', type: 2, user_limit: 0 },
        { name: '🔊 Sala AFK', type: 2, user_limit: 0 },
      ],
    },
    {
      categoria: '🏆 ── TORNEIOS ──',
      canais: [
        { name: '🏆・torneios-e-eventos', type: 0 },
        { name: '📋・inscricoes', type: 0 },
        { name: '🥇・hall-da-fama', type: 0 },
        { name: '🔊 Arena Torneio', type: 2, user_limit: 10 },
      ],
    },
    {
      categoria: '🛠️ ── STAFF ──',
      canais: [
        { name: '🛡️・chat-staff', type: 0 },
        { name: '📋・logs', type: 0 },
        { name: '🚨・denuncias', type: 0 },
        { name: '🔊 Staff Voice', type: 2, user_limit: 0 },
      ],
    },
  ];

  let criados = { categorias: 0, canais: 0, cargos: 0, mensagens: 0 };

  // Cria cargos com permissões
  for (const cargo of cargos) {
    await discordRequest(`/guilds/${guildId}/roles`, 'POST', {
      name: cargo.name,
      color: cargo.color,
      hoist: cargo.hoist,
      mentionable: cargo.mentionable,
      permissions: cargo.permissions,
    });
    criados.cargos++;
    await new Promise(r => setTimeout(r, 300));
  }

  // Cria categorias e canais
  for (const bloco of estrutura) {
    const cat = await discordRequest(`/guilds/${guildId}/channels`, 'POST', {
      name: bloco.categoria, type: 4,
    });
    criados.categorias++;

    for (const canal of bloco.canais) {
      const body = { name: canal.name, type: canal.type, parent_id: cat.id };
      if (canal.type === 2 && canal.user_limit !== undefined) body.user_limit = canal.user_limit;
      const canalCriado = await discordRequest(`/guilds/${guildId}/channels`, 'POST', body);
      criados.canais++;

      if (canal.texto && canal.type === 0) {
        await new Promise(r => setTimeout(r, 500));
        await discordRequest(`/channels/${canalCriado.id}/messages`, 'POST', {
          content: canal.texto,
        });
        criados.mensagens++;
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return `⚡ **KRONUX Setup concluído!**\n\n🎭 **${criados.cargos} cargos criados:**\n👑 KRONLORD • 🐉 DRAKVEIL • ⚡ VORTEXUS • 🛡️ SHIELDRIX • 🔮 MYSTARA • 🔥 BLAZECOR • 🎥 STREAMVEX • 💎 VAULTIS • ⚔️ IRONBORN • 🆕 SPAWNLING\n+ Cargos de jogo: Valorant, CS2, Free Fire, LoL, Fortnite\n\n📁 ${criados.categorias} categorias · 💬 ${criados.canais} canais · 📝 ${criados.mensagens} textos escritos\n\n🐉 Seu servidor gamer está pronto!`;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await req.text();
  let isValid = false;
  try { isValid = await verifyRequest(rawBody, signature, timestamp); } catch {
    return new Response('Erro na verificação', { status: 401 });
  }
  if (!isValid) return new Response('Assinatura inválida', { status: 401 });

  const interaction = JSON.parse(rawBody);
  if (interaction.type === 1) return respond({ type: 1 });

  if (interaction.type === 2) {
    const { name } = interaction.data;
    const guildId = interaction.guild_id;
    try {
      let message = '';
      if (name === 'setup-gamer') message = await handleSetupGamer(guildId);
      else message = '❓ Comando não reconhecido.';
      return respond({ type: 4, data: { content: message, flags: 64 } });
    } catch (err) {
      return respond({ type: 4, data: { content: `❌ Erro: ${err.message}`, flags: 64 } });
    }
  }

  return new Response('Tipo desconhecido', { status: 400 });
}

export const config = { runtime: 'edge' };
