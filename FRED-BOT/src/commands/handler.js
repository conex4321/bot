import { config } from '../config.js';
import { groupSettings, saveStore } from '../store.js';
import {
  getText, getMentioned, getQuotedParticipant,
  phoneFromJid, isUrl, formatUptime
} from '../utils.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

const startedAt = Date.now();

function menu() {
  return `╭━━〔 🤖 ${config.name} 〕━━╮
│ Prefix: ${config.prefix}
│ Status: Online
╰━━━━━━━━━━━━━━━━━━━━╯

📌 GENERAL
${config.prefix}menu
${config.prefix}ping
${config.prefix}owner
${config.prefix}groupinfo

👥 GROUP ADMIN
${config.prefix}tagall
${config.prefix}hidetag
${config.prefix}kick (reply/mention)
${config.prefix}promote (reply/mention)
${config.prefix}demote (reply/mention)
${config.prefix}mute
${config.prefix}unmute
${config.prefix}linkgroup

🛡️ GROUP PROTECTION
${config.prefix}antilink on/off
${config.prefix}welcome on/off

🎨 MEDIA
${config.prefix}sticker (reply to image/video)

⚙️ OWNER
${config.prefix}restart (manual process restart required)

╰━━ FRED BOT • ${new Date().getFullYear()} ━━╯`;
}

async function groupContext(sock, jid, sender) {
  if (!jid.endsWith('@g.us')) return { error: 'This command only works in groups.' };
  const metadata = await sock.groupMetadata(jid);
  const members = metadata.participants || [];
  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
  const senderData = members.find(p => p.id === sender);
  const botData = members.find(p => p.id === botJid || p.id?.split(':')[0] === sock.user?.id?.split(':')[0]);
  return {
    metadata, members,
    senderAdmin: Boolean(senderData?.admin),
    botAdmin: Boolean(botData?.admin || botData?.admin === 'admin' || botData?.admin === 'superadmin')
  };
}

function targetFromMessage(msg) {
  return getMentioned(msg)[0] || getQuotedParticipant(msg);
}

