<#
.SYNOPSIS
    First-time setup for a fresh VPS (staging or prod).

.DESCRIPTION
    Runs over SSH (via paramiko) to:
      1. Install Docker Engine + Docker Compose plugin (Debian/Ubuntu).
      2. Create deploy directory and backup directory.
      3. Upload .env.prod (or example template) to the VPS.
      4. Verify Docker works.

    After this script completes, run:  .\scripts\release.ps1 -Env <env>

.PARAMETER Env
    Which environment to set up: "prod" or "staging" (default: "staging").

.PARAMETER EnvProdFile
    Path to a local .env.prod file to upload to the VPS.
    If omitted, uploads .env.prod.example as a template (edit on VPS before release).

.EXAMPLE
    .\scripts\setup-vps.ps1 -Env staging -EnvProdFile .\.env.staging.prod
    .\scripts\setup-vps.ps1 -Env staging
#>

[CmdletBinding()]
param(
    [ValidateSet("prod","staging")][string] $Env     = "staging",
    [string]                                $EnvProdFile = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path

function Write-Step ($m) { Write-Host "" ; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok   ($m) { Write-Host "    OK  $m" -ForegroundColor Green }
function Write-Warn ($m) { Write-Host "    !!  $m" -ForegroundColor Yellow }
function Die        ($m) { Write-Host "ERR $m" -ForegroundColor Red; exit 1 }

# ── Load env config ───────────────────────────────────────────────
$cfgFile = Join-Path $repoRoot ".deploy\envs\$Env.env"
if (-not (Test-Path $cfgFile)) { Die ".deploy\envs\$Env.env not found" }

$cfg = @{}
Get-Content $cfgFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') { $cfg[$Matches[1]] = $Matches[2] }
}
foreach ($k in @('SSH_HOST','SSH_PORT','SSH_USER','SSH_PASS','REMOTE_DEPLOY_DIR')) {
    if (-not $cfg[$k]) { Die "Missing $k in $cfgFile" }
}

$deployDir = $cfg['REMOTE_DEPLOY_DIR']
$backupDir = "/var/backups/meridian"
$sshInfo   = "$($cfg['SSH_USER'])@$($cfg['SSH_HOST']) -p $($cfg['SSH_PORT'])"

# ── Resolve local .env.prod ───────────────────────────────────────
$localEnvProd   = ""
$uploadTemplate = $false
if ($EnvProdFile) {
    $localEnvProd = (Resolve-Path $EnvProdFile -ErrorAction Stop).Path
} else {
    $examplePath = Join-Path $repoRoot ".env.prod.example"
    if (Test-Path $examplePath) {
        $localEnvProd   = $examplePath
        $uploadTemplate = $true
    }
}

Write-Host ""
Write-Host "=== VPS First-Time Setup: $Env ===" -ForegroundColor Magenta
Write-Host "  Host      : $($cfg['SSH_HOST']):$($cfg['SSH_PORT'])"
Write-Host "  DeployDir : $deployDir"
$envLabel = if ($uploadTemplate) { "$localEnvProd (TEMPLATE)" } else { $localEnvProd }
Write-Host "  .env.prod : $envLabel"
Write-Host ""

# ── Write Python helper ───────────────────────────────────────────
$pyFile = Join-Path $repoRoot ".deploy\_setup_vps_helper.py"

$helper = @'
import sys, os, paramiko

host   = os.environ["_SVH_HOST"]
port   = int(os.environ["_SVH_PORT"])
user   = os.environ["_SVH_USER"]
passwd = os.environ.get("_SVH_PASS", "")
key_file = os.environ.get("_SVH_KEY", "")

action = sys.argv[1]

def make_client():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    key_paths = []
    if key_file:
        key_paths.append(os.path.expandvars(os.path.expanduser(key_file)))
    home = os.path.expanduser("~")
    for name in ("id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"):
        p = os.path.join(home, ".ssh", name)
        if os.path.exists(p): key_paths.append(p)
    last_err = None
    for kp in key_paths:
        try:
            c.connect(host, port=port, username=user, key_filename=kp, timeout=30,
                      look_for_keys=False, allow_agent=False)
            print("  [SSH] connected via key: " + kp); return c
        except Exception as e: last_err = e
    if passwd:
        try:
            c.connect(host, port=port, username=user, password=passwd, timeout=30,
                      look_for_keys=False, allow_agent=False)
            print("  [SSH] connected via password"); return c
        except Exception as e: last_err = e
    raise RuntimeError("SSH auth failed: %s" % last_err)

client = make_client()

def run_stream(cmd):
    transport = client.get_transport()
    chan = transport.open_session()
    chan.set_combine_stderr(True)
    chan.exec_command(cmd)
    for chunk in iter(lambda: chan.recv(4096), b""):
        print(chunk.decode("utf-8", errors="replace"), end="", flush=True)
    rc = chan.recv_exit_status()
    if rc != 0:
        print("\nFailed (exit=%d)" % rc, file=sys.stderr)
        sys.exit(rc)

def run_quiet(cmd, check=True):
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    rc  = stdout.channel.recv_exit_status()
    if err and rc != 0: print(err, file=sys.stderr)
    if check and rc != 0: sys.exit(rc)
    return out

if action == "setup":
    script_path = sys.argv[2]
    sftp = client.open_sftp()
    sftp.put(script_path, "/tmp/_vps_setup.sh")
    sftp.chmod("/tmp/_vps_setup.sh", 0o755)
    sftp.close()
    run_stream("bash /tmp/_vps_setup.sh")
    run_quiet("rm -f /tmp/_vps_setup.sh", check=False)

elif action == "upload_env":
    local_path  = sys.argv[2]
    remote_path = sys.argv[3]
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.chmod(remote_path, 0o600)
    sftp.close()
    print("Uploaded: %s -> %s" % (local_path, remote_path))

elif action == "check_env":
    deploy_dir = sys.argv[2]
    out = run_quiet("cat %s/.env.prod 2>/dev/null | grep -c CHANGE_ME || true" % deploy_dir)
    count = int(out.strip()) if out.strip().isdigit() else 0
    if count > 0:
        print("WARNING: %d CHANGE_ME placeholder(s) still in .env.prod!" % count, file=sys.stderr)
        sys.exit(2)
    else:
        print(".env.prod looks configured (no CHANGE_ME found)")

client.close()
'@
$helper | Set-Content $pyFile -Encoding UTF8

# ── Write setup bash to a temp file ──────────────────────────────
# (avoids any quoting issues passing the bash script as a CLI argument)
$bashScript = @"
#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$deployDir"
BACKUP_DIR="$backupDir"

step() { printf '\n\033[1;36m>>> %s\033[0m\n' "`$*"; }
ok()   { printf '\033[1;32m   OK %s\033[0m\n' "`$*"; }
warn() { printf '\033[1;33m   !! %s\033[0m\n' "`$*"; }

step "OS info"
lsb_release -d 2>/dev/null || grep PRETTY_NAME /etc/os-release || true
uname -r

step "Check / install Docker"
if command -v docker >/dev/null 2>&1; then
    ok "Docker already installed: `$(docker --version)"
else
    warn "Docker not found -- installing via get.docker.com"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    ok "Docker installed: `$(docker --version)"
fi

if docker compose version >/dev/null 2>&1; then
    ok "Docker Compose: `$(docker compose version)"
else
    warn "Docker Compose plugin not found -- trying apt"
    apt-get install -y docker-compose-plugin 2>/dev/null \
        || apt-get install -y docker-compose 2>/dev/null \
        || warn "Could not auto-install docker-compose-plugin -- check manually"
fi

step "Create directories"
mkdir -p "`${DEPLOY_DIR}/releases"
mkdir -p "`${BACKUP_DIR}"
chmod 700 "`${DEPLOY_DIR}"
ok "`${DEPLOY_DIR}"
ok "`${BACKUP_DIR}"

step "Docker sanity check"
if docker run --rm hello-world 2>&1 | grep -q "Hello from Docker"; then
    ok "Docker runtime OK"
else
    warn "hello-world test failed -- Docker may need a restart"
fi

step "Setup complete"
echo ""
echo "  Deploy dir : `${DEPLOY_DIR}"
echo "  Backup dir : `${BACKUP_DIR}"
echo ""
echo "NEXT: edit `${DEPLOY_DIR}/.env.prod then run release."
"@

$bashTmp = Join-Path $repoRoot ".deploy\_setup_vps.sh"
$bashScript | Set-Content $bashTmp -Encoding UTF8

$env:_SVH_HOST = $cfg['SSH_HOST']
$env:_SVH_PORT = $cfg['SSH_PORT']
$env:_SVH_USER = $cfg['SSH_USER']
$env:_SVH_PASS = if ($cfg['SSH_PASS'])     { $cfg['SSH_PASS'] }     else { "" }
$env:_SVH_KEY  = if ($cfg['SSH_KEY_FILE']) { $cfg['SSH_KEY_FILE'] } else { "" }

function RunPy ([string[]] $PyArgs) {
    & python $pyFile @PyArgs
    if ($LASTEXITCODE -ne 0) {
        Remove-Item $pyFile  -Force -ErrorAction SilentlyContinue
        Remove-Item $bashTmp -Force -ErrorAction SilentlyContinue
        Die "Step failed (exit=$LASTEXITCODE)"
    }
}

# ── Step 1 - run setup on VPS ─────────────────────────────────────
Write-Step "Step 1/3 - Install Docker + create directories on VPS"
RunPy "setup", $bashTmp
Write-Ok "VPS setup completed"
Remove-Item $bashTmp -Force -ErrorAction SilentlyContinue

# ── Step 2 - upload .env.prod ─────────────────────────────────────
Write-Step "Step 2/3 - Upload .env.prod"
if ($localEnvProd -and (Test-Path $localEnvProd)) {
    RunPy "upload_env", $localEnvProd, "$deployDir/.env.prod"
    Write-Ok "Uploaded to $deployDir/.env.prod"
    if ($uploadTemplate) {
        Write-Host ""
        Write-Warn "Uploaded .env.prod.example as TEMPLATE -- values NOT filled in yet."
        Write-Warn "Edit it on the VPS before running release:"
        Write-Host "    ssh $sshInfo" -ForegroundColor White
        Write-Host "    nano $deployDir/.env.prod" -ForegroundColor White
    }
} else {
    Write-Warn "No .env.prod or example found locally -- skipping upload."
    Write-Warn "Create it manually on the VPS:"
    Write-Host "    ssh $sshInfo" -ForegroundColor White
    Write-Host "    nano $deployDir/.env.prod" -ForegroundColor White
}

# ── Step 3 - validate .env.prod ───────────────────────────────────
Write-Step "Step 3/3 - Validate .env.prod on VPS"
& python $pyFile "check_env" $deployDir
$checkExit = $LASTEXITCODE

Remove-Item $pyFile -Force -ErrorAction SilentlyContinue

Write-Host ""
if ($checkExit -eq 0) {
    Write-Host "=== VPS is ready -- run deployment ===" -ForegroundColor Green
    Write-Host "  .\scripts\release.ps1 -Env $Env" -ForegroundColor Green
} else {
    Write-Host "=== Setup done -- fill in .env.prod then deploy ===" -ForegroundColor Yellow
    Write-Host "  1. ssh $sshInfo"
    Write-Host "  2. nano $deployDir/.env.prod"
    Write-Host "  3. .\scripts\release.ps1 -Env $Env"
}
Write-Host ""
