<#
.SYNOPSIS
    Rollback Meridian MCN to the previous release on the VPS.

.DESCRIPTION
    Lists `releases/` on the VPS, lets you pick a target release, then
    flips the `current` symlink and restarts backend + frontend with that
    release's compose file.

.PARAMETER To
    Release id explicit, e.g. "2026-05-11_14-30-00_abc1234" or "_legacy".
    Bỏ trống để liệt kê các release có sẵn rồi chọn theo prompt.
#>
[CmdletBinding()]
param([string] $To = "")

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

$envFile = Join-Path $repoRoot ".deploy\release.env"
if (-not (Test-Path $envFile)) { Write-Host "ERR .deploy\release.env missing" -ForegroundColor Red; exit 1 }

$envMap = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') { $envMap[$Matches[1]] = $Matches[2] }
}
$env:SSH_HOST = $envMap['SSH_HOST']; $env:SSH_PORT = $envMap['SSH_PORT']
$env:SSH_USER = $envMap['SSH_USER']; $env:SSH_PASS = $envMap['SSH_PASS']
$deployDir = $envMap['REMOTE_DEPLOY_DIR']

Write-Host "==> Listing releases on $deployDir/releases/" -ForegroundColor Cyan
& python .deploy\ssh_exec.py "ls -1t $deployDir/releases/ 2>/dev/null && echo --- && readlink -f $deployDir/current 2>/dev/null"

if (-not $To) {
    $To = Read-Host "Enter release id to rollback to (e.g. _legacy)"
}
if (-not $To) { Write-Host "Aborted (no release id)" -ForegroundColor Yellow; exit 1 }

Write-Host "==> Rolling back to $To" -ForegroundColor Cyan
$cmd = @"
set -e
TARGET="$deployDir/releases/$To"
[[ -d "`$TARGET" ]] || { echo "ERR release `$TARGET not found"; exit 2; }
ln -sfn "`$TARGET" "$deployDir/current.new"
mv -Tf "$deployDir/current.new" "$deployDir/current"
cd "`$TARGET"
export COMPOSE_PROJECT_NAME="meridian-mcn"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend frontend
sleep 3
docker compose -f docker-compose.prod.yml ps
echo "rolled back to $To"
"@
& python .deploy\ssh_exec.py $cmd
if ($LASTEXITCODE -ne 0) { Write-Host "ERR rollback failed" -ForegroundColor Red; exit 1 }
Write-Host "OK Rollback complete." -ForegroundColor Green
