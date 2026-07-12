#!/usr/bin/env python3
"""Build CPI pre-JO vs post-JO comparison output.

Release: CPI 7.20

This script joins a pre-JO ranking snapshot to normalized JO final placements.
It produces review signals only. It does not publish rankings.
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

OUTPUT_COLUMNS = [
    "group_key",
    "team_key",
    "display_team_name",
    "club_key",
    "pre_jo_rank",
    "pre_jo_cpi_score",
    "pre_jo_confidence",
    "jo_division",
    "jo_division_tier",
    "jo_final_placement",
    "jo_record",
    "rank_delta_signal",
    "model_read",
    "candidate_movement",
    "confidence",
    "review_flags",
    "review_notes",
]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_prejo_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "input" / "pre-jo-rankings.csv"


def default_intake_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "input" / "post-jo-results-intake.csv"


def default_output_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "output" / "post-jo-comparison.csv"


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def write_csv(path: Path, rows: List[Dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow({column: row.get(column, "") for column in OUTPUT_COLUMNS})


def normalize_key(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def make_match_key(row: Dict[str, str]) -> Tuple[str, str]:
    group_key = row.get("group_key", "")
    team_key = row.get("team_key", "")
    if team_key:
        return group_key, f"key:{team_key}"
    return group_key, f"name:{normalize_key(row.get('display_team_name', ''))}"


def to_int(value: str) -> Optional[int]:
    try:
        if str(value).strip() == "":
            return None
        return int(str(value).strip())
    except ValueError:
        return None


def best_jo_row(rows: List[Dict[str, str]]) -> Dict[str, str]:
    """Pick the strongest JO row for a team.

    If a team appears more than once, keep the best known final placement and flag duplicates later.
    """
    if len(rows) == 1:
        return rows[0]

    def placement_sort(row: Dict[str, str]) -> int:
        value = to_int(row.get("final_placement", ""))
        return value if value is not None else 9999

    return sorted(rows, key=placement_sort)[0]


def join_flags(*values: str) -> str:
    parts: List[str] = []
    for value in values:
        if not value:
            continue
        for part in value.replace(";", ",").split(","):
            clean = part.strip()
            if clean and clean not in parts:
                parts.append(clean)
    return "; ".join(parts)


def classify(pre_rank: Optional[int], placement: Optional[int], tier: str, source_confidence: str, flags: str) -> Tuple[str, str, str, str]:
    tier = tier or "Unknown"
    source_confidence = (source_confidence or "").lower()
    notes: List[str] = []

    if placement is None:
        return "insufficient-data", "manual-review", "low", "Missing JO final placement."

    if pre_rank is None:
        confidence = "medium" if source_confidence == "high" else "low"
        return "unranked-jo-performer", "manual-review", confidence, "Team has JO placement but no pre-JO rank match."

    delta = pre_rank - placement

    if tier in {"D2", "D3"}:
        if placement <= 4:
            notes.append("Lower-division top finisher; compare carefully against bottom of higher tier.")
            return "overperformed-lower-division", "manual-review", "medium", " ".join(notes)
        if abs(delta) <= 4:
            return "confirmed", "hold", "medium", "Lower-division result is directionally consistent."
        return "mixed", "manual-review", "medium", "Lower-division result needs tier-context review."

    if delta >= 8:
        return "overperformed", "move-up", "high" if source_confidence == "high" and not flags else "medium", f"JO finish beat pre-JO rank expectation by {delta} places."
    if delta <= -8:
        return "underperformed", "move-down", "high" if source_confidence == "high" and not flags else "medium", f"JO finish trailed pre-JO rank expectation by {abs(delta)} places."
    if abs(delta) <= 4:
        return "confirmed", "hold", "high" if source_confidence == "high" and not flags else "medium", "JO finish broadly confirms pre-JO ranking."

    return "mixed", "manual-review", "medium", f"Moderate movement signal of {delta}; review bracket path and head-to-head evidence."


def build_comparison(prejo_rows: List[Dict[str, str]], jo_rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    prejo_by_key: Dict[Tuple[str, str], Dict[str, str]] = {make_match_key(row): row for row in prejo_rows}
    jo_by_key: Dict[Tuple[str, str], List[Dict[str, str]]] = defaultdict(list)
    for row in jo_rows:
        jo_by_key[make_match_key(row)].append(row)

    all_keys = sorted(set(prejo_by_key) | set(jo_by_key))
    output: List[Dict[str, str]] = []

    for key in all_keys:
        pre = prejo_by_key.get(key, {})
        jo_candidates = jo_by_key.get(key, [])
        jo = best_jo_row(jo_candidates) if jo_candidates else {}

        pre_rank = to_int(pre.get("pre_jo_rank", ""))
        placement = to_int(jo.get("final_placement", ""))
        tier = jo.get("division_tier", "")
        source_confidence = jo.get("source_confidence", "")
        duplicate_flag = "duplicate-jo-row" if len(jo_candidates) > 1 else ""
        flags = join_flags(jo.get("review_flags", ""), duplicate_flag)

        model_read, movement, confidence, note = classify(pre_rank, placement, tier, source_confidence, flags)

        if not jo and pre:
            model_read = "did-not-play-or-missing-source"
            movement = "manual-review"
            confidence = "low"
            note = "Pre-JO ranked team was not found in JO intake. Confirm if team did not play or alias did not match."
            flags = join_flags(flags, "missing-from-jo-intake")

        rank_delta = ""
        if pre_rank is not None and placement is not None:
            rank_delta = str(pre_rank - placement)

        wins = jo.get("wins", "")
        losses = jo.get("losses", "")
        ties = jo.get("ties", "")
        jo_record = ""
        if any([wins, losses, ties]):
            jo_record = f"{wins or '0'}-{losses or '0'}-{ties or '0'}"

        output.append(
            {
                "group_key": pre.get("group_key") or jo.get("group_key", ""),
                "team_key": pre.get("team_key") or jo.get("team_key", ""),
                "display_team_name": pre.get("display_team_name") or jo.get("display_team_name", ""),
                "club_key": pre.get("club_key") or jo.get("club_key", ""),
                "pre_jo_rank": pre.get("pre_jo_rank", ""),
                "pre_jo_cpi_score": pre.get("pre_jo_cpi_score", ""),
                "pre_jo_confidence": pre.get("pre_jo_confidence", ""),
                "jo_division": jo.get("division_name", ""),
                "jo_division_tier": tier,
                "jo_final_placement": jo.get("final_placement", ""),
                "jo_record": jo_record,
                "rank_delta_signal": rank_delta,
                "model_read": model_read,
                "candidate_movement": movement,
                "confidence": confidence,
                "review_flags": flags,
                "review_notes": join_flags(note, jo.get("notes", "")),
            }
        )

    def sort_key(row: Dict[str, str]) -> Tuple[str, int, int, str]:
        group = row.get("group_key", "")
        pre_rank = to_int(row.get("pre_jo_rank", "")) or 9999
        placement = to_int(row.get("jo_final_placement", "")) or 9999
        return group, pre_rank, placement, row.get("display_team_name", "")

    return sorted(output, key=sort_key)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build CPI pre-JO vs post-JO comparison CSV.")
    parser.add_argument("--prejo", type=Path, default=default_prejo_path(), help="Path to pre-jo-rankings.csv")
    parser.add_argument("--intake", type=Path, default=default_intake_path(), help="Path to post-jo-results-intake.csv")
    parser.add_argument("--output", type=Path, default=default_output_path(), help="Path for comparison CSV")
    args = parser.parse_args()

    missing = [str(path) for path in [args.prejo, args.intake] if not path.exists()]
    if missing:
        print("Missing required input file(s):")
        for path in missing:
            print(f"- {path}")
        print("Copy the .template.csv files in data/ranking-pipeline/post-jo/input/ and populate them first.")
        return 1

    prejo_rows = read_csv(args.prejo)
    jo_rows = read_csv(args.intake)
    output_rows = build_comparison(prejo_rows, jo_rows)
    write_csv(args.output, output_rows)
    print(f"Wrote comparison CSV: {args.output}")
    print(f"Rows: {len(output_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
