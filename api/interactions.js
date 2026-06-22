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

// ── Textos prontos ────────────────────────────────────────────────────────────

const TEXTOS = {
  regras: `# 📜 REGRAS DO SERVIDOR

**Bem-vindo ao servidor! Para manter um ambiente saudável e divertido, siga as regras abaixo:**

**1️⃣ Respeito acima de tudo**
Trate todos com respeito. Não serão tolerados xingamentos, bullying, racismo, homofobia ou qualquer tipo de discriminação.

**2️⃣ Sem spam**
Não envie mensagens repetidas, flood ou conteúdo irrelevante nos canais. Cada canal tem seu propósito.

**3️⃣ Sem divulgação não autorizada**
Proibido divulgar outros servidores, links suspeitos ou propaganda sem autorização da staff.

**4️⃣ Sem cheats ou hacks**
Qualquer discussão sobre trapaças, cheats ou exploits nos jogos é proibida e resultará em ban imediato.

**5️⃣ Fale no canal certo**
Use os canais de acordo com o tema. Valorant no canal do Valorant, CS2 no canal do CS2, etc.

**6️⃣ Sem conteúdo adulto**
Proibido enviar conteúdo NSFW, violento ou perturbador em qualquer canal.

**7️⃣ Respeite a staff**
As decisões da staff são finais. Em caso de dúvidas, abra um ticket.

**8️⃣ Divirta-se!**
Estamos aqui para jogar e fazer amigos. Boa sorte nos jogos! 🎮

> ⚠️ O descumprimento das regras resultará em advertência, mute ou ban dependendo da gravidade.`,

  boasVindas: `# 👋 BEM-VINDO AO KRONUX!

🐉⚡ **O servidor definitivo para gamers brasileiros!**

Aqui você vai encontrar:
- 🎮 Canais dedicados para os maiores jogos do Brasil
- 🏆 Torneios e eventos exclusivos
- 👥 Uma comunidade ativa e respeitosa
- 📢 Novidades e atualizações dos seus jogos favoritos
- 🎯 Canais para encontrar squad e jogar com amigos

**Para começar:**
1. Leia as 📜 **#regras** para não levar ban
2. Pegue seus 🎭 **#cargos** de acordo com os jogos que você joga
3. Apresente-se no 👋 **#apresentacoes**
4. Encontre seu canal favorito e bora jogar!

**GG e bem-vindo à família KRONUX!** 🐉`,

  faq: `# ❓ FAQ — PERGUNTAS FREQUENTES

**❔ Como pego meu cargo de jogo?**
Vá no canal 🎭 #cargos e reaja com o emoji do seu jogo favorito.

**❔ Como entro nos torneios?**
Fique de olho no canal 📢 #anuncios. Quando abrir inscrições, siga as instruções do post.

**❔ Fui banido/mutado injustamente, o que faço?**
Abra um ticket no canal 🎫 #suporte explicando o ocorrido.

**❔ Posso divulgar meu servidor ou canal?**
Não. Divulgação não autorizada resulta em ban imediato.

**❔ Como me torno staff?**
Fique de olho no canal 📢 #anuncios. Abrimos seleção de staff periodicamente.

**❔ Tem canal de voz para jogar junto?**
Sim! Cada jogo tem seu próprio canal de voz. Basta entrar e jogar!

**❔ Posso sugerir algo para o servidor?**
Claro! Mande sua sugestão no canal 💡 #sugestoes.

**❔ O servidor é BR only?**
Sim, somos um servidor brasileiro. Fale português nos canais.`,
};

// ── Setup Gamer ───────────────────────────────────────────────────────────────

async function handleSetupGamer(guildId) {
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

  const cargos = [
    { name: '👑 Dono', color: 0xff0000, hoist: true, mentionable: true },
    { name: '⚡ Admin', color: 0xff6600, hoist: true, mentionable: true },
    { name: '🛡️ Moderador', color: 0xffaa00, hoist: true, mentionable: true },
    { name: '🎯 Valorant', color: 0xff4655, hoist: false, mentionable: true },
    { name: '💣 CS2', color: 0xf0a500, hoist: false, mentionable: true },
    { name: '🔥 Free Fire', color: 0xff6b35, hoist: false, mentionable: true },
    { name: '⚡ LoL', color: 0x00d4ff, hoist: false, mentionable: true },
    { name: '🌀 Fortnite', color: 0x9b59b6, hoist: false, mentionable: true },
    { name: '🎮 Gamer', color: 0x2ecc71, hoist: true, mentionable: false },
    { name: '🆕 Novato', color: 0x95a5a6, hoist: false, mentionable: false },
  ];

  let criados = { categorias: 0, canais: 0, cargos: 0, mensagens: 0 };

  // Cria cargos
  for (const cargo of cargos) {
    await discordRequest(`/guilds/${guildId}/roles`, 'POST', {
      name: cargo.name, color: cargo.color, hoist: cargo.hoist, mentionable: cargo.mentionable,
    });
    criados.cargos++;
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

      // Posta texto se tiver
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

  return `⚡ **KRONUX Setup concluído!**\n📁 ${criados.categorias} categorias\n💬 ${criados.canais} canais\n🎭 ${criados.cargos} cargos\n📝 ${criados.mensagens} textos escritos automaticamente\n\n🐉 Seu servidor gamer está pronto!`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

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
