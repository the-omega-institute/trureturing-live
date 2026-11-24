#!/usr/bin/env python3
"""Hourly rate-limit gate for the exclusive GitHub Pages deploy workflow.

Counts successful runs of the target workflow within the last rolling hour
(excluding the current run ID) and outputs allow_deploy=true|false so
deployments stay strictly within the GitHub Pages <= 10/hour budget.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.request
from typing import Iterable

DEFAULT_MAX_PER_HOUR = 10
WINDOW_SECONDS = 3600


def parse_iso_utc(value: str) -> dt.datetime | None:
    if not value:
        return None
    try:
        return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    except ValueError:
        return None


def count_recent_successful_runs(
    runs: Iterable[dict],
    *,
    now: dt.datetime,
    window_seconds: int = WINDOW_SECONDS,
    current_run_id: int | None = None,
) -> int:
    cutoff = now - dt.timedelta(seconds=window_seconds)
    count = 0
    for run in runs:
        if not isinstance(run, dict):
            continue
        run_id = run.get("id")
        if current_run_id is not None and run_id == current_run_id:
            continue
        if run.get("conclusion") != "success":
            continue
        stamp = parse_iso_utc(run.get("updated_at") or run.get("created_at") or "")
        if stamp is None:
            continue
        if stamp >= cutoff:
            count += 1
    return count


def evaluate_gate(
    runs: Iterable[dict],
    *,
    max_per_hour: int = DEFAULT_MAX_PER_HOUR,
    now: dt.datetime | None = None,
    current_run_id: int | None = None,
    force: bool = False,
) -> tuple[bool, int]:
    now_utc = now or dt.datetime.now(dt.timezone.utc)
    recent = count_recent_successful_runs(runs, now=now_utc, current_run_id=current_run_id)
    allow = True if force else recent < max_per_hour
    return allow, recent


def fetch_workflow_runs(repo: str, workflow_file: str, token: str, timeout: int = 15) -> list[dict]:
    url = (
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/runs"
        f"?status=completed&per_page=40"
    )
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "trureturing-live-pages-rate-gate/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    runs = payload.get("workflow_runs")
    return runs if isinstance(runs, list) else []


def write_github_output(path: str, values: dict[str, str]) -> None:
    if not path:
        return
    with open(path, "a", encoding="utf-8") as fh:
        for k, v in values.items():
            fh.write(f"{k}={v}\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Enforce max hourly deployments for GitHub Pages CI.")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    parser.add_argument("--workflow", default="pages.yml")
    parser.add_argument("--max-per-hour", type=int, default=DEFAULT_MAX_PER_HOUR)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    run_id_raw = os.environ.get("GITHUB_RUN_ID", "")
    current_run_id = int(run_id_raw) if run_id_raw.isdigit() else None

    allow = True
    recent = 0
    note = ""
    if not args.repo:
        note = "No GITHUB_REPOSITORY provided; allowing deploy."
    else:
        try:
            runs = fetch_workflow_runs(args.repo, args.workflow, token)
            allow, recent = evaluate_gate(
                runs,
                max_per_hour=args.max_per_hour,
                current_run_id=current_run_id,
                force=args.force,
            )
            if allow:
                note = f"Pages rate gate open: {recent}/{args.max_per_hour} successful deploys in the last hour."
            else:
                note = (
                    f"Pages rate gate throttled: {recent}/{args.max_per_hour} successful deploys "
                    "already completed in the last hour; skipping this deploy cleanly."
                )
        except Exception as exc:
            allow = True
            note = f"Pages rate gate API check unavailable ({exc}); failing open for this deploy."

    print(note)
    write_github_output(
        os.environ.get("GITHUB_OUTPUT", ""),
        {
            "allow_deploy": "true" if allow else "false",
            "recent_count": str(recent),
        },
    )
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY", "")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as fh:
            fh.write(f"### Pages Deploy Rate Gate\n\n- {note}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
