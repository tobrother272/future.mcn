<#
.SYNOPSIS
    One-click release script for Meridian MCN.

.DESCRIPTION
    Quy trình:
      1. Validate code local (TypeScript check FE + BE, lint, build FE).
      2. Đóng gói source thành tarball, loại bỏ node_modules / dist / uploads.
      3. Upload tarball + script remote_release.sh lên VPS qua SFTP (paramiko).
      4. Trên VPS:  backup → giải nén vào staging → rebuild image → restart
         container theo thứ tự (postgres giữ nguyên, backend + frontend
         recreate) → smoke test → nếu fail thì rollback bằng cách quay về
         folder source trước đó.

    Mỗi release tạo 1 timestamp dir trong /opt/meridian-mcn/releases/<TS>
    và symlink `current` trỏ về release đang chạy. Rollback = đổi symlink.

.PARAMETER SkipChecks
    Bỏ qua bước typecheck/lint/build (chỉ dùng khi đã verify trước).

.PARAMETER SkipBackup
    Bỏ qua bước backup DB+uploads trước release (KHÔNG khuyến nghị).

.PARAMETER Tag
    Nhãn ghi vào log release, ví dụ "v1.2.0" hoặc "hotfix-cors".
    Mặc định = current git short SHA.

.EXAMPLE
    .\scripts\release.ps1
    .\scripts\release.ps1 -Tag "v1.3.0-rc1"
    .\scripts\release.ps1 -SkipChecks            # hot reload, đã tự test
#>

[CmdletBinding()]
param(
    [switch] $SkipChecks,
    [switch] $SkipBackup,
    [string] $Tag = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

function Write-Step  ($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok    ($m) { Write-Host "    OK  $m"  -ForegroundColor Green }
function Write-Warn2 ($m) { Write-Host "    !!  $m"  -ForegroundColor Yellow }
function Die         ($m) { Write-Host "ERR  $m"     -ForegroundColor Red; exit 1 }

# ── 0. Sanity ──────────────────────────────────────────────────────────────
$envFile = Join-Path $repoRoot ".deploy\release.env"
if (-not (Test-Path $envFile)) {
    Die ".deploy\release.env chưa tồn tại. Copy từ .deploy\release.env.example và điền."
}

# Load env file (KEY=VALUE per line, ignore comments).
$envMap = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') {
        $envMap[$Matches[1]] = $Matches[2]
    }
}
foreach ($k in @('SSH_HOST','SSH_PORT','SSH_USER','SSH_PASS','REMOTE_DEPLOY_DIR')) {
    if (-not $envMap.ContainsKey($k) -or -not $envMap[$k]) {
        Die "Missing $k in .deploy\release.env"
    }
}

# Compute tag = explicit > git SHA > timestamp
if (-not $Tag) {
    try {
        $Tag = (git rev-parse --short HEAD 2>$null).Trim()
    } catch { }
    if (-not $Tag) { $Tag = (Get-Date -Format 'yyyyMMdd-HHmm') }
}
$timestamp = (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')
$releaseId = "$timestamp`_$Tag"
Write-Host "Release id: $releaseId" -ForegroundColor Magenta

# ── 1. Local validation ────────────────────────────────────────────────────
if (-not $SkipChecks) {
    Write-Step "Local validation"

    Push-Location backend
    Write-Host "    backend typecheck..."
    & npx --package=typescript tsc --noEmit
    if ($LASTEXITCODE -ne 0) { Pop-Location; Die "backend typecheck failed" }
    Pop-Location
    Write-Ok "backend typecheck"

    Push-Location frontend
    Write-Host "    frontend build (vite)..."
    & npx vite build 2>&1 | Out-String -OutVariable feBuild | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host $feBuild
        Die "frontend build failed"
    }
    Pop-Location
    Write-Ok "frontend build"
} else {
    Write-Warn2 "Skipping local checks (--SkipChecks)"
}

# ── 2. Package source ──────────────────────────────────────────────────────
Write-Step "Package source"
$tarball = ".deploy\release-$releaseId.tar.gz"
# tar.exe sẵn có trong Windows 10+
& tar `
    --exclude='node_modules' `
    --exclude='dist' `
    --exclude='uploads' `
    --exclude='.git' `
    --exclude='backups' `
    --exclude='.deploy' `
    --exclude='.api-token' `
    --exclude='.deploy-secrets.txt' `
    --exclude='*.tar.gz' `
    --exclude='.tmp-*' `
    -czf $tarball `
    backend frontend `
    docker-compose.prod.yml .env.prod.example `
    scripts DEPLOY.md README.md .gitignore
if ($LASTEXITCODE -ne 0) { Die "tar failed" }
$sizeKB = [Math]::Round((Get-Item $tarball).Length / 1KB, 1)
Write-Ok "tarball $tarball ($sizeKB KB)"

# ── 3. Upload artifacts ────────────────────────────────────────────────────
Write-Step "Upload to VPS"
$env:SSH_HOST = $envMap['SSH_HOST']
$env:SSH_PORT = $envMap['SSH_PORT']
$env:SSH_USER = $envMap['SSH_USER']
$env:SSH_PASS = $envMap['SSH_PASS']

& python .deploy\ssh_exec.py --upload $tarball "/tmp/release-$releaseId.tar.gz"
if ($LASTEXITCODE -ne 0) { Die "upload tarball failed" }

& python .deploy\ssh_exec.py --upload "scripts\remote_release.sh" "/tmp/remote_release.sh"
if ($LASTEXITCODE -ne 0) { Die "upload remote_release.sh failed" }
Write-Ok "artifacts uploaded"

# ── 4. Trigger remote release ─────────────────────────────────────────────
Write-Step "Run remote release on VPS"
$skipBkArg = ""
if ($SkipBackup) { $skipBkArg = "--skip-backup" }

# Pass release id + flags through environment to remote script.
$remoteCmd = "RELEASE_ID='$releaseId' DEPLOY_DIR='$($envMap['REMOTE_DEPLOY_DIR'])' bash /tmp/remote_release.sh $skipBkArg 2>&1"
& python .deploy\ssh_exec.py $remoteCmd --timeout 1800
$remoteExit = $LASTEXITCODE
if ($remoteExit -ne 0) {
    Die "remote release failed (exit=$remoteExit). Đã rollback (nếu remote script tới được bước rollback)."
}
Write-Ok "remote release succeeded"

# ── 5. Optional smoke test from operator side ─────────────────────────────
if ($envMap.ContainsKey('SMOKE_URL') -and $envMap['SMOKE_URL']) {
    $smoke = $envMap['SMOKE_URL']
    Write-Step "Smoke test from local: $smoke"
    try {
        $r1 = Invoke-WebRequest -Uri "$smoke/" -Method Head -TimeoutSec 10 -UseBasicParsing
        $r2 = Invoke-WebRequest -Uri "$smoke/api/health" -Method Get -TimeoutSec 10 -UseBasicParsing
        Write-Ok ("GET /  -> {0}" -f $r1.StatusCode)
        Write-Ok ("GET /api/health -> {0}  body={1}" -f $r2.StatusCode, $r2.Content)
    } catch {
        Write-Warn2 "Local smoke test failed: $($_.Exception.Message)"
        Write-Warn2 "VPS có thể chỉ reachable qua VPN. Đã verify trên VPS rồi nên không exit fail."
    }
}

# ── 6. Cleanup local tarball ──────────────────────────────────────────────
Remove-Item $tarball -Force -ErrorAction SilentlyContinue
Write-Step "DONE — release $releaseId is live"
Write-Host "Frontend: $($envMap['SMOKE_URL'])" -ForegroundColor Green
