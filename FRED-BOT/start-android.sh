#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -d node_modules ]; then npm install; fi
npm start
