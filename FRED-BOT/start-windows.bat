@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env
if not exist node_modules (
  echo Installing FRED BOT dependencies...
  npm install
)
npm start
pause
