const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APP_ID;
const REGISTER_SECRET = process.env.REGISTER_SECRET;

const commands = [
  {
    name: 'setup-gamer',
    description: '🐉 Configura o servidor completo com tema gamer (Valorant, CS2, FF, LoL, Fortnite)',
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
    return new Response(JSON.stringify({ error: err }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();
  return new Response(JSON.stringify({
    ok: true,
    message: `${data.length} comandos registrados!`,
    comandos: data.map(c => '/' + c.name),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
