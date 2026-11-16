const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const P = '.'; // command prefix
const antilink = new Set(); // groups with antilink on

const MENU = `*ADMIN MENU*
${['add', 'antilink on/off', 'demote', 'getbio', 'group open/close', 'hidetag', 'kick',
  'left', 'linkgroup', 'mute', 'poll Q | A | B', 'promote', 'revoke', 'setdesc']
  .map((c) => `★ ${P}${c}`).join('\n')}`;

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }) });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true }); // scan: WhatsApp > Linked devices
    if (connection === 'open') console.log('Bot online');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) start();
      else console.log('Logged out. Delete the auth folder and restart.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      try { await handle(sock, m); } catch (e) { console.error(e.message); }
    }
  });
}

async function handle(sock, m) {
  if (!m.message || m.key.fromMe) return;
  const jid = m.key.remoteJid;
  if (!jid.endsWith('@g.us')) return; // groups only
  const sender = m.key.participant;
  const text = m.message.conversation || m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption || '';
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: m });

  const meta = await sock.groupMetadata(jid);
  const admins = meta.participants.filter((p) => p.admin).map((p) => p.id);
  const isAdmin = admins.includes(sender);
  const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
  const botIsAdmin = admins.includes(botId);

  // AntiLink: delete group invite links and remove sender
  if (antilink.has(jid) && /chat\.whatsapp\.com\//i.test(text) && !isAdmin && botIsAdmin) {
    await sock.sendMessage(jid, { delete: m.key });
    await sock.groupParticipantsUpdate(jid, [sender], 'remove');
    return;
  }

  if (!text.startsWith(P)) return;
  const [cmd, ...args] = text.slice(P.length).trim().split(/\s+/);
  const rest = args.join(' ');
  const ctx = m.message.extendedTextMessage?.contextInfo;
  const target = ctx?.mentionedJid?.[0] || ctx?.participant ||
    (args[0] && /\d{6,}/.test(args[0]) ? args[0].replace(/\D/g, '') + '@s.whatsapp.net' : null);

  if (cmd === 'menu') return reply(MENU);
  if (!isAdmin) return reply('Admins only.');
  if (!botIsAdmin) return reply('Make me an admin first.');

  const needTarget = () => (target ? true : (reply('Mention, reply to, or give a number.'), false));
  const update = (action) => needTarget() && sock.groupParticipantsUpdate(jid, [target], action);

  switch (cmd) {
    case 'add': return update('add');
    case 'kick': return update('remove');
    case 'promote': return update('promote');
    case 'demote': return update('demote');
    case 'antilink':
      if (args[0] === 'on') antilink.add(jid); else antilink.delete(jid);
      return reply(`AntiLink ${antilink.has(jid) ? 'ON' : 'OFF'}`);
    case 'group':
      await sock.groupSettingUpdate(jid, args[0] === 'close' ? 'announcement' : 'not_announcement');
      return reply(`Group ${args[0] === 'close' ? 'closed' : 'opened'}`);
    case 'mute':
      await sock.groupSettingUpdate(jid, 'announcement');
      return reply('Group muted (admins only).');
    case 'hidetag':
      return sock.sendMessage(jid, { text: rest || '📢', mentions: meta.participants.map((p) => p.id) });
    case 'linkgroup':
      return reply('https://chat.whatsapp.com/' + (await sock.groupInviteCode(jid)));
    case 'revoke':
      await sock.groupRevokeInvite(jid);
      return reply('Invite link reset.');
    case 'setdesc':
      await sock.groupUpdateDescription(jid, rest);
      return reply('Description updated.');
    case 'getbio': {
      if (!needTarget()) return;
      const s = await sock.fetchStatus(target);
      return reply(s?.status || 'No bio.');
    }
    case 'poll': {
      const [name, ...values] = rest.split('|').map((s) => s.trim());
      if (!name || values.length < 2) return reply('Usage: .poll Question | A | B');
      return sock.sendMessage(jid, { poll: { name, values, selectableCount: 1 } });
    }
    case 'left':
      await reply('Bye 👋');
      return sock.groupLeave(jid);
  }
}

start();
