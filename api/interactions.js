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

// ── Permissões ────────────────────────────────────────────────────────────────
const P = {
  ADMIN:             0x8n,
  MANAGE_GUILD:      0x20n,
  MANAGE_CHANNELS:   0x10n,
  MANAGE_ROLES:      0x10000000n,
  MANAGE_MESSAGES:   0x2000n,
  KICK:              0x2n,
  BAN:               0x4n,
  MODERATE:          0x400000000n,
  MOVE_MEMBERS:      0x1000000n,
  MUTE_MEMBERS:      0x400000n,
  DEAFEN_MEMBERS:    0x800000n,
  VIEW_AUDIT:        0x80n,
  SEND:              0x800n,
  READ_HISTORY:      0x10000n,
  VIEW:              0x400n,
  CONNECT:           0x100000n,
  SPEAK:             0x200000n,
  STREAM:            0x200n,
  USE_CMDS:          0x80000000n,
  ADD_REACTIONS:     0x40n,
  ATTACH:            0x8000n,
  EMBED:             0x4000n,
  MENTION_ALL:       0x20000n,
  WEBHOOKS:          0x20000000n,
  PRIORITY:          0x100n,
  MANAGE_WEBHOOKS:   0x20000000n,
  SEND_TTS:          0x1000n,
  USE_EXTERNAL_EMOJI:0x40000n,
};

function perms(...flags) {
  return flags.reduce((a, f) => a | f, 0n).toString();
}

// Permissão NEGAR tudo para @everyone
const DENY_ALL = (0x800n | 0x10000n | 0x400n | 0x100000n | 0x200000n | 0x40n | 0x8000n | 0x4000n).toString();
// Permissão ALLOW básica para membros
const ALLOW_MEMBER = (0x800n | 0x10000n | 0x400n | 0x100000n | 0x200000n | 0x40n | 0x80000000n).toString();
// Permissão SOMENTE LEITURA
const ALLOW_READONLY = (0x10000n | 0x400n).toString();
// DENY enviar mensagens
const DENY_SEND = (0x800n).toString();

