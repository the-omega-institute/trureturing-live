#!/usr/bin/env python3
"""Deterministic guardrails for Omega Live Ops caretaker workflows.

Covers:
1. `probe-live`: structured HTTP + JSON identity & freshness checks (distinguishing
   failed upstream sources from unavailable probes and local test failures).
2. `evaluate-health`: strict model verdict parsing (`healthy` | `anomaly` |
   `invalid_diagnosis`) that NEVER lets empty/malformed/disagreeing model output
   suppress a real probe failure.
3. `export-patch`: untrusted-side patch export that inspects modified, added,
   untracked, renamed (both ends), and deleted files, refusing any out-of-scope
   path or symlink before creating an artifact.
4. `verify-patch`: trusted-side independent diff parser + SHA-256 + base SHA +
   symlink/submodule/path-scope verifier + clean `git apply` + post-apply check.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

USER_AGENT = "omega-live-caretaker/1.0"
DIFF_HEADER_RE = re.compile(r"^diff --git a/(.+) b/(.+)$")
RENAME_FROM_RE = re.compile(r"^rename from (.+)$")
RENAME_TO_RE = re.compile(r"^rename to (.+)$")
COPY_FROM_RE = re.compile(r"^copy from (.+)$")
COPY_TO_RE = re.compile(r"^copy to (.+)$")
FORBIDDEN_MODE_RE = re.compile(r"^(?:new|old) file mode (?:120000|160000)$|^index [0-9a-f]+\.\.[0-9a-f]+ (?:120000|160000)$")


def _parse_iso(ts: str) -> datetime:
    if not isinstance(ts, str) or not ts.strip():
        raise ValueError("missing timestamp")
    normalized = ts.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _fetch_url(url: str, timeout: int = 15) -> tuple[int | None, bytes, str | None, str]:
    """Return (http_status, body_bytes, error_detail, error_category)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(), None, "ok"
    except urllib.error.HTTPError as exc:
        return exc.code, b"", f"HTTP {exc.code}", "failed_source"
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return None, b"", f"{type(exc).__name__}: {exc}", "probe_unavailable"


