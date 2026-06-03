@echo off
cd /d "%~dp0"
title Sude Cognitive AI Engine v2.1.0

if not exist node_modules (
  echo [SYSTEM] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed!
    pause
    exit /b 1
  )
)

set ADMIN_PANEL=true
if "%ADMIN_HOST%"=="" set ADMIN_HOST=127.0.0.1
if "%ADMIN_PORT%"=="" set ADMIN_PORT=3030
if "%ADMIN_TOKEN%"=="" set ADMIN_TOKEN=change-me

echo =================================================================
echo [SYSTEM] Starting Sude Cognitive AI Engine...
echo [PANEL] Control Center: http://%ADMIN_HOST%:%ADMIN_PORT%?token=%ADMIN_TOKEN%
echo =================================================================
start "" "http://%ADMIN_HOST%:%ADMIN_PORT%?token=%ADMIN_TOKEN%"

call npm start
pause
