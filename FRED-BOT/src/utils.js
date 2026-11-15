export function getText(message) {
  const m = message.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  ).trim();
}

export function getMentioned(message) {
  const m = message.message || {};
  return m.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

export function getQuotedParticipant(message) {
  const m = message.message || {};
  return m.extendedTextMessage?.contextInfo?.participant || null;
}

export function phoneFromJid(jid = '') {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function isUrl(text) {
  return /(https?:\/\/|www\.)\S+/i.test(text);
}

export function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
