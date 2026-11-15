import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve('data');
const file = path.join(dataDir, 'settings.json');

const defaults = { groups: {} };

export function loadStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return structuredClone(defaults);
  }
}

export const store = loadStore();

export function saveStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
}

export function groupSettings(jid) {
  store.groups[jid] ??= { antilink: false, welcome: true, warnings: {} };
  return store.groups[jid];
}
