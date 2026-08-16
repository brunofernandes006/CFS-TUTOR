@echo off
title CFS Tutor - Iniciando...
echo.
echo  ===================================
echo   CFS Tutor - Missao Aprovacao
echo   Iniciando servidor...
echo  ===================================
echo.

cd /d "%~dp0"

:: Verificar se node esta disponivel
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale o Node.js e tente novamente.
    pause
    exit /b 1
)

:: Verificar se as dependencias estao instaladas
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

:: Iniciar em modo producao
echo [INFO] Iniciando em modo producao...
echo [INFO] O navegador abrirá automaticamente quando o servidor estiver pronto.
echo.

set "SERVER_STARTED=0"

:: Tentar producao em background
start /b npm run start >nul 2>&1

:: Aguardar servidor ficar disponivel (max 30s)
echo [INFO] Aguardando servidor...
set /a "COUNT=0"
:WAIT_LOOP_PROD
if %COUNT% geq 30 goto PROD_FAILED
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    set "SERVER_STARTED=1"
    goto OPEN_BROWSER
)
set /a "COUNT+=1"
goto WAIT_LOOP_PROD

:PROD_FAILED
echo [INFO] Modo producao indisponivel. Tentando modo desenvolvimento...
start /b npm run dev >nul 2>&1

set /a "COUNT=0"
:WAIT_LOOP_DEV
if %COUNT% geq 30 goto DEV_FAILED
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    set "SERVER_STARTED=1"
    goto OPEN_BROWSER
)
set /a "COUNT+=1"
goto WAIT_LOOP_DEV

:DEV_FAILED
echo [ERRO] Nao foi possivel iniciar o servidor.
pause
exit /b 1

:OPEN_BROWSER
echo [OK] Servidor pronto! Abrindo navegador...
start "" "http://localhost:3000"
echo.
echo [INFO] CFS Tutor rodando em http://localhost:3000
echo [INFO] Pressione Ctrl+C para encerrar.
echo.
:: Manter o script rodando
pause >nul
