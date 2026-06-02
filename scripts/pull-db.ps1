<#
.SYNOPSIS
    Pull database from host VPS to local container.

.DESCRIPTION
    1. SSH to VPS -> pg_dump inside remote postgres container -> download dump
    2. Restore into local container (meridian-postgres-v6)
    3. Cleanup temp files

.PARAMETER KeepDump   Keep local .dump file after restore.
.PARAMETER DumpOnly   Download dump only, skip restore.
.PARAMETER PullUploads  Also sync uploads/ folder from VPS to backend/uploads/.
.PARAMETER Env        Environment to pull from: "prod" or "staging" (default: "prod").

.EXAMPLE
    .\scripts\pull-db.ps1
    .\scripts\pull-db.ps1 -Env staging
    .\scripts\pull-db.ps1 -Env prod -DumpOnly
    .\scripts\pull-db.ps1 -KeepDump
    .\scripts\pull-db.ps1 -Env staging -PullUploads
#>

[CmdletBinding()]
param(
    [switch] $KeepDump,
    [switch] $DumpOnly,
    [switch] $PullUploads,
    [ValidateSet("prod","staging")][string] $Env = "staging"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path

function Write-Step ($m) { Write-Host "" ; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok   ($m) { Write-Host "    OK  $m" -ForegroundColor Green }
function Write-Warn ($m) { Write-Host "    !!  $m" -ForegroundColor Yellow }
function Die        ($m) { Write-Host "ERR $m" -ForegroundColor Red; exit 1 }

# Load .deploy/envs/<Env>.env (or legacy .deploy/release.env)
$envFile = Join-Path $repoRoot ".deploy\envs\$Env.env"
if (-not (Test-Path $envFile)) {
    $legacyFile = Join-Path $repoRoot ".deploy\release.env"
    if (Test-Path $legacyFile) {
        Write-Warn ".deploy\envs\$Env.env not found -- using legacy .deploy\release.env"
        $envFile = $legacyFile
    } else {
        Die ".deploy\envs\$Env.env not found. Create from .deploy\envs\env.example"
    }
}

$cfg = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') { $cfg[$Matches[1]] = $Matches[2] }
}
foreach ($k in @('SSH_HOST','SSH_PORT','SSH_USER','SSH_PASS','REMOTE_DEPLOY_DIR')) {
    if (-not $cfg[$k]) { Die "Missing $k in release.env" }
}

# Params
$timestamp      = Get-Date -Format 'yyyyMMdd_HHmm'
$remoteDumpPath = "/tmp/pull_db_$timestamp.dump"
$localDumpDir   = Join-Path $repoRoot ".deploy"
$localDumpPath  = Join-Path $localDumpDir "pull_db_$timestamp.dump"

$localContainer  = "meridian-postgres-v6"
$localDb         = "meridian"
$localUser       = "meridian"
$localPass       = "Meridian@2026"
$remotePgCont    = if ($cfg['REMOTE_PG_CONTAINER']) { $cfg['REMOTE_PG_CONTAINER'] } else { "meridian-postgres" }
$remoteEnvFile   = "$($cfg['REMOTE_DEPLOY_DIR'])/.env.prod"

Write-Host ""
Write-Host "=== Pull DB: $Env -> local ===" -ForegroundColor Magenta
Write-Host "  Host      : $($cfg['SSH_HOST']):$($cfg['SSH_PORT'])"
Write-Host "  Remote PG : $remotePgCont"
Write-Host "  Local PG  : $localContainer ($localDb)"
Write-Host ""

# Python helper lives at .deploy/_pull_db_helper.py (version-controlled separately)
$pyFile = Join-Path $repoRoot ".deploy\_pull_db_helper.py"
if (-not (Test-Path $pyFile)) { Die ".deploy\_pull_db_helper.py not found" }

$env:_PDB_HOST = $cfg['SSH_HOST']
$env:_PDB_PORT = $cfg['SSH_PORT']
$env:_PDB_USER = $cfg['SSH_USER']
$env:_PDB_PASS = if ($cfg['SSH_PASS'])     { $cfg['SSH_PASS'] }     else { "" }
$env:_PDB_KEY  = if ($cfg['SSH_KEY_FILE']) { $cfg['SSH_KEY_FILE'] } else { "" }

function RunPy ([string[]] $PyArgs) {
    & python $pyFile @PyArgs
    if ($LASTEXITCODE -ne 0) { Die "Step failed (exit=$LASTEXITCODE)" }
}

# Step 1 - remote pg_dump
Write-Step "Step 1/5 - pg_dump on VPS"
RunPy "dump", $remoteDumpPath, $remotePgCont, $remoteEnvFile
Write-Ok "Dump created on VPS: $remoteDumpPath"

# Step 2 - download
Write-Step "Step 2/5 - Download dump"
New-Item -ItemType Directory -Force -Path $localDumpDir | Out-Null
RunPy "download", $remoteDumpPath, $localDumpPath
Write-Ok "Downloaded: $localDumpPath"

# Step 3 - cleanup remote
Write-Step "Step 3/5 - Remove remote temp file"
RunPy "cleanup", $remoteDumpPath
Write-Ok "Remote temp removed"

if ($DumpOnly) {
    Write-Host ""
    Write-Host "DumpOnly mode -- skipping restore" -ForegroundColor Yellow
    Write-Host "  Dump file: $localDumpPath"
    exit 0
}

# Step 4 - check local container
Write-Step "Step 4/5 - Check local container"
$running = docker inspect --format="{{.State.Running}}" $localContainer 2>$null
if ($running -ne "true") {
    Write-Warn "$localContainer not running -- starting..."
    & docker compose -f "$repoRoot\docker-compose.yml" up postgres -d 2>&1 | Out-Null
    Start-Sleep -Seconds 6
    Write-Ok "Container started"
} else {
    Write-Ok "$localContainer is running"
}

# Step 5 - restore
Write-Step "Step 5/5 - Restore database"
Write-Warn "This will DROP all local data in '$localDb' and replace with host data!"
$confirm = Read-Host "  Type 'yes' to continue"
if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    if (-not $KeepDump) { Remove-Item $localDumpPath -Force -ErrorAction SilentlyContinue }
    exit 0
}

