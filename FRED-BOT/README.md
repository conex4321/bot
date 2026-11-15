# FRED BOT — WhatsApp Multifunction Bot

A starter WhatsApp group assistant built with Node.js and Baileys.

## Included commands

| Command | What it does |
|---|---|
| `.menu` | Show the command menu |
| `.ping` | Check bot response and uptime |
| `.owner` | Show configured owner number |
| `.groupinfo` | Show group information |
| `.tagall [message]` | Mention all group members |
| `.hidetag [message]` | Send a message with hidden mentions |
| `.kick` | Remove a replied-to/mentioned member |
| `.promote` / `.demote` | Change a member's admin status |
| `.mute` / `.unmute` | Restrict/restore member messaging |
| `.linkgroup` | Get the group invite link |
| `.antilink on/off` | Delete links from non-admin members |
| `.welcome on/off` | Toggle welcome messages |
| `.sticker` | Convert a replied-to image/short video to a sticker |

The bot must be made a group admin for moderation commands. Commands are restricted to group admins, except public utility commands.

## Requirements

- Node.js 20 or newer (use the current LTS release).
- Internet connection.
- A WhatsApp account to link as the bot.
- Windows PowerShell or Android Termux.

## Windows setup

1. Install Node.js LTS from https://nodejs.org/en/download/
2. Extract this project ZIP.
3. Open PowerShell in the `FRED-BOT` folder.
4. Run:

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm start
```

5. In `.env`, set `OWNER_NUMBER` to your number with country code and digits only. Example format for Kenya: `2547XXXXXXXX`.
6. Scan the QR printed in PowerShell: WhatsApp → Linked devices → Link a device.
7. Send `.menu` to the linked WhatsApp account or in a group where the bot is a member.

## Android setup (Termux)

1. Install Termux from its official F-Droid/GitHub source, not an unofficial APK mirror.
2. Open Termux and run:

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git unzip -y
termux-setup-storage
```

3. Copy the ZIP into Downloads, then:

```bash
cd ~/storage/downloads
unzip FRED-BOT.zip
cd FRED-BOT
cp .env.example .env
nano .env
npm install
npm start
```

4. Scan the QR from WhatsApp → Linked devices → Link a device.

Keep Termux open while the bot runs. Android may stop background processes to save battery; disable battery optimization for Termux if appropriate. A phone is not a reliable 24/7 host.

## Important security notes

- Never share the `auth_info/` folder, QR code, pairing code, or `.env` file. Anyone with session credentials may control the linked WhatsApp account.
- Keep `OWNER_NUMBER` private and correct.
- Do not use the bot for spam, unsolicited bulk messages, harassment, or scraping.
- Baileys is an unofficial WhatsApp Web client, not an official WhatsApp product. Use at your own risk and check WhatsApp's current terms.
- Free cloud hosts often delete local files or sleep. WhatsApp session credentials need persistent private storage. Do not deploy to ephemeral storage without a secure persistent volume.

## Configuration

Edit `.env`:

```env
OWNER_NUMBER=2547XXXXXXXX
BOT_NAME=FRED BOT
PREFIX=.
OWNER_ONLY=true
```

After changing `.env`, restart the bot.

## Project structure

```text
FRED-BOT/
├── src/
│   ├── commands/handler.js
│   ├── config.js
│   ├── index.js
│   ├── store.js
│   └── utils.js
├── data/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting

- **QR does not appear:** confirm internet access, stop with Ctrl+C, then run `npm start` again.
- **Bot says it is not an admin:** promote the linked WhatsApp account to group admin.
- **Commands do not respond:** check the prefix in `.env`; default is `.`. Try `.ping`.
- **Pairing expired/logged out:** stop the bot, remove `auth_info/`, restart and scan a new QR.
- **Sticker command fails:** try a normal image first; very large videos may exceed memory limits.
- **Reconnect loop:** update dependencies only after checking the Baileys migration notes; keep a backup of `auth_info/`.

## Next development stages

This is a working starter, not a clone of every feature shown in the reference screenshot. AI chat, media downloading, a web dashboard, persistent cloud hosting, and advanced anti-spam/anti-toxic moderation require additional integrations and testing.
