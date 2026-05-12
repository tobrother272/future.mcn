#!/usr/bin/env python3
"""
Sync a CMS's channel list to Meridian via the public sync API.

Usage:
    python sync_cms_channels.py \
        --base-url   http://localhost:4000 \
        --api-key    mcn_xxx... \
        --input      channels.json

The input file must be a JSON array. Each item:
    {
        "yt_id":           "UCxxxx",          # required
        "name":            "Channel Name",    # required
        "country":         "VN",              # optional, 2-letter
        "subscribers":     12345,             # optional
        "monthly_views":   123456,            # optional
        "monthly_revenue": 100.50,            # optional
        "monetization":    "Monetized",       # Monetized|Demonetized|Suspended|Pending
        "status":          "Active",          # Active|Pending|Suspended|Terminated
        "topic_id":        "TOP_xxx",         # optional
        "metadata":        {"any": "json"}    # optional
    }

The script:
  1. Reads the full list locally.
  2. Splits it into batches of <= 500.
  3. POSTs each batch to /api/public/channels/sync with the same sync_id.
  4. Sends `is_final = true` on the last batch — that triggers reconcile:
     channels in the CMS that were NOT seen in any batch get Terminated.

Network failures retry with exponential backoff. The script is safe to
re-run: sync_id is recomputed each invocation so a partially-finished
sync won't accidentally reconcile against stale data.
"""

from __future__ import annotations

import argparse
import json
import secrets
import sys
import time
from pathlib import Path
from typing import Any, Iterable

import urllib.request
import urllib.error

BATCH_SIZE = 500
MAX_RETRIES = 4
BACKOFF_BASE_SECONDS = 1.5


def chunked(seq: list[dict[str, Any]], n: int) -> Iterable[list[dict[str, Any]]]:
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def post_json(url: str, token: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )

    last_err: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            # 4xx is a permanent failure — surface it immediately so the
            # operator can fix the payload instead of looping forever.
            if 400 <= e.code < 500:
                err_body = e.read().decode("utf-8", errors="replace")
                raise SystemExit(f"HTTP {e.code} from server:\n{err_body}") from e
            last_err = e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = e

        sleep = BACKOFF_BASE_SECONDS ** attempt
        print(f"  [retry {attempt}/{MAX_RETRIES}] {last_err}; sleeping {sleep:.1f}s",
              file=sys.stderr)
        time.sleep(sleep)

    raise SystemExit(f"Failed after {MAX_RETRIES} retries: {last_err}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", required=True,
                    help="e.g. http://localhost:4000")
    ap.add_argument("--api-key", required=True,
                    help="The mcn_... token created via POST /api/cms/:id/api-keys")
    ap.add_argument("--input", required=True, type=Path,
                    help="JSON array of channel rows")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print payloads instead of POSTing")
    args = ap.parse_args()

    if not args.input.is_file():
        ap.error(f"Input file not found: {args.input}")

    try:
        items: list[dict[str, Any]] = json.loads(args.input.read_text("utf-8"))
    except json.JSONDecodeError as e:
        ap.error(f"Input is not valid JSON: {e}")

    if not isinstance(items, list) or not items:
        ap.error("Input must be a non-empty JSON array")

    # sync_id ties all batches of THIS run together so the final batch can
    # reconcile. For single-batch runs the server auto-generates one if we
    # omit it — we still generate locally so the log is consistent.
    sync_id = "sync_" + secrets.token_hex(8)
    url = f"{args.base_url.rstrip('/')}/api/public/channels/sync"

    batches = list(chunked(items, BATCH_SIZE))
    print(f"Sync ID: {sync_id}  (auto-generated, sent to server)")
    print(f"Channels: {len(items)} in {len(batches)} batch(es)")
    print(f"Endpoint: {url}\n")

    totals = {"inserted": 0, "updated": 0, "terminated": 0}
    for i, batch in enumerate(batches):
        is_final = (i == len(batches) - 1)
        payload = {"sync_id": sync_id, "items": batch, "is_final": is_final}
        label = f"Batch {i+1}/{len(batches)} ({len(batch)} items, final={is_final})"

        if args.dry_run:
            print(f"[dry-run] {label}\n{json.dumps(payload, indent=2)[:400]}...\n")
            continue

        print(f"→ {label} ...", end=" ", flush=True)
        result = post_json(url, args.api_key, payload)
        print("done.")
        print(f"   inserted={result['inserted']} updated={result['updated']} "
              f"terminated={result['terminated']}")
        if result.get("terminated_sample"):
            print(f"   sample terminated: {result['terminated_sample']}")
        totals["inserted"]   += result["inserted"]
        totals["updated"]    += result["updated"]
        totals["terminated"] += result["terminated"]

    print(f"\nDone. inserted={totals['inserted']} "
          f"updated={totals['updated']} terminated={totals['terminated']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