# Copy dump into container
& docker cp $localDumpPath "${localContainer}:/tmp/pull_db.dump"
if ($LASTEXITCODE -ne 0) { Die "docker cp failed" }

# Terminate connections then drop+recreate DB
$sqlDrop = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$localDb' AND pid != pg_backend_pid(); DROP DATABASE IF EXISTS $localDb; CREATE DATABASE $localDb OWNER $localUser;"
& docker exec -e "PGPASSWORD=$localPass" $localContainer `
    psql -U $localUser -d postgres -c $sqlDrop
if ($LASTEXITCODE -ne 0) { Die "Drop/recreate database failed" }

# Restore
Write-Host "  Restoring..."
& docker exec -e "PGPASSWORD=$localPass" $localContainer `
    pg_restore -U $localUser -d $localDb --no-owner -v /tmp/pull_db.dump 2>&1 `
    | Where-Object { $_ -notmatch "pg_restore: warning" } `
    | ForEach-Object { Write-Host "  $_" }

if ($LASTEXITCODE -gt 1) {
    Write-Warn "pg_restore finished with warnings (exit=$LASTEXITCODE) -- usually safe, check the app"
} else {
    Write-Ok "Restore successful"
}

# Cleanup
& docker exec $localContainer rm -f /tmp/pull_db.dump 2>$null
if (-not $KeepDump) {
    Remove-Item $localDumpPath -Force -ErrorAction SilentlyContinue
    Write-Ok "Local dump file removed"
} else {
    Write-Ok "Dump kept at: $localDumpPath"
}

Write-Host ""
Write-Host "=== DONE -- Local DB synced from host ===" -ForegroundColor Green
Write-Host "  Connect: localhost:5433  DB: $localDb  User: $localUser  Pass: $localPass"
Write-Host ""

# Optional: sync uploads folder from VPS
if ($PullUploads) {
    Write-Step "Bonus — Sync uploads from VPS"
    $remoteUploads = "$($cfg['REMOTE_DEPLOY_DIR'])/current/uploads"
    $localUploads  = Join-Path $repoRoot "backend\uploads"
    Write-Host "  Remote: $remoteUploads" -ForegroundColor DarkGray
    Write-Host "  Local : $localUploads"  -ForegroundColor DarkGray
    RunPy "download_dir", $remoteUploads, $localUploads
    Write-Ok "Uploads synced to: $localUploads"
    Write-Host ""
}
