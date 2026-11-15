import 'dotenv/config';

export const config = {
  name: process.env.BOT_NAME || 'FRED BOT',
  prefix: process.env.PREFIX || '.',
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/\D/g, ''),
  ownerOnly: (process.env.OWNER_ONLY || 'true').toLowerCase() === 'true'
};
