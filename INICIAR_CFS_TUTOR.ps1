#Requires -Version 5.1
<#
.SYNOPSIS
    Inicia o CFS Tutor - Missao Aprovacao
.DESCRIPTION
    Verifica dependencias, inicia o servidor e abre o navegador quando pronto.
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "CFS Tutor - Iniciando..."

Write-Host ""
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host "   CFS Tutor - Missao Aprovacao" -ForegroundColor Yellow
Write-Host "   Iniciando servidor..." -ForegroundColor Cyan
Write-Host "  ===================================" -ForegroundColor Cyan
Write-Host ""

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

# Verificar Node.js
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "[OK] Node.js $nodeVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Node.js nao encontrado. Instale o Node.js e tente novamente." -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar dependencias." -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}

function Wait-ForServer {
    param([int]$MaxSeconds = 30)
    for ($i = 0; $i -lt $MaxSeconds; $i++) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) { return $true }
        } catch {
            # Servidor ainda nao pronto
        }
    }
    return $false
}

# Tentar modo producao
if (Test-Path ".next") {
    Write-Host "[INFO] Iniciando em modo producao..." -ForegroundColor Green
    $job = Start-Job -ScriptBlock {
        Set-Location $using:projectDir
        & npm run start
    }

    Write-Host "[INFO] Aguardando servidor (max 30s)..." -ForegroundColor Cyan
    $ready = Wait-ForServer -MaxSeconds 30

    if ($ready) {
        Write-Host "[OK] Servidor pronto! Abrindo navegador..." -ForegroundColor Green
        Start-Process "http://localhost:3000"
        Write-Host ""
        Write-Host "[INFO] CFS Tutor rodando em http://localhost:3000" -ForegroundColor Green
        Write-Host "[INFO] Pressione Ctrl+C para encerrar." -ForegroundColor Yellow
        # Manter script rodando
        try { Wait-Job $job -Timeout 86400 } finally { Stop-Job $job -ErrorAction SilentlyContinue }
    } else {
        Write-Host "[INFO] Modo producao indisponivel. Tentando desenvolvimento..." -ForegroundColor Yellow
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -Force -ErrorAction SilentlyContinue

        & npm run dev
        $ready = Wait-ForServer -MaxSeconds 30
        if ($ready) {
            Start-Process "http://localhost:3000"
            Write-Host "[OK] Servidor pronto! Acesse http://localhost:3000" -ForegroundColor Green
        } else {
            Write-Host "[ERRO] Nao foi possivel iniciar o servidor." -ForegroundColor Red
        }
    }
} else {
    Write-Host "[INFO] Build nao encontrado. Iniciando em modo desenvolvimento..." -ForegroundColor Yellow
    $job = Start-Job -ScriptBlock {
        Set-Location $using:projectDir
        & npm run dev
    }

    Write-Host "[INFO] Aguardando servidor (max 30s)..." -ForegroundColor Cyan
    $ready = Wait-ForServer -MaxSeconds 30

    if ($ready) {
        Write-Host "[OK] Servidor pronto! Abrindo navegador..." -ForegroundColor Green
        Start-Process "http://localhost:3000"
        Write-Host ""
        Write-Host "[INFO] CFS Tutor rodando em http://localhost:3000" -ForegroundColor Green
        Write-Host "[INFO] Pressione Ctrl+C para encerrar." -ForegroundColor Yellow
        try { Wait-Job $job -Timeout 86400 } finally { Stop-Job $job -ErrorAction SilentlyContinue }
    } else {
        Write-Host "[ERRO] Nao foi possivel iniciar o servidor." -ForegroundColor Red
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -Force -ErrorAction SilentlyContinue
    }
}
