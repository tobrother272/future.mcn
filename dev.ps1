# Meridian MCN - Dev Start Script
# PostgreSQL : Docker (meridian-postgres-v6, port 5433)
# Backend    : npm run dev:v6  (localhost:4000)
# Frontend   : npm run dev     (localhost:5173)

$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host ""
Write-Host "=== Meridian MCN - Dev Mode ===" -ForegroundColor Cyan

# 1. Start postgres container
Write-Host ""
Write-Host "[1/3] Starting PostgreSQL (Docker)..." -ForegroundColor Yellow

docker compose -f "$Root\docker-compose.yml" up postgres -d 2>&1 | Out-Null

$attempts = 0
do {
    Start-Sleep -Seconds 2
    $health = (docker inspect --format="{{.State.Health.Status}}" meridian-postgres-v6 2>$null)
    $attempts++
    Write-Host "      postgres: $health ($attempts/15)"
} while ($health -ne "healthy" -and $attempts -lt 15)

if ($health -ne "healthy") {
    Write-Host "      [WARN] postgres not healthy after 30s, continuing..." -ForegroundColor DarkYellow
} else {
    Write-Host "      postgres ready!" -ForegroundColor Green
}

# 2. Start Backend
Write-Host ""
Write-Host "[2/3] Starting Backend (port 4000)..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Backend'; Write-Host '--- BACKEND ---' -ForegroundColor Cyan; npm run dev:v6"

Start-Sleep -Seconds 2

# 3. Start Frontend
Write-Host ""
Write-Host "[3/3] Starting Frontend (port 5173)..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Frontend'; Write-Host '--- FRONTEND ---' -ForegroundColor Cyan; npm run dev"

# Done
Write-Host ""
Write-Host "=== All services started ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend   : http://localhost:4000" -ForegroundColor White
Write-Host "  PostgreSQL: localhost:5433"        -ForegroundColor White
Write-Host ""
