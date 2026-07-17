#!/usr/bin/env python3
"""Check local and optionally published tournament entry pages."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config/tournament-operations.json"
OUTPUT = ROOT / "data/tournaments/operations/public-checks.json"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--network", action="store_true", help="Also check the published GitHub Pages URLs")
    parser.add_argument("--allow-network-failure", action="store_true")
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    base = str(config.get("publicBaseUrl") or "").rstrip("/") + "/"
    rows = []
    hard_failures = []
    for event_id, item in config.get("publicPages", {}).items():
        rel = item.get("path")
        path = ROOT / str(rel)
        required = item.get("requiredTokens", [])
        text = path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""
        missing = [token for token in required if token not in text]
        local_ready = path.exists() and not missing
        row = {
            "eventId": event_id,
            "path": rel,
            "localStatus": "ready" if local_ready else "error",
            "message": "Local page and required application mounts are present." if local_ready else (f"Missing page: {rel}" if not path.exists() else f"Missing required page tokens: {', '.join(missing)}"),
            "networkChecked": bool(args.network),
            "networkStatus": "not_checked",
            "networkMessage": "Published page was not checked during this local validation.",
            "checkedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        }
        if not local_ready:
            hard_failures.append(f"{event_id}: {row['message']}")
        if args.network:
            url = base + str(rel)
            try:
                request = Request(url, headers={"User-Agent": "CPI-Tournament-Ops/7.47"})
                with urlopen(request, timeout=20) as response:
                    body = response.read().decode("utf-8", errors="replace")
                    status = getattr(response, "status", 200)
                missing_live = [token for token in required if token not in body]
                if status == 200 and not missing_live:
                    row["networkStatus"] = "ready"
                    row["networkMessage"] = "Published page returned HTTP 200 with required application mounts."
                else:
                    row["networkStatus"] = "error"
                    row["networkMessage"] = f"Published page returned HTTP {status}; missing tokens: {', '.join(missing_live) or 'none'}."
            except (HTTPError, URLError, TimeoutError) as exc:
                row["networkStatus"] = "error"
                row["networkMessage"] = f"Published page check failed: {exc}"
                if not args.allow_network_failure:
                    hard_failures.append(f"{event_id}: {row['networkMessage']}")
        rows.append(row)

    payload = {
        "schemaVersion": 1,
        "release": "7.47.0",
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "mode": "network" if args.network else "local",
        "events": rows,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    if hard_failures:
        print("PUBLIC TOURNAMENT PAGE CHECK FAILED")
        for item in hard_failures:
            print(f" - {item}")
        return 1
    print("PUBLIC TOURNAMENT PAGE CHECK PASSED")
    print(f" - {len(rows)} registered tournament entry pages are wired locally")
    if args.network:
        ready = sum(row['networkStatus'] == 'ready' for row in rows)
        print(f" - {ready}/{len(rows)} published pages responded with required application mounts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
