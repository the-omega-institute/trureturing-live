"""Consume the pinned Rust foundation; keep transport and site content downstream."""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile

from collect import SourceError

ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT_FILE = 'organization-checkpoint.json'
STATE_REPO = 'the-omega-institute/trureturing-live'


class FoundationReader:
    def __init__(self, api, branch='live-data', binary=None):
        self.api = api
        self.config_path = ROOT / 'organization.json'
        self.config = json.loads(self.config_path.read_text())
        # This deployment's recovery pointer is public. Runtime integrations keep
        # their checkpoint private and may publish only an approved view instead.
        if any(source.get('runtime') or source['kind'] in {'cma', 'nyxid', 'session'} for source in self.config['sources']):
            raise SourceError('public recovery accepts GitHub-only registrations')
        self.binary = Path(binary or os.environ.get('LIVE_HARNESS_BIN') or ROOT / '.build/live-harness/release/live-harness')
        if not self.binary.is_file():
            raise SourceError('build the pinned Rust foundation before starting the observer')
        self.temporary = tempfile.TemporaryDirectory(prefix='trureturing-foundation-')
        self.directory = Path(self.temporary.name)
        self.state_path = self.directory / 'checkpoint.json'
        self.view_path = self.directory / 'organization.json'
        self.cache_path = self.directory / 'checkpoint.http-cache.json'
        self.view, self.cache, self.checkpoint, self.statistics = None, {}, None, {}
        try:
            row, _ = api.get(f'/repos/{STATE_REPO}/contents/{CHECKPOINT_FILE}', {'ref': branch})
            if row.get('encoding') != 'base64':
                row, _ = api.get(f'/repos/{STATE_REPO}/git/blobs/' + row['sha'])
            checkpoint = json.loads(base64.b64decode(row['content']))
            self.assert_public_checkpoint(checkpoint)
            self.state_path.write_text(json.dumps(checkpoint, ensure_ascii=False))
            self.state_path.chmod(0o600)
        except SourceError as exc:
            if str(exc) != 'GitHub HTTP 404':
                self.close()
                raise
        except (ValueError, KeyError) as exc:
            self.close()
            raise SourceError('invalid public recovery checkpoint') from exc

    def close(self):
        self.temporary.cleanup()

    def assert_public_checkpoint(self, checkpoint):
        if checkpoint.get('schema') != 'ai-org.checkpoint.v1' or checkpoint.get('organization') != self.config['organization']['id']:
            raise SourceError('unexpected recovery identity')
        registered = {source['id'] for source in self.config['sources']}
        records = [head['event'] for head in checkpoint.get('heads', {}).values()] + checkpoint.get('recent', [])
        for event in records:
            if event.get('source') not in registered or event.get('kind') in {'session', 'delivery'}:
                raise SourceError('runtime records cannot enter the public recovery pointer')
            actor = event.get('actor') or {}
            if actor.get('kind') not in {None, 'account'} or actor.get('tool'):
                raise SourceError('runtime attribution cannot enter public recovery')

    def collect(self):
        try:
            result = subprocess.run([str(self.binary), 'collect', '--config', str(self.config_path), '--state', str(self.state_path), '--output', str(self.view_path)], capture_output=True, text=True, timeout=120, check=False)
        except subprocess.TimeoutExpired as exc:
            raise SourceError('organization observation exceeded its time bound') from exc
        if result.returncode:
            raise SourceError('organization observation retained: ' + result.stderr.strip()[-500:])
        view = json.loads(self.view_path.read_text())
        checkpoint = json.loads(self.state_path.read_text())
        self.assert_public_checkpoint(checkpoint)
        if view.get('schema') != 'ai-org.live.v1':
            raise SourceError('unexpected foundation view schema')
        self.cache = json.loads(self.cache_path.read_text()) if self.cache_path.exists() else {}
        self.view, self.checkpoint = view, checkpoint
        self.statistics = json.loads(result.stderr.strip().splitlines()[-1]) if result.stderr.strip() else {}
        return self.view

    def rows(self, source):
        repo = source['repository']
        endpoint = {'github_comments': 'issues/comments', 'github_reviews': 'pulls/comments'}.get(source['kind'])
        if endpoint:
            paths = {f'/repos/{repo}/{endpoint}'}
        elif source['kind'] == 'github_actions':
            paths = {f"/repos/{repo}/actions/workflows/{path.rsplit('/', 1)[-1]}/runs" for path in source.get('workflow_paths', [])}
            if not paths:
                paths = {f'/repos/{repo}/actions/runs'}
        else:
            return []
        rows = []
        for cache_key, value in self.cache.items():
            path, _ = json.loads(cache_key)
            if path in paths:
                payload = value['value']
                rows.extend(payload.get('workflow_runs', []) if isinstance(payload, dict) else payload)
        return rows
