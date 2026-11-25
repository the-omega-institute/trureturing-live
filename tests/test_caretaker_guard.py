import json
import os
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from scripts.caretaker_guard import (
    evaluate_health,
    export_patch,
    parse_model_verdict,
    probe_live,
    validate_diff_text,
    verify_and_apply_patch,
)


def _fake_fetcher(overrides=None):
    overrides = overrides or {}
    defaults = {
        "https://live.trureturing.org/": (
            200,
            b"<title>TRURETURING // LIVE</title><script src='assets/app.mjs'></script>",
            None,
            "ok",
        ),
        "https://live.trureturing.org/data/snapshot.json": (
            200,
            json.dumps(
                {
                    "schema": "trureturing-live.v1",
                    "owner": "the-omega-institute",
                    "collected_at": "2026-11-25T04:00:00Z",
                    "repositories": [{"name": "trureturing-live"}],
                }
            ).encode(),
            None,
            "ok",
        ),
        "https://live.trureturing.org/data/truth-nebula.v1.json": (
            200,
            json.dumps(
                {
                    "schema_version": "trureturing-truth-nebula.v1",
                    "clusters": [{"id": "c1"}],
                    "stars": [{"id": "s1"}],
                }
            ).encode(),
            None,
            "ok",
        ),
        "https://www.trureturing.org/data/atlas-startup.v1.json": (
            200,
            json.dumps(
                {
                    "schema_version": "pages-atlas-startup.v1",
                    "graph": {"nodes": 10},
                    "details": [{"id": "d1"}],
                }
            ).encode(),
            None,
            "ok",
        ),
    }
    defaults.update(overrides)
    return lambda url: defaults[url]


class CaretakerGuardHealthTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 25, 5, 0, tzinfo=timezone.utc)

    def test_strict_model_verdict_never_accepts_empty_or_malformed_as_healthy(self):
        self.assertEqual(parse_model_verdict("HEALTHY\n")[0], "healthy")
        self.assertEqual(parse_model_verdict("ALERT\nSite returning 500")[0], "anomaly")
        for bad in (None, "", "   \n", "OK", "Everything looks fine", "ALERT\n   ", "HEALTHY\nbut maybe check"):
            status, _ = parse_model_verdict(bad)
            self.assertEqual(status, "invalid_diagnosis", f"Expected invalid_diagnosis for {bad!r}")
        self.assertEqual(parse_model_verdict("HEALTHY", model_rc=1)[0], "invalid_diagnosis")

    def test_deterministic_probe_failure_overrides_model_healthy(self):
        probe = probe_live(
            site_url="https://live.trureturing.org/",
            snapshot_url="https://live.trureturing.org/data/snapshot.json",
            nebula_url="https://live.trureturing.org/data/truth-nebula.v1.json",
            atlas_url="https://www.trureturing.org/data/atlas-startup.v1.json",
            expected_owner="the-omega-institute",
            max_stale_hours=6.0,
            npm_rc=1,
            py_rc=0,
            js_rc=0,
            now=self.now,
            fetcher=_fake_fetcher(),
        )
        self.assertFalse(probe["all_passed"])
        verdict = evaluate_health(probe, "HEALTHY\n", model_rc=0)
        self.assertEqual(verdict["verdict"], "anomaly")
        self.assertIn("npm_ci", verdict["report_markdown"])
        self.assertIn("overridden by deterministic probe failures", verdict["report_markdown"])

    def test_distinguishes_failed_source_stale_snapshot_and_unavailable_probe(self):
        stale_snap = json.dumps(
            {
                "schema": "trureturing-live.v1",
                "owner": "the-omega-institute",
                "collected_at": "2026-11-24T12:00:00Z",
                "repositories": [{"name": "a"}],
            }
        ).encode()
        probe = probe_live(
            site_url="https://live.trureturing.org/",
            snapshot_url="https://live.trureturing.org/data/snapshot.json",
            nebula_url="https://live.trureturing.org/data/truth-nebula.v1.json",
            atlas_url="https://www.trureturing.org/data/atlas-startup.v1.json",
            expected_owner="the-omega-institute",
            max_stale_hours=6.0,
            npm_rc=0,
            py_rc=0,
            js_rc=0,
            now=self.now,
            fetcher=_fake_fetcher(
                {
                    "https://live.trureturing.org/data/snapshot.json": (200, stale_snap, None, "ok"),
                    "https://www.trureturing.org/data/atlas-startup.v1.json": (
                        None,
                        b"",
                        "TimeoutError: timed out",
                        "probe_unavailable",
                    ),
                }
            ),
        )
        cats = {f["check"]: f["category"] for f in probe["failures"]}
        self.assertEqual(cats["snapshot_json"], "failed_source")
        self.assertEqual(cats["atlas_json"], "probe_unavailable")

    def test_empty_model_output_produces_invalid_diagnosis_even_when_probes_pass(self):
        probe = probe_live(
            site_url="https://live.trureturing.org/",
            snapshot_url="https://live.trureturing.org/data/snapshot.json",
            nebula_url="https://live.trureturing.org/data/truth-nebula.v1.json",
            atlas_url="https://www.trureturing.org/data/atlas-startup.v1.json",
            expected_owner="the-omega-institute",
            max_stale_hours=6.0,
            npm_rc=0,
            py_rc=0,
            js_rc=0,
            now=self.now,
            fetcher=_fake_fetcher(),
        )
        self.assertTrue(probe["all_passed"])
        verdict = evaluate_health(probe, "", model_rc=0)
        self.assertEqual(verdict["verdict"], "invalid_diagnosis")
        self.assertIn("Invalid Caretaker Diagnosis", verdict["report_markdown"])


