#!/usr/bin/env python3
"""Generate CPI post-JO review packet drafts from comparison CSV.

Release: CPI 7.20

The packets are Markdown review files for human decision-making.
They are not ranking updates.
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_comparison_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "output" / "post-jo-comparison.csv"


def default_packet_dir() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "review-packets"


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def to_int(value: str) -> Optional[int]:
    try:
        if str(value).strip() == "":
            return None
        return int(str(value).strip())
    except ValueError:
        return None


def group_title(group_key: str) -> str:
    parts = group_key.split("-")
    if len(parts) >= 2:
        return f"{parts[0].upper()} {' '.join(part.capitalize() for part in parts[1:])}"
    return group_key


def sorted_by_jo_finish(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    return sorted(rows, key=lambda row: (to_int(row.get("jo_final_placement", "")) or 9999, to_int(row.get("pre_jo_rank", "")) or 9999, row.get("display_team_name", "")))


def sorted_by_delta(rows: List[Dict[str, str]], reverse: bool = True) -> List[Dict[str, str]]:
    return sorted(rows, key=lambda row: (to_int(row.get("rank_delta_signal", "")) if to_int(row.get("rank_delta_signal", "")) is not None else -9999), reverse=reverse)


def table(rows: List[Dict[str, str]], columns: List[Tuple[str, str]], limit: Optional[int] = None) -> List[str]:
    selected = rows[:limit] if limit else rows
    if not selected:
        return ["_None._"]

    header = "| " + " | ".join(label for label, _ in columns) + " |"
    divider = "| " + " | ".join("---" for _ in columns) + " |"
    lines = [header, divider]
    for row in selected:
        values = []
        for _, key in columns:
            value = row.get(key, "")
            value = value.replace("|", "\\|")
            values.append(value)
        lines.append("| " + " | ".join(values) + " |")
    return lines


def build_packet(group_key: str, rows: List[Dict[str, str]]) -> str:
    generated = datetime.now(timezone.utc).isoformat()
    title = group_title(group_key)

    top_finishers = sorted_by_jo_finish([row for row in rows if row.get("jo_final_placement")])[:12]
    overperformers = [row for row in sorted_by_delta(rows, reverse=True) if row.get("model_read") in {"overperformed", "overperformed-lower-division", "unranked-jo-performer"}]
    underperformers = [row for row in sorted_by_delta(rows, reverse=False) if row.get("model_read") in {"underperformed", "did-not-play-or-missing-source"}]
    manual_review = [row for row in rows if row.get("candidate_movement") == "manual-review" or row.get("review_flags")]
    move_up = [row for row in rows if row.get("candidate_movement") == "move-up"]
    move_down = [row for row in rows if row.get("candidate_movement") == "move-down"]
    hold = [row for row in rows if row.get("candidate_movement") == "hold"]

    summary_columns = [
        ("Team", "display_team_name"),
        ("Pre-JO", "pre_jo_rank"),
        ("JO", "jo_final_placement"),
        ("Tier", "jo_division_tier"),
        ("Signal", "rank_delta_signal"),
        ("Read", "model_read"),
        ("Move", "candidate_movement"),
    ]

    full_columns = [
        ("Team", "display_team_name"),
        ("Pre-JO", "pre_jo_rank"),
        ("CPI", "pre_jo_cpi_score"),
        ("JO Div", "jo_division"),
        ("Tier", "jo_division_tier"),
        ("JO Finish", "jo_final_placement"),
        ("Record", "jo_record"),
        ("Signal", "rank_delta_signal"),
        ("Model Read", "model_read"),
        ("Candidate", "candidate_movement"),
        ("Flags", "review_flags"),
    ]

    lines: List[str] = [
        f"# CPI Post-JO Review Packet — {title}",
        "",
        f"Generated: {generated}",
        "Status: Draft review packet",
        "Release tooling: 7.20",
        "",
        "## Review summary",
        "",
        f"- Teams reviewed: {len(rows)}",
        f"- Move-up candidates: {len(move_up)}",
        f"- Move-down candidates: {len(move_down)}",
        f"- Hold candidates: {len(hold)}",
        f"- Manual-review items: {len(manual_review)}",
        "",
        "## Top JO finishers",
        "",
        *table(top_finishers, summary_columns, limit=12),
        "",
        "## Major overperformers / new JO performers",
        "",
        *table(overperformers, summary_columns, limit=12),
        "",
        "## Major underperformers / missing JO source rows",
        "",
        *table(underperformers, summary_columns, limit=12),
        "",
        "## Manual review queue",
        "",
        *table(manual_review, summary_columns, limit=20),
        "",
        "## Full comparison table",
        "",
        *table(sorted_by_jo_finish(rows), full_columns),
        "",
        "## Reviewer notes",
        "",
        "Use this packet as evidence for CPI 8.0 ranking recalibration. Do not publish ranking movement directly from this file without alias review, team-depth review, and source verification.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate CPI post-JO review packet Markdown files.")
    parser.add_argument("--comparison", type=Path, default=default_comparison_path(), help="Path to post-jo-comparison.csv")
    parser.add_argument("--output-dir", type=Path, default=default_packet_dir(), help="Directory for Markdown review packets")
    args = parser.parse_args()

    if not args.comparison.exists():
        print(f"Missing comparison CSV: {args.comparison}")
        print("Run build_post_jo_comparison.py first.")
        return 1

    rows = read_csv(args.comparison)
    grouped: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row.get("group_key", "unknown")].append(row)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for group_key, group_rows in sorted(grouped.items()):
        packet = build_packet(group_key, group_rows)
        output_path = args.output_dir / f"{group_key}-post-jo-review.md"
        output_path.write_text(packet + "\n", encoding="utf-8")
        print(f"Wrote review packet: {output_path}")

    print(f"Packets generated: {len(grouped)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
