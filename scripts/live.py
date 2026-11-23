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

from collect import GitHub, SourceError, discover_repositories, now, references, run_record, SESSION

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

    def publish(self, snapshot: dict):
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
        tree = self.api.write(base + "/git/trees", {"tree": [
            {"path": "live.json", "mode": "100644", "type": "blob", "content": json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n"},
            {"path": "README.md", "mode": "100644", "type": "blob", "content": README},
        ]})
        commit = self.api.write(base + "/git/commits", {"message": MARKER + snapshot["observed_at"], "tree": tree["sha"], "parents": []})
        if current:
            self.api.write(base + "/git/refs/heads/" + BRANCH, {"sha": commit["sha"], "force": True}, method="PATCH")
        else:
            self.api.write(base + "/git/refs", {"ref": "refs/heads/" + BRANCH, "sha": commit["sha"]})
        self.head, self.checked = commit["sha"], True


class Observer:
    def __init__(self, api: GitHub, config: dict):
        self.api, self.config = api, config
        self.messages, self.runs, self.coverage = {}, {}, {}
        self.specs = []
        self.tick = 0
        try:
            previous, _ = api.get('/repos/' + STATE_REPO + '/contents/live.json', {'ref': BRANCH})
            saved = json.loads(base64.b64decode(previous['content']))
            if saved.get('schema') == SCHEMA:
                self.messages = {message['id']: message for message in saved.get('messages', [])}
                self.coverage = saved.get('coverage', {})
        except (SourceError, ValueError, KeyError):
            pass

    def observe(self) -> dict:
        if not self.specs or self.tick % 10 == 0:
            specs, _ = discover_repositories(self.api, self.config)
            self.specs = specs
            allowed = {self.config['owner'] + '/' + spec['name'] for spec in specs}
            self.messages = {key: value for key, value in self.messages.items() if value['repository'] in allowed}
        owner = self.config['owner']
        focus = [name for name in ['trureturing', 'trureturing-books'] if any(spec['name'] == name for spec in self.specs)]
        remaining = [spec['name'] for spec in self.specs if spec['name'] not in focus and spec['name'] != 'trureturing-live']
        sampled = focus + ([remaining[self.tick % len(remaining)]] if remaining else [])
        errors = []
        successful_reads = 0
        for name in sampled:
            repo = owner + '/' + name
            try:
                rows, links = self.api.get('/repos/' + repo + '/issues/comments', {'per_page': 50, 'sort': 'updated', 'direction': 'desc'})
                for row in rows:
                    message = message_record(row, repo, 'comment', owner)
                    if message['text']:
                        self.messages[message['id']] = message
                self.coverage[repo] = {'observed_at': now(), 'comments_returned': len(rows), 'truncated': 'rel="next"' in links}
                successful_reads += 1
            except SourceError as exc:
                errors.append(repo + ': ' + str(exc))
        for name in focus:
            repo = owner + '/' + name
            try:
                data, _ = self.api.get('/repos/' + repo + '/actions/runs', {'per_page': 50})
                self.runs[repo] = {'observed_at': now(), 'runs': [run_record(row, repo) for row in data['workflow_runs']]}
                successful_reads += 1
            except SourceError as exc:
                errors.append(repo + ' runs: ' + str(exc))
        # Inline review comments are a separate GitHub endpoint. Rotate between
        # the two focus repositories; never infer reviews from CI green checks.
        if focus:
            repo = owner + '/' + focus[self.tick % len(focus)]
            try:
                rows, _ = self.api.get('/repos/' + repo + '/pulls/comments', {'per_page': 30, 'sort': 'updated', 'direction': 'desc'})
                for row in rows:
                    message = message_record(row, repo, 'review_comment', owner)
                    if message['text']:
                        self.messages[message['id']] = message
                successful_reads += 1
            except SourceError as exc:
                errors.append(repo + ' review comments: ' + str(exc))
        if not successful_reads:
            raise SourceError('no current source readings; retaining the last observation')
        self.messages = dict(sorted(self.messages.items(), key=lambda pair: pair[1]['updated_at'], reverse=True)[:240])
        self.tick += 1
        return {'schema': SCHEMA, 'observed_at': now(), 'interval_seconds': 60,
                'messages': list(self.messages.values()), 'focus_runs': self.runs,
                'coverage': self.coverage, 'errors': errors,
                'scope': 'Public GitHub comments, inline review comments and workflow records. Accounts and explicitly declared sessions are attribution, not verified agent identities. Mentions and cross-links are explicit source references. Internal agent messages are not connected.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minutes', type=float, default=55)
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    api = GitHub(os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN') or '', budget=900)
    observer = Observer(api, json.loads((ROOT / 'config.json').read_text()))
    publisher = Publisher(api)
    end = time.monotonic() + args.minutes * 60
    while True:
        started = time.monotonic()
        try:
            snapshot = observer.observe()
            if not snapshot['messages']:
                raise SourceError('no public discussion records; retain the previous live observation')
            if args.output:
                args.output.write_text(json.dumps(snapshot, ensure_ascii=False))
            else:
                publisher.publish(snapshot)
            print(f"Published {snapshot['observed_at']}: {len(snapshot['messages'])} messages; {len(snapshot['errors'])} source errors; {api.requests} requests", flush=True)
        except (SourceError, URLError, TimeoutError) as exc:
            if args.once or 'writer' in str(exc) or 'owned' in str(exc):
                raise
            print('Observation retained after a source/publication failure: ' + str(exc), flush=True)
        if args.once or time.monotonic() + 60 >= end:
            break
        time.sleep(max(0, 60 - (time.monotonic() - started)))


if __name__ == '__main__':
    main()
