#!/usr/bin/env python3
"""CPI repository and release integrity audit.

The audit has two modes:
- migration mode (default): known legacy issues in the checked-in baseline are reported,
  but only new blocking regressions fail the command.
- strict mode: every blocking issue fails, including legacy baseline debt.

This lets CPI stop adding new technical debt immediately while existing debt is removed
systematically instead of being hidden or ignored.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = ROOT / "config" / "release-audit-baseline.json"
DEFAULT_REPORT = ROOT / "qa" / "release-audit-latest.json"
EXCLUDED_DIRS = {".git", ".github", "dist", "node_modules", "__pycache__"}
EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "javascript:", "data:", "#", "//")
EXPECTED_GROUPS = {
    "12U Boys", "12U Girls", "14U Boys", "14U Girls",
    "16U Boys", "16U Girls", "18U Boys", "18U Girls",
}
RANKING_REQUIRED_FIELDS = {
    "season", "group", "gender", "ageGroup", "postRank", "team", "slug", "club", "clubSlug",
    "canonicalTeamId", "canonicalClubId"
}


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except Exception:
        return path.as_posix()


def ignored(path: Path) -> bool:
    return any(part in EXCLUDED_DIRS for part in path.parts)


def issue(code: str, path: str, detail: str, severity: str = "block") -> dict:
    key = f"{code}|{path}|{detail}"
    return {"key": key, "code": code, "path": path, "detail": detail, "severity": severity}


def local_target(source: Path, raw_ref: str) -> Path | None:
    if not raw_ref or raw_ref.startswith(EXTERNAL_PREFIXES):
        return None
    clean = unquote(raw_ref.split("?", 1)[0].split("#", 1)[0]).strip()
    if not clean:
        return None
    target = ROOT / clean.lstrip("/") if clean.startswith("/") else source.parent / clean
    if clean.endswith("/"):
        target /= "index.html"
    return target


def check_release_metadata(issues: list[dict]) -> None:
    config_path = ROOT / "config" / "site-release.json"
    version_path = ROOT / "VERSION.md"
    if not config_path.exists():
        issues.append(issue("missing_release_config", rel(config_path), "config/site-release.json is required"))
        return
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as exc:
        issues.append(issue("invalid_release_config", rel(config_path), str(exc)))
        return
    version = str(config.get("version", "")).strip()
    if not version:
        issues.append(issue("missing_release_version", rel(config_path), "version is empty"))
    if not version_path.exists():
        issues.append(issue("missing_version_file", rel(version_path), "VERSION.md is required"))
    elif version and version not in version_path.read_text(encoding="utf-8"):
        issues.append(issue("version_mismatch", rel(version_path), f"does not contain canonical version {version}"))


def check_json(issues: list[dict]) -> None:
    for path in sorted(ROOT.rglob("*.json")):
        if ignored(path):
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            issues.append(issue("invalid_json", rel(path), str(exc)))


def check_js(issues: list[dict]) -> None:
    node = shutil.which("node")
    if not node:
        issues.append(issue("node_unavailable", "node", "JavaScript syntax checks skipped", "review"))
        return
    for path in sorted(ROOT.rglob("*.js")):
        if ignored(path):
            continue
        result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
        if result.returncode:
            detail = (result.stderr or result.stdout).strip().replace("\n", " ")[:500]
            issues.append(issue("invalid_javascript", rel(path), detail))


def check_html(issues: list[dict]) -> None:
    attr_re = re.compile(r"\b(?:href|src)=[\"']([^\"']+)", re.I)
    id_re = re.compile(r"\bid=[\"']([^\"']+)", re.I)
    for path in sorted(ROOT.rglob("*.html")):
        if ignored(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        ids = id_re.findall(text)
        duplicates = sorted({x for x in ids if ids.count(x) > 1})
        for duplicate in duplicates:
            issues.append(issue("duplicate_html_id", rel(path), duplicate))
        for raw_ref in attr_re.findall(text):
            target = local_target(path, raw_ref)
            if target is not None and not target.exists():
                issues.append(issue("missing_local_reference", rel(path), raw_ref))


def check_css(issues: list[dict]) -> None:
    url_re = re.compile(r"url\(\s*['\"]?([^)'\"]+)", re.I)
    for path in sorted(ROOT.rglob("*.css")):
        if ignored(path):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for raw_ref in url_re.findall(text):
            target = local_target(path, raw_ref)
            if target is not None and not target.exists():
                issues.append(issue("missing_css_asset", rel(path), raw_ref))


def asset_paths_from_text(text: str) -> set[str]:
    patterns = [
        r"assets/logos/[^\"']+",
        r"assets/photos/[^\"']+",
        r"assets/media/[^\"']+",
        r"assets/[^\"']+\.(?:svg|png|jpg|jpeg|webp|avif)",
    ]
    found: set[str] = set()
    for pattern in patterns:
        found.update(re.findall(pattern, text, re.I))
    return found


def check_data_assets(issues: list[dict]) -> None:
    paths = [ROOT / "data.js", ROOT / "data" / "homepage.json", ROOT / "data" / "logo-registry.json", ROOT / "rankings.json"]
    for path in paths:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for raw_ref in sorted(asset_paths_from_text(text)):
            clean = raw_ref.split("?", 1)[0].split("#", 1)[0]
            if not (ROOT / clean).exists():
                issues.append(issue("missing_data_asset", rel(path), raw_ref))


def check_rankings(issues: list[dict]) -> dict:
    path = ROOT / "rankings.json"
    summary = {"teams": 0, "groups": {}}
    if not path.exists():
        issues.append(issue("missing_rankings", rel(path), "rankings.json is required"))
        return summary
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return summary
    if not isinstance(rows, list):
        issues.append(issue("invalid_rankings_shape", rel(path), "top-level value must be a list"))
        return summary
    summary["teams"] = len(rows)
    by_group: dict[str, list[dict]] = defaultdict(list)
    seen_keys: set[tuple[str, str]] = set()
    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            issues.append(issue("invalid_ranking_row", rel(path), f"row {idx + 1} is not an object"))
            continue
        missing = sorted(RANKING_REQUIRED_FIELDS - set(row))
        if missing:
            issues.append(issue("missing_ranking_fields", rel(path), f"row {idx + 1}: {', '.join(missing)}"))
        group = str(row.get("group", ""))
        slug = str(row.get("slug", ""))
        key = (group, slug)
        if key in seen_keys:
            issues.append(issue("duplicate_ranked_team", rel(path), f"{group}: {slug}"))
        seen_keys.add(key)
        by_group[group].append(row)
        team = str(row.get("team", ""))
        if re.match(r"^\s*#?\d+\s*[-–—]\s*", team):
            issues.append(issue("seed_embedded_in_team_name", rel(path), f"{group}: {team}"))
        rank = row.get("postRank")
        if not isinstance(rank, int) or rank < 1:
            issues.append(issue("invalid_rank", rel(path), f"{group}: {team} has {rank!r}"))
        games = row.get("gamesTracked")
        if games is not None and (not isinstance(games, (int, float)) or games < 0):
            issues.append(issue("invalid_game_count", rel(path), f"{group}: {team} has {games!r}"))
        expected_age = group.split(" ", 1)[0] if " " in group else ""
        expected_gender = group.split(" ", 1)[1] if " " in group else ""
        if expected_age and row.get("ageGroup") != expected_age:
            issues.append(issue("ranking_age_mismatch", rel(path), f"{team}: {row.get('ageGroup')} vs {expected_age}"))
        if expected_gender and row.get("gender") != expected_gender:
            issues.append(issue("ranking_gender_mismatch", rel(path), f"{team}: {row.get('gender')} vs {expected_gender}"))
    actual_groups = set(by_group)
    for missing_group in sorted(EXPECTED_GROUPS - actual_groups):
        issues.append(issue("missing_ranking_group", rel(path), missing_group))
    for unexpected in sorted(actual_groups - EXPECTED_GROUPS):
        issues.append(issue("unexpected_ranking_group", rel(path), unexpected, "review"))
    for group, group_rows in sorted(by_group.items()):
        ranks = sorted(row.get("postRank") for row in group_rows if isinstance(row.get("postRank"), int))
        expected = list(range(1, len(group_rows) + 1))
        if ranks != expected:
            issues.append(issue("non_contiguous_ranks", rel(path), f"{group}: expected 1-{len(group_rows)}, got {ranks[:12]}..."))
        summary["groups"][group] = len(group_rows)
    return summary


def load_baseline(path: Path) -> set[str]:
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return set()
    return set(data.get("knownIssueKeys", []))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, default=DEFAULT_BASELINE)
    parser.add_argument("--strict", action="store_true", help="Fail on known baseline debt as well as new regressions")
    parser.add_argument("--write-report", type=Path, default=None)
    parser.add_argument("--write-baseline", type=Path, default=None, help="Write the current blocking issue keys as a migration baseline")
    args = parser.parse_args()

    issues: list[dict] = []
    check_release_metadata(issues)
    check_json(issues)
    check_js(issues)
    check_html(issues)
    check_css(issues)
    check_data_assets(issues)
    ranking_summary = check_rankings(issues)

    # Stable ordering and de-duplication.
    deduped = {item["key"]: item for item in issues}
    issues = [deduped[key] for key in sorted(deduped)]
    baseline_keys = load_baseline(args.baseline)
    current_keys = {item["key"] for item in issues if item["severity"] == "block"}

    for item in issues:
        item["baseline"] = item["key"] in baseline_keys

    new_blockers = [item for item in issues if item["severity"] == "block" and not item["baseline"]]
    known_blockers = [item for item in issues if item["severity"] == "block" and item["baseline"]]
    reviews = [item for item in issues if item["severity"] == "review"]
    resolved_baseline = sorted(baseline_keys - current_keys)

    if args.write_baseline:
        args.write_baseline.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "schemaVersion": 1,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "purpose": "Migration baseline. Known debt remains visible; any new blocking issue fails release-check.",
            "knownIssueKeys": sorted(current_keys),
        }
        args.write_baseline.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mode": "strict" if args.strict else "migration",
        "rankingSummary": ranking_summary,
        "summary": {
            "newBlockers": len(new_blockers),
            "knownBlockers": len(known_blockers),
            "reviews": len(reviews),
            "resolvedBaselineIssues": len(resolved_baseline),
        },
        "newBlockers": new_blockers,
        "knownBlockers": known_blockers,
        "reviews": reviews,
        "resolvedBaselineIssueKeys": resolved_baseline,
    }
    if args.write_report:
        output = args.write_report if args.write_report.is_absolute() else ROOT / args.write_report
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print("CPI RELEASE INTEGRITY AUDIT")
    print("===========================")
    print(f"Ranked teams: {ranking_summary['teams']}")
    print(f"Ranking groups: {len(ranking_summary['groups'])}")
    print(f"New blockers: {len(new_blockers)}")
    print(f"Known legacy blockers: {len(known_blockers)}")
    print(f"Review items: {len(reviews)}")
    print(f"Resolved baseline items: {len(resolved_baseline)}")

    if new_blockers:
        print("\nNEW BLOCKERS")
        for item in new_blockers[:100]:
            print(f" - [{item['code']}] {item['path']}: {item['detail']}")
    if known_blockers:
        counts: dict[str, int] = defaultdict(int)
        for item in known_blockers:
            counts[item["code"]] += 1
        print("\nKNOWN LEGACY DEBT (does not fail migration mode)")
        for code, count in sorted(counts.items()):
            print(f" - {code}: {count}")
    if resolved_baseline:
        print(f"\nResolved {len(resolved_baseline)} previously baselined issue(s). Remove them from the baseline in a later cleanup release.")

    failed = bool(new_blockers) or (args.strict and bool(known_blockers))
    print("\nFAILED" if failed else "\nPASSED")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
