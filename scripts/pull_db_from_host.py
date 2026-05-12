#!/usr/bin/env python3
"""
pull_db_from_host.py
──────────────────────────────────────────────────────────────────────────────
Sync production database → local development database.

Steps:
  1. SSH into host → pg_dump inside meridian-postgres container
  2. Download dump via SFTP to local temp file
  3. Restore into local meridian-postgres-v6 container

Usage:
  python scripts/pull_db_from_host.py
──────────────────────────────────────────────────────────────────────────────
"""
import paramiko
import subprocess
import sys
import os
import tempfile
from datetime import datetime

# ── Host config ──────────────────────────────────────────────────────────────
HOST       = "10.10.0.100"
PORT       = 20026
SSH_USER   = "root"
SSH_PASS   = "FM20262026@!"

# Host container / DB (read from .env.prod on host)
PG_CONTAINER = "meridian-postgres"
REMOTE_DUMP  = "/tmp/meridian_pull.dump"

# ── Local config ─────────────────────────────────────────────────────────────
LOCAL_PG_CONTAINER = "meridian-postgres-v6"
LOCAL_DB           = "meridian"
LOCAL_USER         = "meridian"
LOCAL_DUMP         = os.path.join(tempfile.gettempdir(), "meridian_pull.dump")


def ssh_exec(client: paramiko.SSHClient, cmd: str, check=True) -> str:
    print(f"  $ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, get_pty=False)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"    {out}")
    if err:
        print(f"    [stderr] {err}")
    if check and exit_code != 0:
        print(f"  ERROR: exit code {exit_code}")
        sys.exit(1)
    return out


def main():
    print("=" * 60)
    print("  Meridian - Pull DB from host -> local")
    print(f"  Host  : {HOST}:{PORT}")
    print(f"  Time  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # ── 1. Connect SSH ────────────────────────────────────────────────────────
    print("\n[1/4] Connecting to host via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=SSH_USER, password=SSH_PASS, timeout=15)
    print("      Connected OK")

    # ── 2. Read DB credentials from .env.prod ─────────────────────────────────
    print("\n[2/4] Reading DB credentials from host...")
    env_out = ssh_exec(client,
        "grep -E '^POSTGRES_(DB|USER|PASSWORD)' /opt/meridian-mcn/current/.env.prod || "
        "grep -E '^POSTGRES_(DB|USER|PASSWORD)' /opt/meridian-mcn/.env.prod 2>/dev/null || echo ''",
        check=False
    )
    pg_db   = "meridian_db"
    pg_user = "meridian"
    for line in env_out.splitlines():
        if line.startswith("POSTGRES_DB="):
            pg_db   = line.split("=", 1)[1].strip().strip('"\'')
        elif line.startswith("POSTGRES_USER="):
            pg_user = line.split("=", 1)[1].strip().strip('"\'')
    print(f"      DB={pg_db}  USER={pg_user}")

    # ── 3. pg_dump on host ───────────────────────────────────────────────────
    print(f"\n[3/4] Dumping DB on host -> {REMOTE_DUMP} ...")
    ssh_exec(client,
        f"docker exec {PG_CONTAINER} pg_dump -U {pg_user} -d {pg_db} -F c -f /tmp/meridian_pull.dump"
    )
    ssh_exec(client,
        f"docker cp {PG_CONTAINER}:/tmp/meridian_pull.dump {REMOTE_DUMP}"
    )
    size_out = ssh_exec(client, f"du -sh {REMOTE_DUMP}", check=False)
    print(f"      Dump size: {size_out.split()[0] if size_out else '?'}")

    # ── 4. Download via SFTP ─────────────────────────────────────────────────
    print(f"\n[4/4] Downloading dump -> {LOCAL_DUMP} ...")
    sftp = client.open_sftp()
    sftp.get(REMOTE_DUMP, LOCAL_DUMP)
    sftp.close()
    size = os.path.getsize(LOCAL_DUMP)
    print(f"      Downloaded {size / 1024:.1f} KB")

    client.close()

    # ── 5. Restore to local container ────────────────────────────────────────
    print(f"\n[5/5] Restoring to local container ({LOCAL_PG_CONTAINER})...")

    # Copy dump into container
    subprocess.run(
        ["docker", "cp", LOCAL_DUMP, f"{LOCAL_PG_CONTAINER}:/tmp/meridian_pull.dump"],
        check=True
    )

    # Drop & recreate schema
    subprocess.run(
        ["docker", "exec", LOCAL_PG_CONTAINER, "psql", "-U", LOCAL_USER, "-d", LOCAL_DB,
         "-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"],
        check=True
    )

    # Restore
    result = subprocess.run(
        ["docker", "exec", LOCAL_PG_CONTAINER,
         "pg_restore", "-U", LOCAL_USER, "-d", LOCAL_DB,
         "--no-owner", "--no-privileges", "--exit-on-error",
         "/tmp/meridian_pull.dump"],
        capture_output=True, text=True
    )
    if result.returncode != 0 and result.stderr:
        # pg_restore returns non-zero even for warnings, filter real errors
        real_errors = [l for l in result.stderr.splitlines()
                       if "error" in l.lower() and "already exists" not in l.lower()]
        if real_errors:
            print("  WARNINGS/ERRORS:")
            for e in real_errors[:10]:
                print(f"    {e}")

    print("\n  Cleaning up temp files...")
    os.remove(LOCAL_DUMP)
    subprocess.run(
        ["docker", "exec", LOCAL_PG_CONTAINER, "rm", "-f", "/tmp/meridian_pull.dump"],
        check=False
    )

    print("\n" + "=" * 60)
    print("  DONE - local DB is now synced with host production data")
    print("  Restart local backend if it's running:")
    print("    docker-compose restart backend")
    print("=" * 60)


if __name__ == "__main__":
    main()
