@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Na komputerze-serwerze zainstaluj wcześniej Node.js 24 LTS.
  echo Na pozostałych komputerach wystarczy przeglądarka Edge lub Chrome.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo Brak buildu. Rozpakuj kompletną paczkę Generator-etykiet-LAN.zip.
  pause
  exit /b 1
)
set "LABEL_HOST=0.0.0.0"
set "LABEL_PORT=4173"
echo Generator etykiet - serwer firmowej sieci LAN
if defined LABEL_TLS_CERT (
  echo Tryb HTTPS: używane będą skonfigurowane certyfikat i klucz.
) else (
  echo Tryb HTTP: edycja i eksport PDF w sieci lokalnej.
  echo Tryb offline na stacjach LAN wymaga HTTPS. Szczegóły: SIEC-FIRMOWA.md.
)
echo Serwer pokaże poniżej adresy do otwarcia na pozostałych komputerach.
echo Jeśli Zapora Windows zapyta, zezwól na dostęp w sieci prywatnej/domenowej.
echo Nie zamykaj tego okna podczas pracy użytkowników.
echo.
node server.mjs
pause