def probe_live(
    *,
    site_url: str,
    snapshot_url: str,
    nebula_url: str,
    atlas_url: str,
    expected_owner: str,
    max_stale_hours: float,
    npm_rc: int,
    py_rc: int,
    js_rc: int,
    now: datetime | None = None,
    fetcher=_fetch_url,
) -> dict[str, Any]:
    now_dt = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    failures: list[dict[str, str]] = []
    checks: dict[str, Any] = {
        "local": {"npm_rc": npm_rc, "py_rc": py_rc, "js_rc": js_rc},
    }

    for label, rc in (("npm_ci", npm_rc), ("python_tests", py_rc), ("js_tests", js_rc)):
        if rc != 0:
            failures.append(
                {
                    "check": label,
                    "category": "local_check_failed",
                    "detail": f"{label} exited with code {rc}",
                }
            )

    # 1. Live HTML shell check
    status, body, err, cat = fetcher(site_url)
    html = body.decode("utf-8", "replace")
    html_ok = status == 200 and "TRURETURING" in html and "assets/app.mjs" in html
    checks["site_html"] = {"url": site_url, "status": status, "ok": html_ok}
    if not html_ok:
        failures.append(
            {
                "check": "site_html",
                "category": cat if err else "failed_source",
                "detail": err or f"HTTP {status} missing expected observatory shell markers",
            }
        )

    # 2. Live snapshot.json identity + freshness check
    status, body, err, cat = fetcher(snapshot_url)
    snap_info: dict[str, Any] = {"url": snapshot_url, "status": status, "ok": False}
    if err or status != 200:
        failures.append(
            {
                "check": "snapshot_json",
                "category": cat if err else "failed_source",
                "detail": err or f"HTTP {status}",
            }
        )
    else:
        try:
            snap = json.loads(body.decode("utf-8"))
            schema = snap.get("schema")
            owner = snap.get("owner")
            collected_at = snap.get("collected_at")
            repos = snap.get("repositories")
            collected_dt = _parse_iso(collected_at)
            age_hours = (now_dt - collected_dt).total_seconds() / 3600.0
            snap_info.update(
                {
                    "schema": schema,
                    "owner": owner,
                    "collected_at": collected_at,
                    "age_hours": round(age_hours, 2),
                    "repo_count": len(repos) if isinstance(repos, list) else 0,
                }
            )
            if schema != "trureturing-live.v1":
                failures.append(
                    {
                        "check": "snapshot_json",
                        "category": "failed_source",
                        "detail": f"Unexpected snapshot schema: {schema!r}",
                    }
                )
            elif owner != expected_owner:
                failures.append(
                    {
                        "check": "snapshot_json",
                        "category": "failed_source",
                        "detail": f"Unexpected snapshot owner: {owner!r} (expected {expected_owner!r})",
                    }
                )
            elif not isinstance(repos, list) or len(repos) == 0:
                failures.append(
                    {
                        "check": "snapshot_json",
                        "category": "failed_source",
                        "detail": "Snapshot repositories list is empty",
                    }
                )
            elif age_hours > max_stale_hours:
                failures.append(
                    {
                        "check": "snapshot_json",
                        "category": "failed_source",
                        "detail": f"Snapshot is stale ({age_hours:.2f}h old > {max_stale_hours}h limit)",
                    }
                )
            else:
                snap_info["ok"] = True
        except Exception as exc:
            failures.append(
                {
                    "check": "snapshot_json",
                    "category": "failed_source",
                    "detail": f"Invalid snapshot JSON/timestamp: {exc}",
                }
            )
    checks["snapshot_json"] = snap_info

    # 3. Live truth-nebula.v1.json check
    status, body, err, cat = fetcher(nebula_url)
    neb_info: dict[str, Any] = {"url": nebula_url, "status": status, "ok": False}
    if err or status != 200:
        failures.append(
            {
                "check": "nebula_json",
                "category": cat if err else "failed_source",
                "detail": err or f"HTTP {status}",
            }
        )
    else:
        try:
            neb = json.loads(body.decode("utf-8"))
            sv = neb.get("schema_version")
            clusters = neb.get("clusters")
            stars = neb.get("stars")
            neb_info.update(
                {
                    "schema_version": sv,
                    "cluster_count": len(clusters) if isinstance(clusters, list) else 0,
                    "star_count": len(stars) if isinstance(stars, list) else 0,
                }
            )
            if sv != "trureturing-truth-nebula.v1" or not clusters or not stars:
                failures.append(
                    {
                        "check": "nebula_json",
                        "category": "failed_source",
                        "detail": f"Malformed truth-nebula payload (schema={sv!r}, clusters={neb_info['cluster_count']}, stars={neb_info['star_count']})",
                    }
                )
            else:
                neb_info["ok"] = True
        except Exception as exc:
            failures.append(
                {
                    "check": "nebula_json",
                    "category": "failed_source",
                    "detail": f"Invalid truth-nebula JSON: {exc}",
                }
            )
    checks["nebula_json"] = neb_info

    # 4. Upstream atlas-startup.v1.json check
    status, body, err, cat = fetcher(atlas_url)
    atlas_info: dict[str, Any] = {"url": atlas_url, "status": status, "ok": False}
    if err or status != 200:
        failures.append(
            {
                "check": "atlas_json",
                "category": cat if err else "failed_source",
                "detail": err or f"HTTP {status}",
            }
        )
    else:
        try:
            atlas = json.loads(body.decode("utf-8"))
            sv = atlas.get("schema_version")
            graph = atlas.get("graph")
            details = atlas.get("details")
            atlas_info.update(
                {
                    "schema_version": sv,
                    "detail_count": len(details) if isinstance(details, list) else 0,
                    "has_graph": isinstance(graph, dict) and len(graph) > 0,
                }
            )
            if sv != "pages-atlas-startup.v1" or not atlas_info["has_graph"] or atlas_info["detail_count"] == 0:
                failures.append(
                    {
                        "check": "atlas_json",
                        "category": "failed_source",
                        "detail": f"Malformed upstream atlas payload (schema={sv!r})",
                    }
                )
            else:
                atlas_info["ok"] = True
        except Exception as exc:
            failures.append(
                {
                    "check": "atlas_json",
                    "category": "failed_source",
                    "detail": f"Invalid upstream atlas JSON: {exc}",
                }
            )
    checks["atlas_json"] = atlas_info

    return {
        "checked_at": now_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "all_passed": len(failures) == 0,
        "failures": failures,
        "checks": checks,
    }


