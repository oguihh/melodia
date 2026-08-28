@echo off
title MELODIA - Servidor Online + Aplicativo
color 0B

echo =======================================================
echo           INICIANDO SERVIDOR MELODIA ONLINE
echo =======================================================
echo.

:: 1. Iniciar o Servidor Backend na porta 3001
echo [1/3] Iniciando Servidor Backend...
start "MELODIA Server" cmd /k "npm run dev --prefix server"

timeout /t 3 /nobreak >nul

:: 2. Iniciar o Tunel Cloudflare (Link Publico para Amigos)
echo [2/3] Conectando ao Cloudflare Tunnel para acesso externo...
start "MELODIA Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://127.0.0.1:3001"

timeout /t 3 /nobreak >nul

:: 3. Iniciar o Aplicativo Desktop MELODIA
echo [3/3] Abrindo Aplicativo Desktop...
if exist "dist_electron\win-unpacked\MELODIA.exe" (
    start "" "dist_electron\win-unpacked\MELODIA.exe"
) else (
    start "MELODIA Desktop" cmd /k "npm run electron:dev --prefix client"
)

echo.
echo =======================================================
echo       TUDO PRONTO! O MELODIA ESTA RODANDO ONLINE.
echo  Veja a janela 'MELODIA Cloudflare Tunnel' para o link.
echo =======================================================