// ── Textos ────────────────────────────────────────────────────────────────────
const TEXTOS = {
  regras: `╔══════════════════════════════════════╗
       📜  R E G R A S  —  K R O N U X
╚══════════════════════════════════════╝

Bem-vindo guerreiro! Para manter o servidor épico e saudável, siga as regras abaixo. O descumprimento resultará em punição imediata.

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**
**1️⃣  RESPEITO ACIMA DE TUDO**
Trate todos com respeito. Xingamentos, bullying, racismo, homofobia ou qualquer forma de discriminação resultam em **ban permanente**.

**2️⃣  SEM SPAM OU FLOOD**
Não envie mensagens repetidas, emojis em excesso ou conteúdo irrelevante. Cada canal tem seu propósito — respeite-o.

**3️⃣  SEM DIVULGAÇÃO NÃO AUTORIZADA**
Proibido divulgar outros servidores, canais, redes sociais ou links suspeitos sem autorização da staff. Violação = ban imediato.

**4️⃣  TOLERÂNCIA ZERO COM CHEATS**
Qualquer discussão sobre cheats, hacks, exploits ou trapaças em jogos é **proibida** e resulta em ban permanente sem apelação.

**5️⃣  USE O CANAL CORRETO**
Cada canal foi criado com um propósito. Use Valorant no canal do Valorant, CS2 no canal do CS2, etc. Desvios serão punidos.

**6️⃣  SEM CONTEÚDO NSFW**
Conteúdo adulto, violento, perturbador ou ilegal é proibido em **todos os canais**, sem exceção.

**7️⃣  RESPEITE A STAFF**
As decisões da staff são finais. Se discordar, use o canal de sugestões ou abra um ticket — nunca desrespeite publicamente.

**8️⃣  NICK E AVATAR ADEQUADOS**
Use um nickname e avatar apropriados. Nicks ofensivos ou inapropriados serão alterados pela staff.

**9️⃣  SEM MENÇÕES DESNECESSÁRIAS**
Não mencione @everyone, @here ou membros da staff sem motivo. Use os canais corretos para suas dúvidas.

**🔟  MARKETPLACE COM RESPONSABILIDADE**
O servidor não se responsabiliza por negociações realizadas no marketplace. Faça negócios com cautela.

**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**
> ⚠️ **Punições:** Advertência → Mute → Kick → Ban temporário → Ban permanente
> 🐉 **KRONUX Staff Team**`,

  boasVindas: `╔══════════════════════════════════════╗
    👋  B E M - V I N D O  A O  K R O N U X  🐉⚡
╚══════════════════════════════════════╝

**Você acaba de entrar no servidor gamer mais épico do Brasil!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 **O QUE VOCÊ VAI ENCONTRAR AQUI:**
- Canais dedicados para Valorant, CS2, Free Fire, LoL, Fortnite e muito mais
- Sistema de XP e ranking por atividade
- Torneios e eventos com premiações
- Canal de clipes e highlights
- Marketplace de itens e contas
- Sorteios e giveaways exclusivos
- Notificações de lives da staff
- E muito mais!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🚀 PRIMEIROS PASSOS:**
1️⃣ Leia as 📜 **regras** — isso é obrigatório!
2️⃣ Pegue seus 🎭 **cargos** de acordo com os jogos que você joga
3️⃣ Se apresente em 👥 **apresentacoes**
4️⃣ Veja seu nível em 📊 **ranking-xp**
5️⃣ Escolha seu canal favorito e **bora jogar!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🏆 SISTEMA DE RANKS KRONUX:**
🆕 SPAWNLING → ⚔️ IRONBORN → 💎 VAULTIS → 🔥 BLAZECOR → 🐉 DRAKVEIL → 👑 KRONLORD

Suba de nível enviando mensagens e ficando em call!

**GG e bem-vindo à família KRONUX!** 🐉⚡`,

  faq: `╔══════════════════════════════════════╗
        ❓  F A Q  —  K R O N U X
╚══════════════════════════════════════╝

**Perguntas frequentes — leia antes de perguntar na staff!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**❔ Como pego meu cargo de jogo?**
↳ Vá em 🎭 **cargos** e siga as instruções para pegar o cargo do seu jogo favorito.

**❔ Como funciona o sistema de XP?**
↳ Você ganha XP enviando mensagens nos canais e ficando em canais de voz. Veja seu nível em 📊 **ranking-xp**.

**❔ Como entro nos torneios?**
↳ Fique de olho em 📢 **anuncios**. Quando abrir inscrições, as instruções estarão lá.

**❔ Como funciona o marketplace?**
↳ Poste sua oferta em 🛒 **marketplace** seguindo o modelo fixado. O servidor não garante negociações — faça por sua conta e risco.

**❔ Fui punido injustamente, o que faço?**
↳ Entre em contato com um 🛡️ SHIELDRIX ou ⚡ VORTEXUS via DM com prints e explicação.

**❔ Como me torno staff?**
↳ Fique de olho em 📢 **anuncios**. Abrimos seleção periodicamente. Não peça cargo em DM.

**❔ Como viro VIP?**
↳ Entre em contato com a staff para saber sobre o programa 💎 VAULTIS.

**❔ Posso divulgar meu canal ou servidor?**
↳ Apenas em 🤝 **parcerias** e somente com autorização prévia da staff.

**❔ Como posto meu clipe?**
↳ Envie diretamente em 🎬 **clips-highlights** com o nome do jogo e uma descrição.

**❔ O servidor tem bot de música?**
↳ Sim! Use os comandos no canal 🤖 **comandos** para tocar músicas nos canais de voz.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 🐉 **KRONUX Staff Team** — Dúvidas não respondidas aqui? Fale com a staff!`,

  marketplace: `╔══════════════════════════════════════╗
      🛒  M A R K E T P L A C E  —  K R O N U X
╚══════════════════════════════════════╝

**Canal de compra, venda e troca de contas e itens de jogos!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**📋 MODELO OBRIGATÓRIO PARA POSTAR:**

\`\`\`
🎮 JOGO: [nome do jogo]
📦 TIPO: [conta / skin / item / moeda]
💰 PREÇO: [valor ou "troca"]
📊 DETALHES: [descreva o que está vendendo]
📸 PRINTS: [anexe imagens]
📞 CONTATO: [como entrar em contato]
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚠️ REGRAS DO MARKETPLACE:**
- O servidor **NÃO** se responsabiliza por negociações
- Faça sempre na ordem: prints → pagamento → entrega
- Golpistas serão banidos permanentemente
- Não poste preços absurdos ou fora da realidade
- Sem propaganda de sites externos

**🐉 KRONUX não é responsável por golpes. Negocie com cautela!**`,

  ranking: `╔══════════════════════════════════════╗
       📊  R A N K I N G  X P  —  K R O N U X
╚══════════════════════════════════════╝

**Sistema de XP e níveis do servidor!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🏆 COMO GANHAR XP:**
- 💬 Mensagens enviadas nos canais → +XP por mensagem
- 🔊 Tempo em canal de voz → +XP por hora em call
- 🎯 Participar de eventos e torneios → +XP bônus

**🎖️ HIERARQUIA DE NÍVEIS:**
🆕 **SPAWNLING** — Nível 1 a 5 (Novato)
⚔️ **IRONBORN** — Nível 6 a 15 (Membro)
💎 **VAULTIS** — Nível 16 a 25 (Veterano)
🔥 **BLAZECOR** — Nível 26 a 40 (Pro)
🐉 **DRAKVEIL** — Nível 41 a 60 (Elite)
👑 **KRONLORD** — Nível 61+ (Lendário)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Use os comandos do bot de XP para ver seu nível!`,

  lives: `╔══════════════════════════════════════╗
      🎥  L I V E S  —  K R O N U X
╚══════════════════════════════════════╝

**Canal de notificações de lives da staff e parceiros!**

Quando um membro 🎥 STREAMVEX ou parceiro oficial entrar ao vivo, a notificação aparecerá aqui automaticamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Para ser notificado das lives:**
Ative as notificações deste canal clicando no 🔔 acima!

🐉 **KRONUX Stream Team**`,

  sorteios: `╔══════════════════════════════════════╗
      🎉  S O R T E I O S  —  K R O N U X
╚══════════════════════════════════════╝

**Canal oficial de sorteios e giveaways do KRONUX!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎁 COMO PARTICIPAR:**
Cada sorteio terá suas próprias regras. Geralmente:
- Reaja com o emoji indicado
- Siga as instruções do post
- Aguarde o resultado!

**📋 REGRAS GERAIS:**
- Apenas 1 conta por pessoa
- Contas alternativas serão desclassificadas
- Resultado é final e irrevogável
- Premiações serão entregues em até 48h

**🐉 Boa sorte a todos!**`,
};

