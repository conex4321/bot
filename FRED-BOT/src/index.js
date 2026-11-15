import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from './config.js';
import { handleMessage } from './commands/handler.js';
import { getText } from './utils.js';
import { groupSettings, saveStore } from './store.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
let sock;
let reconnectTimer;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    version = undefined;
  }

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    browser: ['FRED BOT', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nScan this QR using WhatsApp > Linked devices > Link a device:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log(`\n✅ ${config.name} is connected to WhatsApp.`);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('WhatsApp logged out. Delete auth_info and restart to pair again.');
        return;
      }
      console.log('Connection closed. Reconnecting in 5 seconds...');
      reconnectTimer = setTimeout(startBot, 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      try {
        await handleMessage(sock, msg);
      } catch (error) {
        console.error('Message handler error:', error?.message || error);
      }
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const settings = groupSettings(id);
      if (action === 'add' && settings.welcome) {
        for (const participant of participants) {
          await sock.sendMessage(id, {
            text: `👋 Welcome @${participant.split('@')[0]} to the group! Please read the group rules.`,
            mentions: [participant]
          });
        }
      }
    } catch (error) {
      console.error('Welcome message error:', error?.message || error);
    }
  });

  sock.ev.on('groups.update', () => saveStore());
}

console.log(`Starting ${config.name}...`);
startBot().catch(error => {
  console.error('Could not start bot:', error);
  process.exitCode = 1;
});

process.on('SIGINT', () => {
  console.log('\nStopping FRED BOT safely...');
  saveStore();
  process.exit(0);
});
