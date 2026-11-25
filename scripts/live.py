#!/usr/bin/env python3
"""Continuously observe public collaboration, publishing a current-state pointer."""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import re
import time
from urllib.error import URLError

from foundation import FoundationReader

from collect import GitHub, SourceError, references, run_record, SESSION

ROOT = Path(__file__).resolve().parents[1]
BRANCH = "live-data"
MARKER = "Live data: "
STATE_REPO = "the-omega-institute/trureturing-live"
SCHEMA = "trureturing-live-stream.v1"
README = "# Current public observation\n\nThis machine-owned branch contains only the latest public observation. Its orphan commit is replaced by the single live observer. Do not place source or human work here. Original discussions and reviews remain on their linked GitHub sources.\n"


def excerpt(body: str, limit: int = 900) -> str:
    # Display public prose as plain text, without executable Markdown, code dumps,
    # local paths, credential-like strings or user contact details.
    body = re.sub(r"```[\s\S]*?(?:```|$)", " [代码见原记录] ", body or "")
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", body)
    body = re.sub(r"(?:gh[pousr]_[\w]+|github_pat_[\w]+|sk-[\w-]{16,})", "[已省略凭据样式文本]", body)
    body = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[联系地址见原记录]", body)
    body = re.sub(r"/(?:Users|home|tmp)/[^\s`]+", "[本地路径]", body)
    body = re.sub(r"[*`#]+", "", body)
    return re.sub(r"\s+", " ", body).strip()[:limit]


def message_record(item: dict, repository: str, kind: str, owner: str) -> dict:
    body = item.get("body") or ""
    session = SESSION.search(body)
    issue_url = item.get("issue_url") or item.get("pull_request_url") or ""
    number = int(issue_url.rstrip("/").split("/")[-1])
    mentions = sorted(set(re.findall(r"(?<![\w/])@([A-Za-z0-9][A-Za-z0-9-]{0,38})(?![\w.])", body)))[:8]
    return {
        "id": f"{repository}:{kind}:{item['id']}", "kind": kind, "repository": repository,
        "number": number, "thread": f"{repository}#{number}",
        "thread_url": f"https://github.com/{repository}/issues/{number}",
        "url": item["html_url"], "actor": (item.get("user") or {}).get("login") or "unknown",
        "session": session[1] if session else None, "mentions": mentions,
        "created_at": item["created_at"], "updated_at": item["updated_at"],
        "text": excerpt(body), "references": references(body, owner),
    }