// ── Setup Gamer Completo ──────────────────────────────────────────────────────
async function handleSetupGamer(guildId) {

  // Busca o @everyone role id
  const guild = await discordRequest(`/guilds/${guildId}`);
  const everyoneId = guild.id; // @everyone tem o mesmo ID do servidor

  // Permissão override: bloqueia @everyone de enviar/alterar, permite apenas ver
  const overrideReadonly = [
    { id: everyoneId, type: 0, allow: ALLOW_READONLY, deny: DENY_SEND },
  ];
  const overrideMember = [
    { id: everyoneId, type: 0, allow: ALLOW_MEMBER, deny: '0' },
  ];
  const overrideBlocked = [
    { id: everyoneId, type: 0, allow: '0', deny: DENY_ALL },
  ];

  // Cargos com permissões específicas
  const cargos = [
    { name: '👑 KRONLORD', color: 0xffd700, hoist: true, mentionable: true, permissions: perms(P.ADMIN) },
    { name: '🐉 DRAKVEIL', color: 0xff0000, hoist: true, mentionable: true, permissions: perms(P.MANAGE_GUILD, P.MANAGE_CHANNELS, P.MANAGE_ROLES, P.BAN, P.KICK, P.MANAGE_MESSAGES, P.MODERATE, P.VIEW_AUDIT, P.MOVE_MEMBERS, P.WEBHOOKS, P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.STREAM, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.READ_HISTORY) },
    { name: '⚡ VORTEXUS', color: 0xff6600, hoist: true, mentionable: true, permissions: perms(P.MANAGE_CHANNELS, P.MANAGE_ROLES, P.BAN, P.KICK, P.MANAGE_MESSAGES, P.MODERATE, P.VIEW_AUDIT, P.MOVE_MEMBERS, P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.READ_HISTORY) },
    { name: '🛡️ SHIELDRIX', color: 0xffaa00, hoist: true, mentionable: true, permissions: perms(P.MANAGE_MESSAGES, P.MODERATE, P.KICK, P.MOVE_MEMBERS, P.MUTE_MEMBERS, P.DEAFEN_MEMBERS, P.VIEW_AUDIT, P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.READ_HISTORY) },
    { name: '🔮 MYSTARA', color: 0x9b59b6, hoist: true, mentionable: true, permissions: perms(P.MOVE_MEMBERS, P.MANAGE_MESSAGES, P.VIEW_AUDIT, P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.READ_HISTORY) },
    { name: '🔥 BLAZECOR', color: 0xff4655, hoist: true, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.PRIORITY, P.READ_HISTORY) },
    { name: '🎥 STREAMVEX', color: 0x6441a5, hoist: true, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.STREAM, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.READ_HISTORY) },
    { name: '💎 VAULTIS', color: 0x00d4ff, hoist: true, mentionable: false, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.READ_HISTORY) },
    { name: '⚔️ IRONBORN', color: 0x2ecc71, hoist: true, mentionable: false, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.ATTACH, P.EMBED, P.READ_HISTORY) },
    { name: '🆕 SPAWNLING', color: 0x95a5a6, hoist: false, mentionable: false, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK, P.USE_CMDS, P.ADD_REACTIONS, P.READ_HISTORY) },
    { name: '🎯 Valorant', color: 0xff4655, hoist: false, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK) },
    { name: '💣 CS2', color: 0xf0a500, hoist: false, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK) },
    { name: '🔥 Free Fire', color: 0xff6b35, hoist: false, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK) },
    { name: '⚡ LoL', color: 0x00d4ff, hoist: false, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK) },
    { name: '🌀 Fortnite', color: 0x9b59b6, hoist: false, mentionable: true, permissions: perms(P.SEND, P.VIEW, P.CONNECT, P.SPEAK) },
  ];

  // Estrutura completa do servidor
  const estrutura = [
    {
      categoria: '🐉 ── KRONUX ──',
      canais: [
        { name: '📜・regras', type: 0, texto: TEXTOS.regras, override: overrideReadonly },
        { name: '👋・boas-vindas', type: 0, texto: TEXTOS.boasVindas, override: overrideReadonly },
        { name: '📢・anuncios', type: 0, override: overrideReadonly },
        { name: '❓・faq', type: 0, texto: TEXTOS.faq, override: overrideReadonly },
        { name: '🎭・cargos', type: 0, override: overrideReadonly },
        { name: '💡・sugestoes', type: 0, override: overrideMember },
        { name: '🤖・comandos', type: 0, override: overrideMember },
        { name: '🎥・lives-e-streams', type: 0, texto: TEXTOS.lives, override: overrideReadonly },
        { name: '🎉・sorteios', type: 0, texto: TEXTOS.sorteios, override: overrideReadonly },
        { name: '📊・ranking-xp', type: 0, override: overrideReadonly },
      ],
    },
    {
      categoria: '💬 ── GERAL ──',
      canais: [
        { name: '💬・geral', type: 0, override: overrideMember },
        { name: '👥・apresentacoes', type: 0, override: overrideMember },
        { name: '📸・fotos-e-videos', type: 0, override: overrideMember },
        { name: '🎬・clips-highlights', type: 0, override: overrideMember },
        { name: '🎵・musica', type: 0, override: overrideMember },
        { name: '🛒・marketplace', type: 0, texto: TEXTOS.marketplace, override: overrideMember },
        { name: '🤝・parcerias', type: 0, override: overrideReadonly },
        { name: '🏆・conquistas', type: 0, override: overrideMember },
        { name: '🔊 Geral', type: 2, user_limit: 0, override: overrideMember },
        { name: '🎵 Música', type: 2, user_limit: 0, override: overrideMember },
        { name: '🔊 AFK', type: 2, user_limit: 0, override: overrideMember },
      ],
    },
    {
      categoria: '🎯 ── VALORANT ──',
      canais: [
        { name: '🎯・valorant-geral', type: 0, override: overrideMember },
        { name: '👥・procurar-squad-val', type: 0, override: overrideMember },
        { name: '💡・dicas-val', type: 0, override: overrideMember },
        { name: '📊・ferro-a-prata', type: 0, override: overrideMember },
        { name: '📊・ouro-a-platina', type: 0, override: overrideMember },
        { name: '📊・diamante-a-ascendente', type: 0, override: overrideMember },
        { name: '📊・imortal-e-radiante', type: 0, override: overrideMember },
        { name: '🔊 Valorant #1', type: 2, user_limit: 5, override: overrideMember },
        { name: '🔊 Valorant #2', type: 2, user_limit: 5, override: overrideMember },
        { name: '🔊 Valorant #3', type: 2, user_limit: 5, override: overrideMember },
      ],
    },
    {
      categoria: '💣 ── CS2 ──',
      canais: [
        { name: '💣・cs2-geral', type: 0, override: overrideMember },
        { name: '👥・procurar-squad-cs2', type: 0, override: overrideMember },
        { name: '💡・dicas-cs2', type: 0, override: overrideMember },
        { name: '📊・prata-a-ouro', type: 0, override: overrideMember },
        { name: '📊・mge-a-supremo', type: 0, override: overrideMember },
        { name: '📊・global-elite', type: 0, override: overrideMember },
        { name: '🔊 CS2 #1', type: 2, user_limit: 5, override: overrideMember },
        { name: '🔊 CS2 #2', type: 2, user_limit: 5, override: overrideMember },
      ],
    },
    {
      categoria: '🔥 ── FREE FIRE ──',
      canais: [
        { name: '🔥・freefire-geral', type: 0, override: overrideMember },
        { name: '👥・procurar-squad-ff', type: 0, override: overrideMember },
        { name: '💡・dicas-ff', type: 0, override: overrideMember },
        { name: '📊・bronze-a-prata-ff', type: 0, override: overrideMember },
        { name: '📊・ouro-a-diamante-ff', type: 0, override: overrideMember },
        { name: '📊・mestre-e-heroico-ff', type: 0, override: overrideMember },
        { name: '🔊 Free Fire #1', type: 2, user_limit: 4, override: overrideMember },
        { name: '🔊 Free Fire #2', type: 2, user_limit: 4, override: overrideMember },
      ],
    },
    {
      categoria: '⚡ ── LEAGUE OF LEGENDS ──',
      canais: [
        { name: '⚡・lol-geral', type: 0, override: overrideMember },
        { name: '👥・procurar-duo-lol', type: 0, override: overrideMember },
        { name: '💡・dicas-lol', type: 0, override: overrideMember },
        { name: '📊・ferro-a-prata-lol', type: 0, override: overrideMember },
        { name: '📊・ouro-a-platina-lol', type: 0, override: overrideMember },
        { name: '📊・esmeralda-a-diamante-lol', type: 0, override: overrideMember },
        { name: '📊・mestre-e-challenger-lol', type: 0, override: overrideMember },
        { name: '🔊 LoL #1', type: 2, user_limit: 5, override: overrideMember },
        { name: '🔊 LoL #2', type: 2, user_limit: 5, override: overrideMember },
      ],
    },
    {
      categoria: '🌀 ── FORTNITE ──',
      canais: [
        { name: '🌀・fortnite-geral', type: 0, override: overrideMember },
        { name: '👥・procurar-squad-fn', type: 0, override: overrideMember },
        { name: '💡・dicas-fn', type: 0, override: overrideMember },
        { name: '📊・bronze-a-ouro-fn', type: 0, override: overrideMember },
        { name: '📊・platina-a-diamante-fn', type: 0, override: overrideMember },
        { name: '📊・elite-e-unreal-fn', type: 0, override: overrideMember },
        { name: '🔊 Fortnite #1', type: 2, user_limit: 4, override: overrideMember },
        { name: '🔊 Fortnite #2', type: 2, user_limit: 4, override: overrideMember },
      ],
    },
    {
      categoria: '🎮 ── OUTROS JOGOS ──',
      canais: [
        { name: '🎮・outros-jogos', type: 0, override: overrideMember },
        { name: '📱・mobile-games', type: 0, override: overrideMember },
        { name: '🕹️・retro-games', type: 0, override: overrideMember },
        { name: '🔊 Sala Livre #1', type: 2, user_limit: 0, override: overrideMember },
        { name: '🔊 Sala Livre #2', type: 2, user_limit: 0, override: overrideMember },
      ],
    },
    {
      categoria: '🏆 ── TORNEIOS ──',
      canais: [
        { name: '🏆・torneios-e-eventos', type: 0, override: overrideReadonly },
        { name: '📋・inscricoes', type: 0, override: overrideMember },
        { name: '🥇・hall-da-fama', type: 0, override: overrideReadonly },
        { name: '💬・chat-torneio', type: 0, override: overrideMember },
        { name: '🔊 Arena Torneio #1', type: 2, user_limit: 10, override: overrideMember },
        { name: '🔊 Arena Torneio #2', type: 2, user_limit: 10, override: overrideMember },
      ],
    },
    {
      categoria: '🛠️ ── STAFF ──',
      canais: [
        { name: '🛡️・chat-staff', type: 0, override: overrideBlocked },
        { name: '📋・logs-gerais', type: 0, override: overrideBlocked },
        { name: '📋・logs-moderacao', type: 0, override: overrideBlocked },
        { name: '🚨・denuncias', type: 0, override: overrideBlocked },
        { name: '📌・avisos-internos', type: 0, override: overrideBlocked },
        { name: '🔊 Staff Voice', type: 2, user_limit: 0, override: overrideBlocked },
      ],
    },
  ];

  let criados = { categorias: 0, canais: 0, cargos: 0, mensagens: 0 };

  // Cria cargos
  for (const cargo of cargos) {
    await discordRequest(`/guilds/${guildId}/roles`, 'POST', {
      name: cargo.name, color: cargo.color, hoist: cargo.hoist,
      mentionable: cargo.mentionable, permissions: cargo.permissions,
    });
    criados.cargos++;
    await new Promise(r => setTimeout(r, 300));
  }

  // Cria categorias e canais com permissões
  for (const bloco of estrutura) {
    const cat = await discordRequest(`/guilds/${guildId}/channels`, 'POST', {
      name: bloco.categoria, type: 4,
      permission_overwrites: [{ id: everyoneId, type: 0, allow: '0', deny: DENY_ALL }],
    });
    criados.categorias++;

    for (const canal of bloco.canais) {
      const body = {
        name: canal.name,
        type: canal.type,
        parent_id: cat.id,
        permission_overwrites: canal.override || overrideMember,
      };
      if (canal.type === 2 && canal.user_limit !== undefined) body.user_limit = canal.user_limit;
      const canalCriado = await discordRequest(`/guilds/${guildId}/channels`, 'POST', body);
      criados.canais++;

      if (canal.texto && canal.type === 0) {
        await new Promise(r => setTimeout(r, 600));
        await discordRequest(`/channels/${canalCriado.id}/messages`, 'POST', { content: canal.texto });
        criados.mensagens++;
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  return `⚡ **KRONUX Setup Completo!** 🐉

🎭 **${criados.cargos} cargos** com permissões específicas
📁 **${criados.categorias} categorias** organizadas
💬 **${criados.canais} canais** com permissões bloqueadas
📝 **${criados.mensagens} textos** escritos automaticamente

🔒 Todos os canais estão protegidos — apenas Admin+ pode alterar
🎮 Valorant, CS2, Free Fire, LoL e Fortnite configurados com ranks
🏆 Sistema de torneios, marketplace, lives e sorteios prontos

**GG — seu servidor está pronto para DOMINAR!** 🐉⚡`;
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
