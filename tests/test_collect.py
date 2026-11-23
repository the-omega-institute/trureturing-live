import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("collect", Path(__file__).resolve().parents[1] / "scripts/collect.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

OWNER = "the-omega-institute"
REPO = OWNER + "/trureturing"
TIME = "2026-11-23T13:00:00Z"


def issue(**changes):
    return {"number": 1, "title": "A question", "state": "open", "html_url": f"https://github.com/{REPO}/issues/1", "body": "", "created_at": TIME, "updated_at": TIME, "assignees": [], "labels": [], "comments": 0, **changes}


def run(**changes):
    return {"id": 100, "name": "CI", "display_title": "Check a candidate", "status": "in_progress", "conclusion": None, "event": "pull_request", "head_sha": "a" * 40, "html_url": f"https://github.com/{REPO}/actions/runs/100", "created_at": TIME, "updated_at": TIME, "pull_requests": [{"number": 2}], **changes}


class FakeGitHub:
    def __init__(self, private=False, failed=False):
        self.paths = []
        self.requests = 0
        self.private = private
        self.failed = failed

    def get(self, path, params=None):
        self.paths.append(path)
        self.requests += 1
        if path == "/repos/" + REPO:
            return {"private": self.private, "visibility": "private" if self.private else "public", "default_branch": "dev"}, ""
        if self.failed:
            raise module.SourceError("GitHub HTTP 403")
        if path.endswith("/actions/runs"):
            return {"workflow_runs": [run()], "total_count": 201}, '<https://api.github.com/next>; rel="next"'
        if path.endswith("/issues/1/comments"):
            return [{"body": f"Partial delivery in {OWNER}/trureturing-books#8.", "html_url": "https://github.com/" + REPO + "/issues/1#issuecomment-20"}], ""
        if path.endswith("/issues"):
            return [issue(comments=1), issue(number=2, pull_request={})], ""
        if path.endswith("/pulls"):
            return [issue(number=2, head={"sha": "a" * 40})], ""
        raise AssertionError(path)


class CollectionTests(unittest.TestCase):
    def test_private_repository_never_exports_or_reads_activity(self):
        api = FakeGitHub(private=True)
        result = module.collect_repository(api, OWNER, {"name": "trureturing"})
        self.assertFalse(result["available"])
        self.assertEqual(result["tasks"], [])
        self.assertEqual(result["runs"], [])
        self.assertEqual(api.paths, ["/repos/" + REPO])

    def test_source_failure_preserves_unknown_coverage(self):
        result = module.collect_repository(FakeGitHub(failed=True), OWNER, {"name": "trureturing"})
        self.assertTrue(result["available"])
        self.assertTrue(result["coverage"]["runs_in_progress"]["unavailable"])
        self.assertTrue(result["coverage"]["issues"]["unavailable"])
        self.assertTrue(result["errors"])

    def test_join_identity_deduplication_and_comment_evidence(self):
        result = module.collect_repository(FakeGitHub(), OWNER, {"name": "trureturing"})
        self.assertEqual(len(result["runs"]), 1)
        self.assertEqual(result["runs"][0]["pull_requests"], [2])
        self.assertEqual(result["runs"][0]["head_sha"], "a" * 40)
        self.assertTrue(result["coverage"]["runs_in_progress"]["truncated"])
        self.assertEqual([task["kind"] for task in result["tasks"]], ["issue", "pull"])
        ref = result["tasks"][0]["references"][0]
        self.assertEqual(ref["repository"], OWNER + "/trureturing-books")
        self.assertTrue(ref["evidence_url"].endswith("issuecomment-20"))
        self.assertNotIn("body", result["tasks"][0])
        self.assertIsNone(result["tasks"][0]["declared_session"])

    def test_explicit_session_is_attribution_not_online_status(self):
        record = module.task_record(issue(body="**Session:** `01a206ca-b419-77e3-a0f9-3597329708f8`."), REPO, "issue", OWNER)
        self.assertEqual(record["declared_session"], "01a206ca-b419-77e3-a0f9-3597329708f8")
        self.assertNotIn("online", record)
        self.assertNotIn("agents", record)

    def test_references_are_explicit_and_restricted_to_project_owner(self):
        refs = module.references(f"https://github.com/{OWNER}/trureturing/pull/2 {OWNER}/trureturing#2 https://github.com/other/repo/issues/10", OWNER)
        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["number"], 2)

    def test_total_outage_cannot_replace_existing_publication(self):
        with self.assertRaises(module.SourceError):
            module.collect(FakeGitHub(private=True), {"owner": OWNER, "refresh_interval_seconds": 300, "repositories": [{"name": "trureturing"}]})

    def test_discovery_includes_all_related_public_repositories_and_prioritizes_core_and_books(self):
        class Inventory:
            def get(self, path, params):
                return [
                    {"name": "unrelated", "private": False},
                    {"name": "trureturing-private", "private": True},
                    {"name": "trureturing-internal", "private": False, "visibility": "internal"},
                    {"name": "trureturing-new-topic", "private": False},
                    {"name": "trureturing-books", "private": False},
                    {"name": "mathesis", "private": False},
                    {"name": "trureturing", "private": False},
                ], ""
        specs, metadata = module.discover_repositories(Inventory(), {"owner": OWNER, "discovery": {"prefixes": ["trureturing"], "include": ["mathesis"]}, "repositories": []})
        self.assertEqual([row["name"] for row in specs], ["trureturing", "trureturing-books", "mathesis", "trureturing-new-topic"])
        self.assertNotIn("trureturing-private", metadata)
        self.assertNotIn("trureturing-internal", metadata)


if __name__ == "__main__":
    unittest.main()