def parse_model_verdict(raw_text: str | None, model_rc: int = 0) -> tuple[str, str]:
    """Return (model_status, report_body) where model_status is one of:
    'healthy', 'anomaly', 'invalid_diagnosis'.
    """
    if model_rc != 0:
        return "invalid_diagnosis", f"Model execution failed with exit code {model_rc}."
    if raw_text is None:
        return "invalid_diagnosis", "Model output file is missing."

    lines = [ln.rstrip("\r") for ln in raw_text.splitlines()]
    non_empty_idx = [i for i, ln in enumerate(lines) if ln.strip()]
    if not non_empty_idx:
        return "invalid_diagnosis", "Model produced empty output."

    first_idx = non_empty_idx[0]
    first_line = lines[first_idx].strip()
    rest = "\n".join(lines[first_idx + 1 :]).strip()

    if first_line == "HEALTHY":
        if rest:
            return (
                "invalid_diagnosis",
                f"Malformed HEALTHY response contained unexpected trailing text: {rest[:200]}",
            )
        return "healthy", ""

    if first_line == "ALERT":
        if not rest:
            return "invalid_diagnosis", "Model returned ALERT without a diagnostic body."
        return "anomaly", rest

    return (
        "invalid_diagnosis",
        f"Unrecognized model verdict line: {first_line[:120]!r}",
    )


def evaluate_health(probe: dict[str, Any], raw_model_text: str | None, model_rc: int = 0) -> dict[str, Any]:
    """Combine deterministic probe results with strict model verdict parsing."""
    probe_failures: list[dict[str, str]] = list(probe.get("failures") or [])
    model_status, model_report = parse_model_verdict(raw_model_text, model_rc=model_rc)

    if probe_failures:
        verdict = "anomaly"
        lines = ["### Deterministic Probe Failures"]
        for item in probe_failures:
            lines.append(
                f"- `{item.get('check', 'unknown')}` ({item.get('category', 'unknown')}): {item.get('detail', '')}"
            )
        lines.append("")
        if model_status == "anomaly":
            lines.append("### Caretaker Diagnosis")
            lines.append(model_report)
        elif model_status == "healthy":
            lines.append("### Caretaker Diagnosis Disagreement")
            lines.append("Model output reported `HEALTHY`, overridden by deterministic probe failures above.")
        else:
            lines.append("### Caretaker Diagnosis Error")
            lines.append(model_report)
        report_md = "\n".join(lines).strip()
    elif model_status == "healthy":
        verdict = "healthy"
        report_md = ""
    elif model_status == "anomaly":
        verdict = "anomaly"
        report_md = model_report
    else:
        verdict = "invalid_diagnosis"
        report_md = (
            "### Incomplete / Invalid Caretaker Diagnosis\n\n"
            f"- Deterministic probes passed, but model diagnosis was invalid: {model_report}\n"
            "- Refusing to mark observatory healthy until diagnosis succeeds cleanly."
        )

    return {
        "verdict": verdict,
        "model_status": model_status,
        "probe_all_passed": len(probe_failures) == 0,
        "probe_failures": probe_failures,
        "report_markdown": report_md,
    }


def _normalize_prefixes(prefixes: list[str]) -> list[str]:
    clean: list[str] = []
    for p in prefixes:
        norm = p.replace("\\", "/").lstrip("./")
        if not norm:
            raise ValueError("Empty allowed prefix")
        if not norm.endswith("/"):
            norm += "/"
        clean.append(norm)
    return clean


def is_allowed_path(rel_path: str, allowed_prefixes: list[str]) -> bool:
    if not rel_path or "\x00" in rel_path or rel_path.startswith("/") or "\\" in rel_path:
        return False
    parts = rel_path.split("/")
    if any(part in ("", ".", "..", ".git") for part in parts):
        return False
    return any(rel_path.startswith(prefix) for prefix in allowed_prefixes)


def parse_porcelain_z(raw: bytes) -> list[tuple[str, str, str | None]]:
    """Parse `git status --porcelain=v1 -z -uall` into (xy, path, orig_path)."""
    entries: list[tuple[str, str, str | None]] = []
    tokens = raw.split(b"\x00")
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        i += 1
        if not tok:
            continue
        text = tok.decode("utf-8", "surrogateescape")
        if len(text) < 4 or text[2] != " ":
            raise ValueError(f"Unexpected porcelain entry: {text!r}")
        xy = text[:2]
        path = text[3:]
        orig: str | None = None
        if "R" in xy or "C" in xy:
            if i >= len(tokens):
                raise ValueError("Truncated rename entry in porcelain output")
            orig = tokens[i].decode("utf-8", "surrogateescape")
            i += 1
        entries.append((xy, path, orig))
    return entries