class CaretakerGuardPatchTests(unittest.TestCase):
    def _init_repo(self, root: Path) -> None:
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.name", "Tester"], cwd=root, check=True)
        (root / "site").mkdir()
        (root / ".github" / "workflows").mkdir(parents=True)
        (root / "site" / "app.js").write_text("console.log('v1');\n", encoding="utf-8")
        (root / ".github" / "workflows" / "ci.yml").write_text("name: CI\n", encoding="utf-8")
        subprocess.run(["git", "add", "-A"], cwd=root, check=True)
        subprocess.run(["git", "commit", "-q", "-m", "init"], cwd=root, check=True)

    def test_export_and_verify_allows_in_scope_modifications_and_untracked_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "repo"
            clone = Path(tmp) / "clean"
            root.mkdir()
            self._init_repo(root)
            subprocess.run(["git", "clone", "-q", str(root), str(clone)], check=True)

            (root / "site" / "app.js").write_text("console.log('v2');\n", encoding="utf-8")
            (root / "site" / "new.css").write_text("body { color: #0f0; }\n", encoding="utf-8")

            patch_file = Path(tmp) / "patch.diff"
            manifest_file = Path(tmp) / "manifest.json"
            manifest = export_patch(
                repo_dir=root,
                allowed_prefixes=["site/"],
                out_patch=patch_file,
                out_manifest=manifest_file,
            )
            self.assertTrue(manifest["has_changes"])
            self.assertEqual(manifest["changed_paths"], ["site/app.js", "site/new.css"])

            applied = verify_and_apply_patch(
                repo_dir=clone,
                allowed_prefixes=["site/"],
                patch_path=patch_file,
                manifest_path=manifest_file,
            )
            self.assertTrue(applied["applied"])
            self.assertEqual((clone / "site" / "new.css").read_text(encoding="utf-8"), "body { color: #0f0; }\n")

    def test_export_rejects_untracked_deleted_renamed_or_symlink_out_of_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "repo"
            root.mkdir()
            self._init_repo(root)

            # Out-of-scope untracked file
            (root / "evil.sh").write_text("echo pwn\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                export_patch(
                    repo_dir=root,
                    allowed_prefixes=["site/"],
                    out_patch=Path(tmp) / "p.diff",
                    out_manifest=Path(tmp) / "m.json",
                )
            (root / "evil.sh").unlink()

            # Out-of-scope deletion
            (root / ".github" / "workflows" / "ci.yml").unlink()
            with self.assertRaises(ValueError):
                export_patch(
                    repo_dir=root,
                    allowed_prefixes=["site/"],
                    out_patch=Path(tmp) / "p.diff",
                    out_manifest=Path(tmp) / "m.json",
                )
            subprocess.run(["git", "checkout", "--", ".github/workflows/ci.yml"], cwd=root, check=True)

            # In-scope symlink rejected
            os.symlink("/etc/passwd", root / "site" / "leak")
            with self.assertRaises(ValueError):
                export_patch(
                    repo_dir=root,
                    allowed_prefixes=["site/"],
                    out_patch=Path(tmp) / "p.diff",
                    out_manifest=Path(tmp) / "m.json",
                )

    def test_validate_diff_rejects_workflow_edit_and_symlink_mode(self):
        bad_diff = (
            "diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml\n"
            "--- a/.github/workflows/ci.yml\n"
            "+++ b/.github/workflows/ci.yml\n"
        )
        with self.assertRaises(ValueError):
            validate_diff_text(bad_diff, ["site/", "scripts/", "tests/"])

        symlink_diff = (
            "diff --git a/site/link b/site/link\n"
            "new file mode 120000\n"
        )
        with self.assertRaises(ValueError):
            validate_diff_text(symlink_diff, ["site/"])


if __name__ == "__main__":
    unittest.main()