export async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text = getText(msg);
  if (!text.startsWith(config.prefix)) {
    // Basic anti-link: delete links in groups when enabled.
    if (jid.endsWith('@g.us') && isUrl(text)) {
      const settings = groupSettings(jid);
      if (settings.antilink) {
        const ctx = await groupContext(sock, jid, sender);
        if (ctx.senderAdmin) return;
        try {
          await sock.sendMessage(jid, { delete: msg.key });
          await sock.sendMessage(jid, {
            text: `⚠️ @${phoneFromJid(sender)}: group links are not allowed.`,
            mentions: [sender]
          });
        } catch {
          await sock.sendMessage(jid, { text: '⚠️ A link was detected. Admin rights are needed to delete messages.' });
        }
      }
    }
    return;
  }

  const [rawCommand, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = (rawCommand || '').toLowerCase();
  const arg = args.join(' ');
  const isOwner = config.ownerNumber && phoneFromJid(sender) === config.ownerNumber;

  if (config.ownerOnly && ['restart'].includes(command) && !isOwner) {
    return sock.sendMessage(jid, { text: '⛔ This command is for the bot owner only.' }, { quoted: msg });
  }

  if (['menu', 'help'].includes(command)) {
    return sock.sendMessage(jid, { text: menu() }, { quoted: msg });
  }
  if (command === 'ping') {
    return sock.sendMessage(jid, { text: `🏓 Pong!\n⏱️ Uptime: ${formatUptime(Math.floor((Date.now() - startedAt) / 1000))}` }, { quoted: msg });
  }
  if (command === 'owner') {
    return sock.sendMessage(jid, { text: config.ownerNumber ? `👑 Owner: +${config.ownerNumber}` : 'Set OWNER_NUMBER in your .env file first.' }, { quoted: msg });
  }

  const ctx = await groupContext(sock, jid, sender);
  if (ctx.error) return sock.sendMessage(jid, { text: ctx.error }, { quoted: msg });

  if (command === 'groupinfo') {
    return sock.sendMessage(jid, {
      text: `📋 *${ctx.metadata.subject}*\n👥 Members: ${ctx.members.length}\n👑 Creator: ${ctx.metadata.owner || 'Not available'}\n🛡️ Bot admin: ${ctx.botAdmin ? 'Yes' : 'No'}`
    }, { quoted: msg });
  }

  const adminCommands = ['tagall', 'hidetag', 'kick', 'promote', 'demote', 'mute', 'unmute', 'linkgroup', 'antilink', 'welcome'];
  if (adminCommands.includes(command) && !ctx.senderAdmin && !isOwner) {
    return sock.sendMessage(jid, { text: '⛔ Only group admins can use this command.' }, { quoted: msg });
  }

  if (['kick', 'promote', 'demote'].includes(command)) {
    const target = targetFromMessage(msg);
    if (!target) return sock.sendMessage(jid, { text: `Reply to a member or mention them.\nExample: ${config.prefix}${command} @member` }, { quoted: msg });
    if (!ctx.botAdmin) return sock.sendMessage(jid, { text: '⚠️ Make FRED BOT a group admin first.' }, { quoted: msg });
    const action = command === 'kick' ? 'remove' : command;
    await sock.groupParticipantsUpdate(jid, [target], action);
    return sock.sendMessage(jid, { text: `✅ ${command} completed for @${phoneFromJid(target)}.`, mentions: [target] }, { quoted: msg });
  }

  if (command === 'tagall' || command === 'hidetag') {
    const participants = ctx.members.map(p => p.id);
    const body = arg || (command === 'tagall' ? 'Attention everyone!' : '📢 Group announcement');
    const mentions = command === 'tagall' ? participants : participants;
    const messageText = command === 'tagall'
      ? `${body}\n\n${participants.map(p => `• @${phoneFromJid(p)}`).join('\n')}`
      : body;
    return sock.sendMessage(jid, { text: messageText, mentions }, { quoted: msg });
  }

  if (command === 'mute' || command === 'unmute') {
    if (!ctx.botAdmin) return sock.sendMessage(jid, { text: '⚠️ Make FRED BOT a group admin first.' }, { quoted: msg });
    await sock.groupSettingUpdate(jid, command === 'mute' ? 'announcement' : 'not_announcement');
    return sock.sendMessage(jid, { text: command === 'mute' ? '🔇 Only admins can send messages now.' : '🔊 All members can send messages now.' }, { quoted: msg });
  }

  if (command === 'linkgroup') {
    if (!ctx.botAdmin) return sock.sendMessage(jid, { text: '⚠️ Make FRED BOT a group admin first.' }, { quoted: msg });
    const code = await sock.groupInviteCode(jid);
    return sock.sendMessage(jid, { text: `🔗 Group invite link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg });
  }

  if (command === 'antilink' || command === 'welcome') {
    const value = arg.toLowerCase();
    if (!['on', 'off'].includes(value)) return sock.sendMessage(jid, { text: `Usage: ${config.prefix}${command} on/off` }, { quoted: msg });
    const settings = groupSettings(jid);
    settings[command] = value === 'on';
    saveStore();
    return sock.sendMessage(jid, { text: `✅ ${command} is now ${value.toUpperCase()}.` }, { quoted: msg });
  }

  if (command === 'sticker') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const source = quoted ? { key: { ...msg.key, id: msg.message.extendedTextMessage.contextInfo.stanzaId, participant: msg.message.extendedTextMessage.contextInfo.participant }, message: quoted } : msg;
    const hasMedia = source.message?.imageMessage || source.message?.videoMessage;
    if (!hasMedia) return sock.sendMessage(jid, { text: 'Reply to an image or short video with .sticker.' }, { quoted: msg });
    const buffer = await downloadMediaMessage(source, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
    const webp = await sharp(buffer, { animated: true }).resize(512, 512, { fit: 'inside' }).webp().toBuffer();
    return sock.sendMessage(jid, { sticker: webp }, { quoted: msg });
  }

  if (command === 'restart') {
    return sock.sendMessage(jid, { text: 'Restart the bot from its terminal using Ctrl+C, then run npm start again.' }, { quoted: msg });
  }

  return sock.sendMessage(jid, { text: `Unknown command. Type ${config.prefix}menu to see available commands.` }, { quoted: msg });
}
