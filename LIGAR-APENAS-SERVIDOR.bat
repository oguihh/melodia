@echo off
title MELODIA - Servidor Dedicado Online
color 0A

echo =======================================================
echo         INICIANDO SERVIDOR DEDICADO MELODIA
echo =======================================================
echo.

:: 1. Iniciar o Servidor Backend
echo [1/2] Iniciando Servidor Backend...
start "MELODIA Server" cmd /k "npm run dev --prefix server"

timeout /t 3 /nobreak >nul

:: 2. Iniciar o Tunel Cloudflare
echo [2/2] Gerando link publico Cloudflare...
start "MELODIA Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://127.0.0.1:3001"

echo.
echo =======================================================
echo  Servidor ativo! Copie o link da janela do Cloudflare
echo  para enviar aos seus amigos.
echo =======================================================
