#!/usr/bin/env python3
"""Read public GitHub records into a bounded, source-linked dashboard snapshot."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "trureturing-live.v1"
ACTIVE = {"queued", "in_progress", "waiting", "pending", "requested"}
REFERENCE = re.compile(r"https://github\.com/([\w.-]+/[\w.-]+)/(issues|pull)/(\d+)(?:#[\w-]+)?|(?<![\w/])([\w.-]+/[\w.-]+)#(\d+)")
SESSION = re.compile(r"(?:\*\*)?(?:Session|会话)(?:\*\*)?\s*[:：·]\s*(?:\*\*)?\s*`?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", re.I)


class SourceError(RuntimeError):
    pass


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


class GitHub:
    def __init__(self, token: str = "", budget: int = 75):
        self.token = token
        self.budget = budget
        self.requests = 0
        self.lock = threading.Lock()

    def get(self, path: str, params: dict | None = None):
        with self.lock:
            if self.requests >= self.budget:
                raise SourceError("collection request budget reached")
            self.requests += 1
        url = "https://api.github.com" + path + ("?" + urlencode(params) if params else "")
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "trureturing-live/1"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        for attempt in range(2):
            try:
                with urlopen(Request(url, headers=headers), timeout=25) as response:
                    return json.load(response), response.headers.get("Link", "")
            except HTTPError as exc:
                if exc.code in {502, 503, 504} and attempt == 0:
                    time.sleep(1)
                    continue
                raise SourceError(f"GitHub HTTP {exc.code}") from None
            except (URLError, TimeoutError, ValueError):
                if attempt == 0:
                    continue
                raise SourceError("GitHub request unavailable") from None

    def write(self, path: str, payload: dict, method: str = "POST") -> dict:
        # State publication is restricted to this observatory's Git database.
        if not path.startswith('/repos/the-omega-institute/trureturing-live/git/'):
            raise SourceError('state publication outside the observatory is forbidden')
        with self.lock:
            if self.requests >= self.budget:
                raise SourceError('collection request budget reached')
            self.requests += 1
        headers = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'trureturing-live/1', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.token}
        request = Request('https://api.github.com' + path, data=json.dumps(payload).encode(), headers=headers, method=method)
        try:
            with urlopen(request, timeout=25) as response:
                return json.load(response)
        except HTTPError as exc:
            raise SourceError(f'GitHub publication HTTP {exc.code}') from None


def references(text: str, owner: str) -> list[dict]:
    found = {}
    for match in REFERENCE.finditer(text or ""):
        repo = match[1] or match[4]
        if repo.split("/")[0].lower() != owner.lower():
            continue
        number = int(match[3] or match[5])
        route = match[2] or "issues"
        found[(repo, number)] = {"repository": repo, "number": number, "url": f"https://github.com/{repo}/{route}/{number}"}
    return list(found.values())[:30]


def task_record(item: dict, full_name: str, kind: str, owner: str) -> dict:
    body = (item.get("body") or "")[:100000]
    session = SESSION.search(body)
    return {
        "id": f"{full_name}#{item['number']}", "repository": full_name, "number": item["number"],
        "kind": kind, "title": item["title"][:500], "state": item["state"],
        "url": item["html_url"], "created_at": item["created_at"], "updated_at": item["updated_at"],
        "draft": bool(item.get("draft")), "author": (item.get("user") or {}).get("login"),
        "assignees": [user["login"] for user in item.get("assignees", [])],
        "labels": [label["name"] for label in item.get("labels", [])],
        "head_sha": (item.get("head") or {}).get("sha"),
        "references": references(body, owner),
        "declared_session": session[1] if session else None,
        "session_source_url": item["html_url"] if session else None,
        "comments": item.get("comments", 0),
    }


def run_record(item: dict, full_name: str) -> dict:
    return {
        "id": item["id"], "repository": full_name, "name": item.get("name") or "Workflow",
        "title": item.get("display_title") or item.get("name") or "Workflow",
        "status": item["status"], "conclusion": item.get("conclusion"), "event": item["event"],
        "branch": item.get("head_branch"), "head_sha": item["head_sha"], "url": item["html_url"],
        "actor": (item.get("actor") or {}).get("login"), "attempt": item.get("run_attempt", 1),
        "created_at": item["created_at"], "updated_at": item["updated_at"],
        "started_at": item.get("run_started_at"),
        "pull_requests": [pr["number"] for pr in item.get("pull_requests", [])],
    }


def collect_repository(api: GitHub, owner: str, spec: dict, metadata: dict | None = None) -> dict:
    full_name = owner + "/" + spec["name"]
    base = "/repos/" + full_name
    result = {**spec, "full_name": full_name, "url": "https://github.com/" + full_name,
              "observed_at": now(), "available": False, "runs": [], "tasks": [], "coverage": {}, "errors": []}
    try:
        meta = metadata
        if meta is None:
            meta, _ = api.get(base)
        if meta.get("private") or meta.get("visibility", "public") != "public":
            result["errors"].append("not a public repository; excluded")
            return result
        result["available"] = True
        result["default_branch"] = meta["default_branch"]
        result["archived"] = meta.get("archived", False)
        result["open_items_count"] = meta.get("open_issues_count")
    except SourceError as exc:
        result["errors"].append(str(exc))
        return result

    runs = {}
    statuses = [None, "in_progress"]
    if spec["name"] in {"trureturing", "trureturing-books"}:
        statuses += ["queued", "waiting"]
    for status in statuses:
        key = "recent_runs" if status is None else "runs_" + status
        params = {"per_page": 50 if status is None else 100}
        if status:
            params["status"] = status
        try:
            items, links = api.get(base + "/actions/runs", params)
            rows = items.get("workflow_runs", [])
            for row in rows:
                runs[row["id"]] = run_record(row, full_name)
            result["coverage"][key] = {"returned": len(rows), "total": items.get("total_count"), "truncated": 'rel="next"' in links}
        except SourceError as exc:
            result["errors"].append(key + ": " + str(exc))
            result["coverage"][key] = {"unavailable": True}
    result["runs"] = sorted(runs.values(), key=lambda row: row["updated_at"], reverse=True)

    for endpoint, kind, limit in [("issues", "issue", 60), ("pulls", "pull", 30)]:
        if kind == "pull" and meta.get("open_issues_count") == 0:
            result["coverage"][endpoint] = {"returned": 0, "scope": "public inventory reports zero open issues and pull requests"}
            continue
        try:
            items, links = api.get(base + "/" + endpoint, {"state": "all" if kind == "issue" else "open", "sort": "updated", "direction": "desc", "per_page": limit})
            rows = [item for item in items if kind == "pull" or "pull_request" not in item]
            result["tasks"].extend(task_record(item, full_name, kind, owner) for item in rows)
            result["coverage"][endpoint] = {"returned": len(rows), "truncated": 'rel="next"' in links, "scope": "recently updated" if kind == "issue" else "open pull requests"}
        except SourceError as exc:
            result["errors"].append(endpoint + ": " + str(exc))
            result["coverage"][endpoint] = {"unavailable": True}

    # A small, explicit sample of recent public comments supplies cross-repository
    # handoffs. No private trackers, messages, logs, or raw comment bodies are exported.
    comment_limit = 4 if spec["name"] == "trureturing-requests" else 2 if spec["name"] == "trureturing" else 0
    comment_tasks = sorted((task for task in result["tasks"] if task["kind"] == "issue" and task["comments"]), key=lambda task: task["updated_at"], reverse=True)[:comment_limit]
    for task in comment_tasks:
        try:
            page = max(1, (task["comments"] + 99) // 100)
            comments, _ = api.get(base + f"/issues/{task['number']}/comments", {"per_page": 100, "page": page})
            known = {(ref["repository"], ref["number"]) for ref in task["references"]}
            for comment in comments[-10:]:
                body = (comment.get("body") or "")[:100000]
                for ref in references(body, owner):
                    if (ref["repository"], ref["number"]) not in known:
                        task["references"].append({**ref, "evidence_url": comment["html_url"]})
                        known.add((ref["repository"], ref["number"]))
                session = SESSION.search(body)
                if session:
                    task["declared_session"] = session[1]
                    task["session_source_url"] = comment["html_url"]
            task["comments_observed"] = len(comments[-10:])
        except SourceError as exc:
            result["errors"].append(f"issue #{task['number']} comments: {exc}")
    result["observed_at"] = now()
    return result


def discover_repositories(api: GitHub, config: dict) -> tuple[list[dict], dict[str, dict]]:
    """Read one public organization inventory; never probe private repositories."""
    policy = config["discovery"]
    metadata = {}
    for page in range(1, 6):
        rows, links = api.get(f"/orgs/{config['owner']}/repos", {"type": "public", "per_page": 100, "page": page})
        for row in rows:
            name = row["name"]
            if row.get("private") or row.get("visibility", "public") != "public":
                continue
            if any(name.startswith(prefix) for prefix in policy["prefixes"]) or name in policy["include"]:
                metadata[name] = row
        if 'rel="next"' not in links:
            break
    else:
        raise SourceError("public repository discovery exceeded its bound; retain the existing publication")
    overrides = {spec["name"]: spec for spec in config["repositories"]}
    labels = {
        "mathesis": ("论文与研究笔记", "MATHESIS"),
        "trureturing-mdbook": ("Blueprint 阅读", "BLUEPRINT"),
        "trureturing-intuition": ("直觉与问题", "INTUITION"),
        "trureturing-film": ("研究影像", "FILM"),
        "trureturing-visualize": ("交互解释", "VISUALIZE"),
        "trureturing-lean-eval": ("形式化评测", "LEAN EVAL"),
        "trureturing-books-template": ("书籍模板", "TEMPLATES"),
        "trureturing-live": ("研究观测", "LIVE"),
    }
    names = sorted(metadata, key=lambda name: (0 if name == "trureturing" else 1 if name == "trureturing-books" else 2, name))
    specs = []
    for name in names:
        label, short = labels.get(name, (name.removeprefix("trureturing-").replace("-", " "), "REPOSITORY"))
        specs.append(overrides.get(name, {"name": name, "label": label, "short": short, "description": metadata[name].get("description") or "公开仓库的工作流、课题与交付"}))
    if not specs:
        raise SourceError("public repository discovery returned no related repositories")
    return specs, metadata


def collect(api: GitHub, config: dict) -> dict:
    owner = config["owner"]
    if not re.fullmatch(r"[\w-]+", owner):
        raise ValueError("invalid repository owner")
    specs = config["repositories"]
    metadata = {}
    if config.get("discovery"):
        specs, metadata = discover_repositories(api, config)
    for spec in specs:
        if not re.fullmatch(r"[\w.-]+", spec["name"]):
            raise ValueError("invalid repository name")
    with ThreadPoolExecutor(max_workers=4) as pool:
        repos = list(pool.map(lambda spec: collect_repository(api, owner, spec, metadata.get(spec["name"])), specs))
    if not any(repo["available"] and (repo["runs"] or repo["tasks"]) for repo in repos):
        raise SourceError("no usable public source data; the existing publication must be retained")
    return {"schema": SCHEMA, "collected_at": now(), "refresh_interval_seconds": config["refresh_interval_seconds"],
            "owner": owner, "requests_used": api.requests, "repositories": repos,
            "discovery": config.get("discovery"),
            "scope": "Related public GitHub repositories are discovered by prefix and explicit inclusion. Each repository samples 50 recent runs and up to 100 in-progress runs; Core and Books additionally query queued and waiting runs. Tasks and comments are sampled. Workflow success is an execution result, not a mathematical publication attestation. No agent heartbeat source is connected."}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "config.json")
    parser.add_argument("--output", type=Path, default=ROOT / "site/data/snapshot.json")
    parser.add_argument("--use-gh", action="store_true", help="read the local gh credential into this process only")
    args = parser.parse_args()
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    if args.use_gh and not token:
        token = subprocess.run(["gh", "auth", "token"], check=True, capture_output=True, text=True).stdout.strip()
    snapshot = collect(GitHub(token), json.loads(args.config.read_text()))
    try:
        request = Request('https://www.trureturing.org/assets/publication-index.json', headers={'User-Agent': 'trureturing-live/1'})
        with urlopen(request, timeout=20) as response:
            publication_index = json.load(response)
        snapshot['publications'] = publication_index['publications']
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError):
        snapshot['publications'] = []
    snapshot['editorial'] = json.loads((ROOT / 'editorial.json').read_text())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n")
    temporary.replace(args.output)
    print(f"Collected {len(snapshot['repositories'])} repositories in {snapshot['requests_used']} requests; {sum(bool(repo['errors']) for repo in snapshot['repositories'])} repositories have partial/unavailable sources.")


if __name__ == "__main__":
    main()