def validate_diff_text(diff_text: str, allowed_prefixes: list[str]) -> list[str]:
    """Independently inspect unified diff headers and reject out-of-scope paths,
    symlinks, or submodules."""
    prefixes = _normalize_prefixes(allowed_prefixes)
    touched: set[str] = set()
    saw_header = False
    for line in diff_text.splitlines():
        if FORBIDDEN_MODE_RE.match(line):
            raise ValueError(f"Forbidden file mode in patch (symlink/submodule): {line}")
        m = DIFF_HEADER_RE.match(line)
        if m:
            saw_header = True
            a_path, b_path = m.group(1), m.group(2)
            for candidate in (a_path, b_path):
                if not is_allowed_path(candidate, prefixes):
                    raise ValueError(f"Out-of-scope path in patch header: {candidate!r}")
                touched.add(candidate)
            continue
        for rx in (RENAME_FROM_RE, RENAME_TO_RE, COPY_FROM_RE, COPY_TO_RE):
            rm = rx.match(line)
            if rm:
                candidate = rm.group(1)
                if not is_allowed_path(candidate, prefixes):
                    raise ValueError(f"Out-of-scope rename/copy path in patch: {candidate!r}")
                touched.add(candidate)
                break
    if diff_text.strip() and not saw_header:
        raise ValueError("Non-empty patch contains no valid `diff --git` headers")
    return sorted(touched)


def _git(repo_dir: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        ["git", *args],
        cwd=str(repo_dir),
        capture_output=True,
        check=check,
    )


