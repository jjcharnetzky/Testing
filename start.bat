@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Brak Node.js. Zainstaluj wcześniej Node.js 24 LTS z oficjalnego instalatora.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo Brak gotowego buildu w folderze dist. Skopiuj kompletną paczkę offline.
  pause
  exit /b 1
)
start "" "http://localhost:4173"
node server.mjs
pause
