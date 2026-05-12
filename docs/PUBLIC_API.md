# Public Sync API

External tools (YouTube scrapers, cron jobs, dashboards) can push the channel
list of a CMS into Meridian without going through the operator UI.

Authentication is by **CMS-scoped API key** — not JWT — so tokens can be
minted per tool, kept in secret stores, and revoked individually.

---

## 1. Mint an API key for a CMS

A super-admin / admin / content manager creates the key via the operator UI
or by calling the admin endpoint directly.

```bash
# 1) Login as admin to get a JWT
curl -s -X POST http://YOUR_HOST/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin@meridian.vn","password":"<adminPassword>"}'

# 2) Mint a key for CMS "KUDO"
curl -s -X POST http://YOUR_HOST/api/cms/KUDO/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_FROM_STEP_1>" \
  -d '{"name":"yt-scraper-prod","scopes":["channels:sync"]}'
```

Response (the **only** time the plaintext `token` is visible):

```json
{
  "id": "KEY_xxx",
  "cms_id": "KUDO",
  "name": "yt-scraper-prod",
  "key_prefix": "mcn_abcdEF12",
  "scopes": ["channels:sync"],
  "status": "Active",
  "token": "mcn_abcdEF12...64chars",
  "warning": "Copy this token now — it cannot be retrieved later."
}
```

Store `token` in your tool's secret manager. Lose it and you must mint a new key.

### List / revoke keys

```bash
# List
curl -H "Authorization: Bearer <JWT>" http://YOUR_HOST/api/cms/KUDO/api-keys

# Revoke
curl -X DELETE -H "Authorization: Bearer <JWT>" \
  http://YOUR_HOST/api/cms/KUDO/api-keys/KEY_xxx
```

---

## 2. Verify the key

```bash
curl -s -H "Authorization: Bearer mcn_..." http://YOUR_HOST/api/public/whoami
```

Response:
```json
{ "cms_id": "KUDO", "key_id": "KEY_xxx", "key_name": "yt-scraper-prod",
  "scopes": ["channels:sync"] }
```

Use this as a smoke test in CI / cron before running a full sync.

---

## 3. Sync channels (full-sync, batched)

### Endpoint

```
POST /api/public/channels/sync
Authorization: Bearer mcn_...        ← or: X-Api-Key: mcn_...
Content-Type:  application/json
```

### Body

| Field      | Type    | Required | Notes                                        |
|------------|---------|----------|----------------------------------------------|
| `sync_id`  | string  | yes      | 8–64 chars, ties batches of one run together |
| `items`    | array   | yes      | ≤ **500** channels per request               |
| `is_final` | boolean | no       | `true` only on the LAST batch of a run       |

### Each channel item

| Field             | Type   | Required | Default | Notes                                          |
|-------------------|--------|----------|---------|------------------------------------------------|
| `yt_id`           | string | yes      |         | YouTube channel id — conflict key for upsert   |
| `name`            | string | yes      |         | Display name                                   |
| `country`         | string | no       | `VN`    | ISO 3166-1 alpha-2                             |
| `subscribers`     | int    | no       | `0`     |                                                |
| `monthly_views`   | int    | no       | `0`     |                                                |
| `monthly_revenue` | number | no       | `0`     | Same currency as the CMS                       |
| `monetization`    | enum   | no       | `Pending` | `Monetized\|Demonetized\|Suspended\|Pending` |
| `status`          | enum   | no       | `Active`  | `Active\|Pending\|Suspended\|Terminated`     |
| `topic_id`        | string | no       | (keep)  | Only overwrites if non-null                    |
| `metadata`        | object | no       | `{}`    | Merged into existing JSONB                     |

### How the server reconciles

For each batch:
- Upsert by `yt_id` — existing rows are updated, new rows are inserted under
  the API key's CMS.
- Append the seen `yt_id`s to a scratch table keyed by `sync_id`.

When `is_final = true`:
- Any channel currently belonging to this CMS whose `yt_id` was **not seen**
  across any batch of this `sync_id` is marked `Terminated`.
- The scratch rows for this `sync_id` are deleted.

### Response

```json
{
  "ok": true,
  "sync_id": "sync_abc",
  "batch_size": 500,
  "inserted": 12,
  "updated": 488,
  "terminated": 0,            // 0 unless this was the final batch
  "terminated_sample": [],    // up to 10 names for spot checks
  "is_final": false
}
```

### Curl example — 1500 channels across 3 batches

```bash
TOKEN=mcn_xxx
URL=http://YOUR_HOST/api/public/channels/sync
SYNC=sync_$(openssl rand -hex 8)

# batch_1.json / batch_2.json / batch_3.json each have ≤500 items
curl -s -X POST $URL -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sync_id\":\"$SYNC\",\"items\":$(cat batch_1.json),\"is_final\":false}"

curl -s -X POST $URL -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sync_id\":\"$SYNC\",\"items\":$(cat batch_2.json),\"is_final\":false}"

curl -s -X POST $URL -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sync_id\":\"$SYNC\",\"items\":$(cat batch_3.json),\"is_final\":true}"
```

---

## 4. Python sample tool

See `tools/sync_cms_channels.py`:

```bash
python tools/sync_cms_channels.py \
  --base-url   http://YOUR_HOST \
  --api-key    mcn_xxx \
  --input      my_scraped_channels.json
```

The tool auto-chunks into batches of 500, retries on transient errors,
and sets `is_final=true` only on the final batch.

---

## 5. Error responses

| HTTP | code              | Reason                                              |
|------|-------------------|-----------------------------------------------------|
| 401  | `UNAUTHORIZED`    | Missing / unknown / revoked API key                 |
| 403  | `FORBIDDEN`       | Key lacks `channels:sync` scope                     |
| 404  | `NOT_FOUND`       | Owning CMS was deleted while the key was active     |
| 422  | `VALIDATION_ERROR`| Body fails schema (e.g. >500 items, missing yt_id)  |
| 429  | (rate-limit)      | Default 300 req/min per IP                          |
| 500  | `INTERNAL_ERROR`  | Server bug — open an issue with the request id      |

---

## 6. Security notes

- Tokens are stored as **SHA-256 hashes** server-side. A leaked DB dump cannot
  be replayed against the API.
- Tokens are bound to **one CMS**; a leaked key cannot touch other CMS data.
- Revoking sets `status='Revoked'`; the next request with that token gets 401.
- `last_used_at` is updated on every successful auth, so dormant keys are easy
  to spot and clean up.
- The `X-Api-Key` header is accepted as an alternative to `Authorization`
  for tools that already use `Authorization` for something else.