def export_patch(
    *,
    repo_dir: Path,
    allowed_prefixes: list[str],
    out_patch: Path,
    out_manifest: Path,
) -> dict[str, Any]:
    prefixes = _normalize_prefixes(allowed_prefixes)
    base_sha = _git(repo_dir, "rev-parse", "HEAD").stdout.decode("utf-8").strip()
    raw_status = _git(repo_dir, "status", "--porcelain=v1", "-z", "-uall").stdout
    entries = parse_porcelain_z(raw_status)

    offending: list[str] = []
    untracked: list[str] = []
    changed_paths: set[str] = set()

    for xy, path, orig in entries:
        candidates = [path] + ([orig] if orig else [])
        for cand in candidates:
            if not is_allowed_path(cand, prefixes):
                offending.append(cand)
            else:
                changed_paths.add(cand)
            full = repo_dir / cand
            if full.is_symlink():
                offending.append(f"symlink:{cand}")
        if xy == "??":
            untracked.append(path)

    if offending:
        raise ValueError(f"Refusing out-of-scope or forbidden changes: {sorted(set(offending))}")

    if not changed_paths:
        out_patch.write_text("", encoding="utf-8")
        manifest = {
            "has_changes": False,
            "base_sha": base_sha,
            "allowed_prefixes": prefixes,
            "changed_paths": [],
            "patch_sha256": hashlib.sha256(b"").hexdigest(),
        }
        out_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        return manifest

    if untracked:
        _git(repo_dir, "add", "-N", "--", *untracked)

    diff_bytes = _git(repo_dir, "diff", "--binary", "--full-index", "--find-renames", "HEAD").stdout
    diff_text = diff_bytes.decode("utf-8", "surrogateescape")
    validated_paths = validate_diff_text(diff_text, prefixes)

    out_patch.write_bytes(diff_bytes)
    manifest = {
        "has_changes": len(validated_paths) > 0,
        "base_sha": base_sha,
        "allowed_prefixes": prefixes,
        "changed_paths": validated_paths,
        "patch_sha256": hashlib.sha256(diff_bytes).hexdigest(),
    }
    out_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def verify_and_apply_patch(
    *,
    repo_dir: Path,
    allowed_prefixes: list[str],
    patch_path: Path,
    manifest_path: Path,
) -> dict[str, Any]:
    prefixes = _normalize_prefixes(allowed_prefixes)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not manifest.get("has_changes"):
        return {"applied": False, "changed_paths": []}

    head_sha = _git(repo_dir, "rev-parse", "HEAD").stdout.decode("utf-8").strip()
    if manifest.get("base_sha") != head_sha:
        raise ValueError(f"Base SHA mismatch: manifest={manifest.get('base_sha')!r} vs HEAD={head_sha!r}")

    diff_bytes = patch_path.read_bytes()
    actual_sha = hashlib.sha256(diff_bytes).hexdigest()
    if manifest.get("patch_sha256") != actual_sha:
        raise ValueError("Patch SHA-256 mismatch against manifest")

    diff_text = diff_bytes.decode("utf-8", "surrogateescape")
    validated_paths = validate_diff_text(diff_text, prefixes)
    if not validated_paths:
        raise ValueError("Manifest claimed changes, but patch touched no paths")

    # Verify clean apply, then apply & re-verify working tree status post-apply
    _git(repo_dir, "apply", "--check", "--index", str(patch_path.resolve()))
    _git(repo_dir, "apply", "--index", str(patch_path.resolve()))

    post_entries = parse_porcelain_z(_git(repo_dir, "status", "--porcelain=v1", "-z", "-uall").stdout)
    post_paths: set[str] = set()
    for _xy, path, orig in post_entries:
        for cand in [path] + ([orig] if orig else []):
            if not is_allowed_path(cand, prefixes) or (repo_dir / cand).is_symlink():
                raise ValueError(f"Post-apply path scope violation: {cand!r}")
            post_paths.add(cand)

    return {"applied": True, "changed_paths": sorted(post_paths), "base_sha": head_sha}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_probe = sub.add_parser("probe-live")
    p_probe.add_argument("--site-url", default="https://live.trureturing.org/")
    p_probe.add_argument("--snapshot-url", default="https://live.trureturing.org/data/snapshot.json")
    p_probe.add_argument("--nebula-url", default="https://live.trureturing.org/data/truth-nebula.v1.json")
    p_probe.add_argument("--atlas-url", default="https://www.trureturing.org/data/atlas-startup.v1.json")
    p_probe.add_argument("--expected-owner", default="the-omega-institute")
    p_probe.add_argument("--max-stale-hours", type=float, default=6.0)
    p_probe.add_argument("--npm-rc", type=int, required=True)
    p_probe.add_argument("--py-rc", type=int, required=True)
    p_probe.add_argument("--js-rc", type=int, required=True)
    p_probe.add_argument("--out", required=True)

    p_eval = sub.add_parser("evaluate-health")
    p_eval.add_argument("--probe", required=True)
    p_eval.add_argument("--model-output", required=True)
    p_eval.add_argument("--model-rc", type=int, default=0)
    p_eval.add_argument("--out", required=True)

    p_exp = sub.add_parser("export-patch")
    p_exp.add_argument("--repo-dir", default=".")
    p_exp.add_argument("--allowed-prefix", action="append", required=True)
    p_exp.add_argument("--out-patch", required=True)
    p_exp.add_argument("--out-manifest", required=True)

    p_ver = sub.add_parser("verify-patch")
    p_ver.add_argument("--repo-dir", default=".")
    p_ver.add_argument("--allowed-prefix", action="append", required=True)
    p_ver.add_argument("--patch", required=True)
    p_ver.add_argument("--manifest", required=True)

    args = parser.parse_args(argv)

    if args.cmd == "probe-live":
        res = probe_live(
            site_url=args.site_url,
            snapshot_url=args.snapshot_url,
            nebula_url=args.nebula_url,
            atlas_url=args.atlas_url,
            expected_owner=args.expected_owner,
            max_stale_hours=args.max_stale_hours,
            npm_rc=args.npm_rc,
            py_rc=args.py_rc,
            js_rc=args.js_rc,
        )
        Path(args.out).write_text(json.dumps(res, indent=2) + "\n", encoding="utf-8")
        print(f"all_passed={str(res['all_passed']).lower()} failures={len(res['failures'])}")
        return 0

    if args.cmd == "evaluate-health":
        probe = json.loads(Path(args.probe).read_text(encoding="utf-8"))
        out_path = Path(args.model_output)
        raw_text = out_path.read_text(encoding="utf-8") if out_path.exists() else None
        result = evaluate_health(probe, raw_text, model_rc=args.model_rc)
        Path(args.out).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"verdict={result['verdict']}")
        print(f"model_status={result['model_status']}")
        return 0

    if args.cmd == "export-patch":
        try:
            manifest = export_patch(
                repo_dir=Path(args.repo_dir),
                allowed_prefixes=args.allowed_prefix,
                out_patch=Path(args.out_patch),
                out_manifest=Path(args.out_manifest),
            )
        except ValueError as exc:
            print(f"SCOPE_REJECTED: {exc}", file=sys.stderr)
            return 2
        print(f"has_changes={str(manifest['has_changes']).lower()}")
        print(f"changed_count={len(manifest['changed_paths'])}")
        return 0

    if args.cmd == "verify-patch":
        try:
            info = verify_and_apply_patch(
                repo_dir=Path(args.repo_dir),
                allowed_prefixes=args.allowed_prefix,
                patch_path=Path(args.patch),
                manifest_path=Path(args.manifest),
            )
        except (ValueError, subprocess.CalledProcessError) as exc:
            print(f"VERIFY_REJECTED: {exc}", file=sys.stderr)
            return 2
        print(f"applied={str(info['applied']).lower()}")
        print(f"changed_count={len(info['changed_paths'])}")
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
