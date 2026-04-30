#!/usr/bin/env python3
"""Seed all phase slices as GitHub Issues on AdeniyiOnasanya/Portfolio.

Reads scripts/github/slices.json and creates one issue per slice with:
- Title from the slice header.
- Body composed of Outcome, Adds, Tests, and "Depends on #N" cross-references.
- Labels: type:task, area:<area>, priority:<priority>, phase:current for the
  active phase or phase:future otherwise, status:ready.
- Milestone matching the phase title from seed-milestones.sh.

Idempotent: skips creation if an issue with the exact title already exists.
After creation, a second pass edits bodies that reference unresolved
"Depends on" slice ids so they point at the actual issue numbers.

Usage:
    python3 scripts/github/seed-issues.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable

REPO = "AdeniyiOnasanya/Portfolio"
HERE = Path(__file__).resolve().parent
SLICES_PATH = HERE / "slices.json"

PHASE_MILESTONES = {
    0: "Phase 0: Repo bootstrap and protection",
    1: "Phase 1: Quality gates and forbidden-chars guard",
    2: "Phase 2: Tokens, fonts, theme, base layout",
    3: "Phase 3: Content schema, loaders, seed content",
    4: "Phase 4: Public site shell",
    5: "Phase 5: Cinema layer",
    6: "Phase 6: Auth.js v5 magic-link sign-in",
    7: "Phase 7: Admin shell, editors, draft persistence",
    8: "Phase 8: GitHub commit pipeline",
    9: "Phase 9: SEO surface",
    10: "Phase 10: Contact, analytics, error monitoring",
    11: "Phase 11: Lighthouse CI budget gate",
    12: "Phase 12: End-to-end Playwright on publish flow",
    13: "Phase 13: Hardening, a11y audit, content review, launch",
}

FORBIDDEN_PATTERN = re.compile(r"[—]")


def gh(*args: str, input_str: str | None = None) -> str:
    """Run gh CLI, return stdout, raise on error."""
    result = subprocess.run(
        ["gh", *args],
        input=input_str,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(f"gh {' '.join(args)} failed:\n{result.stderr}\n")
        result.check_returncode()
    return result.stdout


def existing_issue_titles() -> dict[str, int]:
    """Return a map of issue title to issue number for all open + closed issues."""
    out = gh(
        "issue",
        "list",
        "--repo",
        REPO,
        "--state",
        "all",
        "--limit",
        "1000",
        "--json",
        "number,title",
    )
    items = json.loads(out)
    return {item["title"]: int(item["number"]) for item in items}


def render_body(slice_obj: dict, depends_refs: list[str]) -> str:
    """Render the issue body for a slice."""
    body_parts = [
        "## Outcome",
        "",
        slice_obj["outcome"],
        "",
        "## Adds",
        "",
        slice_obj["adds"],
        "",
        "## Tests",
        "",
        slice_obj["tests"],
    ]
    if depends_refs:
        body_parts.extend(["", "## Depends on", "", ", ".join(depends_refs)])
    body_parts.extend(
        [
            "",
            "---",
            "",
            "Source: `phase-slices.md`. No em-dash, no emoji.",
        ]
    )
    body = "\n".join(body_parts)
    if FORBIDDEN_PATTERN.search(body):
        raise SystemExit(
            f"slice {slice_obj['id']} body contains a forbidden character"
        )
    return body


def labels_for(slice_obj: dict, current_phase: int) -> list[str]:
    phase_label = "phase:current" if slice_obj["phase"] == current_phase else "phase:future"
    return [
        "type:task",
        f"area:{slice_obj['area']}",
        f"priority:{slice_obj['priority']}",
        phase_label,
        "status:ready",
    ]


def create_issue(slice_obj: dict, body: str, current_phase: int, dry_run: bool) -> int:
    title = slice_obj["title"]
    milestone = PHASE_MILESTONES[slice_obj["phase"]]
    label_args: list[str] = []
    for label in labels_for(slice_obj, current_phase):
        label_args.extend(["--label", label])
    cmd = [
        "issue",
        "create",
        "--repo",
        REPO,
        "--title",
        title,
        "--body",
        body,
        "--milestone",
        milestone,
        *label_args,
    ]
    if dry_run:
        print(f"  DRY RUN create: {title}")
        return -1
    out = gh(*cmd)
    # gh prints the issue URL on the last line.
    last = out.strip().splitlines()[-1]
    issue_number = int(last.rsplit("/", 1)[-1])
    return issue_number


def edit_body(issue_number: int, body: str, dry_run: bool) -> None:
    if dry_run:
        print(f"  DRY RUN edit body of #{issue_number}")
        return
    gh(
        "issue",
        "edit",
        str(issue_number),
        "--repo",
        REPO,
        "--body",
        body,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    data = json.loads(SLICES_PATH.read_text())
    current_phase = int(data["current_phase"])
    slices = data["slices"]

    print(f"Loaded {len(slices)} slices, current_phase={current_phase}")

    existing = existing_issue_titles()
    print(f"Repo currently has {len(existing)} issues.")

    # Pass 1: create issues without resolved depends links yet (use placeholders).
    slice_to_issue: dict[str, int] = {}
    for s in slices:
        title = s["title"]
        if title in existing:
            issue_number = existing[title]
            print(f"  skip (exists #{issue_number}): {title[:80]}")
            slice_to_issue[s["id"]] = issue_number
            continue
        # Placeholder body without resolved cross-refs.
        placeholder_refs = [f"slice {dep}" for dep in s["depends"]]
        body = render_body(s, placeholder_refs)
        issue_number = create_issue(s, body, current_phase, args.dry_run)
        if issue_number > 0:
            slice_to_issue[s["id"]] = issue_number
            print(f"  created #{issue_number}: {title[:80]}")

    if args.dry_run:
        print("Dry run complete.")
        return 0

    # Pass 2: re-render bodies with real "#N" cross-refs and patch any issue that
    # has dependencies. (Skip if no dependencies, no need to edit.)
    for s in slices:
        if not s["depends"]:
            continue
        if s["id"] not in slice_to_issue:
            continue
        issue_number = slice_to_issue[s["id"]]
        resolved_refs: list[str] = []
        for dep in s["depends"]:
            dep_issue = slice_to_issue.get(dep)
            if dep_issue is None:
                resolved_refs.append(f"slice {dep} (unresolved)")
            else:
                resolved_refs.append(f"#{dep_issue}")
        body = render_body(s, resolved_refs)
        edit_body(issue_number, body, args.dry_run)
        print(f"  patched depends on #{issue_number}: {', '.join(resolved_refs)}")

    print(f"Done. {len(slice_to_issue)} issues mapped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