class Publisher:
    """Only replace the explicitly machine-owned, unprotected state branch."""
    def __init__(self, api: GitHub):
        self.api = api
        self.head = None
        self.checked = False

    def publish(self, snapshot: dict, checkpoint: dict | None = None):
        if checkpoint is not None:
            records = [head['event'] for head in checkpoint.get('heads', {}).values()] + checkpoint.get('recent', [])
            if checkpoint.get('schema') != 'ai-org.checkpoint.v1' or any(event.get('kind') in {'session', 'delivery'} or (event.get('actor') or {}).get('tool') for event in records):
                raise SourceError('only public GitHub recovery metadata may be published')
        base = "/repos/" + STATE_REPO
        try:
            ref, _ = self.api.get(base + "/git/ref/heads/" + BRANCH)
            current = ref["object"]["sha"]
        except SourceError as exc:
            if str(exc) != "GitHub HTTP 404":
                raise
            current = None
        if self.checked and current != self.head:
            raise SourceError("live-data was changed by another writer; refusing to overwrite it")
        if current and not self.checked:
            commit, _ = self.api.get(base + "/git/commits/" + current)
            if not commit["message"].startswith(MARKER) or commit.get("parents"):
                raise SourceError("live-data is not an owned observation pointer")
        entries = [
            {"path": "live.json", "mode": "100644", "type": "blob", "content": json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n"},
            {"path": "README.md", "mode": "100644", "type": "blob", "content": README},
        ]
        if checkpoint is not None:
            entries.append({'path': 'organization-checkpoint.json', 'mode': '100644', 'type': 'blob', 'content': json.dumps(checkpoint, ensure_ascii=False, separators=(',', ':')) + '\n'})
        tree = self.api.write(base + "/git/trees", {"tree": entries})
        commit = self.api.write(base + "/git/commits", {"message": MARKER + snapshot["observed_at"], "tree": tree["sha"], "parents": []})
        if current:
            self.api.write(base + "/git/refs/heads/" + BRANCH, {"sha": commit["sha"], "force": True}, method="PATCH")
        else:
            self.api.write(base + "/git/refs", {"ref": "refs/heads/" + BRANCH, "sha": commit["sha"]})
        self.head, self.checked = commit["sha"], True


FROZEN_STATE = 'Golden/Frozen/state/'
GROWTH_KEEP = 120
COMPARE_FILE_LIMIT = 300


def frozen_module(path: str) -> str | None:
    """The D5 module whose frozen state file this path is, or None."""
    if not path.startswith(FROZEN_STATE) or not path.endswith('.lean.json'):
        return None
    module = path[len(FROZEN_STATE):-len('.lean.json')]
    return module if module.startswith('D5/') else None


def growth_record(module: str, at: str, commit: str) -> dict:
    parts = module.split('/')
    return {'module': module, 'domain': parts[2] if len(parts) > 3 else 'Other',
            'stratum': parts[1] if len(parts) > 1 else '', 'at': at, 'commit': commit}


class TruthGrowth:
    """Newly frozen D5 modules on the truth repository's integration branch.

    Each observation reads the branch head; when it moved forward, one comparison
    lists the frozen state files it added. The first observation records the
    frontier without replaying history, and a rewritten branch resets it.
    """

    def __init__(self, api, repository: str, branch: str, saved: dict | None = None):
        saved = saved or {}
        if saved.get('repository') not in {None, repository} or saved.get('branch') not in {None, branch}:
            saved = {}
        self.api, self.repository, self.branch = api, repository, branch
        self.head = saved.get('head')
        self.events = list(saved.get('events') or [])[-GROWTH_KEEP:]
        self.truncated = bool(saved.get('truncated'))

    def observe(self) -> None:
        reading, _ = self.api.get(f'/repos/{self.repository}/branches/{self.branch}')
        head = reading['commit']['sha']
        if not self.head or head == self.head:
            self.head = head
            return
        comparison, _ = self.api.get(f'/repos/{self.repository}/compare/{self.head}...{head}')
        self.head = head
        if comparison.get('status') != 'ahead':
            return
        at = reading['commit']['commit']['committer']['date']
        files = comparison.get('files') or []
        self.truncated = len(files) >= COMPARE_FILE_LIMIT or comparison.get('total_commits', 0) > len(comparison.get('commits') or [])
        known = {event['module'] for event in self.events}
        for item in files:
            module = frozen_module(item.get('filename', '')) if item.get('status') == 'added' else None
            if module and module not in known:
                self.events.append(growth_record(module, at, head))
                known.add(module)
        self.events = self.events[-GROWTH_KEEP:]

    def snapshot(self) -> dict:
        return {'repository': self.repository, 'branch': self.branch, 'head': self.head,
                'events': self.events, 'truncated': self.truncated}


class Observer:
    def __init__(self, api: GitHub, config: dict):
        self.api, self.config = api, config
        self.messages, self.runs, self.coverage = {}, {}, {}
        self.loaded_sources = {}
        # The truth repository whose frozen modules grow the DAG is declared by this deployment.
        target = config.get('truth_growth') or {}
        self.growth_target = (target['repository'], target['branch']) if target else None
        self.growth = TruthGrowth(api, *self.growth_target) if self.growth_target else None
        try:
            previous, _ = api.get('/repos/' + STATE_REPO + '/contents/live.json', {'ref': BRANCH})
            if previous.get('encoding') not in {None, 'base64'}:
                previous, _ = api.get('/repos/' + STATE_REPO + '/git/blobs/' + previous['sha'])
            saved = json.loads(base64.b64decode(previous['content']))
            if saved.get('schema') == SCHEMA:
                self.messages = {message['id']: message for message in saved.get('messages', [])}
                self.coverage = saved.get('coverage', {})
                self.runs = saved.get('focus_runs', {})
                if self.growth_target:
                    self.growth = TruthGrowth(api, *self.growth_target, saved.get('truth_growth'))
        except (SourceError, ValueError, KeyError):
            pass

    def observe(self, foundation) -> dict:
        view = foundation.collect()
        owner = self.config['owner']
        sources = foundation.config['sources']
        allowed = {source['repository'] for source in sources if source.get('repository')}
        self.messages = {key: value for key, value in self.messages.items() if value['repository'] in allowed}
        readings = {source['id']: source for source in view['sources']}
        for source in sources:
            reading = readings[source['id']]
            observed_at = reading.get('observed_at')
            if not observed_at or self.loaded_sources.get(source['id']) == observed_at:
                continue
            rows = foundation.rows(source)
            if rows is None:
                continue
            repo = source['repository']
            if source['kind'] in {'github_comments', 'github_reviews'}:
                kind = 'review_comment' if source['kind'] == 'github_reviews' else 'comment'
                for row in rows:
                    message = message_record(row, repo, kind, owner)
                    if message['text']:
                        self.messages[message['id']] = message
                if kind == 'comment':
                    self.coverage[repo] = {'observed_at': observed_at, 'comments_returned': len(rows), 'truncated': not reading['complete']}
            elif source['id'] in {'core-checks', 'book-checks'}:
                by_id = {}
                ranks = {'completed': 4, 'in_progress': 3}
                for row in rows:
                    order = (row['run_attempt'], row['updated_at'], ranks.get(row['status'], 2))
                    previous = by_id.get(row['id'])
                    if not previous or order > previous[0]:
                        by_id[row['id']] = (order, row)
                self.runs[repo] = {'observed_at': observed_at, 'runs': [run_record(row, repo) for _, row in by_id.values()]}
            self.loaded_sources[source['id']] = observed_at
        self.messages = dict(sorted(self.messages.items(), key=lambda pair: pair[1]['updated_at'], reverse=True)[:240])
        failures = foundation.statistics.get('failures', [])
        errors = [failure['source'] + ': ' + failure['reason'] for failure in failures]
        try:
            if self.growth:
                self.growth.observe()
        except (SourceError, KeyError, TypeError) as exc:
            errors.append('truth-growth: ' + (str(exc) if isinstance(exc, SourceError) else 'unexpected response'))
        return {'schema': SCHEMA, 'observed_at': view['observed_at'], 'interval_seconds': 60,
                'messages': list(self.messages.values()), 'focus_runs': self.runs,
                'coverage': self.coverage,
                'organization': view,
                'truth_growth': self.growth.snapshot() if self.growth else None,
                'errors': errors,
                'scope': 'Public GitHub collaboration and source-bound organization observations. Runtime sessions require their own explicitly authorized producer.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minutes', type=float, default=55)
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    api = GitHub(os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN') or '', budget=900)
    allowance, _ = api.get('/rate_limit')
    core = allowance['resources']['core']
    print(f"GitHub observation allowance: {core['remaining']} of {core['limit']} remaining; reset {core['reset']}", flush=True)
    observer = Observer(api, json.loads((ROOT / 'config.json').read_text()))
    publisher = Publisher(api)
    foundation = FoundationReader(api)
    end = time.monotonic() + args.minutes * 60
    try:
        while True:
            started = time.monotonic()
            try:
                snapshot = observer.observe(foundation)
                if args.output:
                    args.output.write_text(json.dumps(snapshot, ensure_ascii=False))
                else:
                    publisher.publish(snapshot, foundation.checkpoint)
                stats = foundation.statistics
                print(f"Published {snapshot['observed_at']}: {len(snapshot['messages'])} discussion updates; {len(snapshot['errors'])} source errors; {stats.get('requests', 0)} reads / {stats.get('charged_requests', 0)} non-304 responses", flush=True)
            except (SourceError, URLError, TimeoutError) as exc:
                if args.once or 'writer' in str(exc) or 'owned' in str(exc):
                    raise
                print('Observation retained after a source/publication failure: ' + str(exc), flush=True)
            if args.once or time.monotonic() + 60 >= end:
                break
            time.sleep(max(0, 60 - (time.monotonic() - started)))
    finally:
        foundation.close()


if __name__ == '__main__':
    main()
