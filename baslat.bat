@echo off
title Sudeku Music Bot
:loop
echo ==============================================
echo Sudeku Music Premium Bot Baslatiliyor...
echo ==============================================
echo.
node src/index.js
echo.
echo Bot beklenmedik sekilde durdu. 5 saniye icinde yeniden baslatiliyor...
echo Kapatmak icin pencereyi kapatabilir veya CTRL+C tuslarina basabilirsiniz.
timeout /t 5 >nul
goto loop