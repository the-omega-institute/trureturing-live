import datetime as dt
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import pages_rate_gate  # noqa: E402


class PagesRateGateTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 25, 1, 0, 0, tzinfo=dt.timezone.utc)

    def _run(self, run_id: int, minutes_ago: int, conclusion: str = "success") -> dict:
        ts = (self.now - dt.timedelta(minutes=minutes_ago)).isoformat().replace("+00:00", "Z")
        return {"id": run_id, "conclusion": conclusion, "updated_at": ts, "created_at": ts}

    def test_allows_deploy_below_hourly_limit(self):
        runs = [self._run(i, i * 4) for i in range(1, 10)]  # 9 recent successful runs
        allow, count = pages_rate_gate.evaluate_gate(runs, max_per_hour=10, now=self.now)
        self.assertTrue(allow)
        self.assertEqual(count, 9)

    def test_throttles_deploy_at_hourly_limit(self):
        runs = [self._run(i, i * 5) for i in range(1, 11)]  # 10 recent successful runs
        allow, count = pages_rate_gate.evaluate_gate(runs, max_per_hour=10, now=self.now)
        self.assertFalse(allow)
        self.assertEqual(count, 10)

    def test_ignores_old_failed_skipped_and_current_run(self):
        runs = [
            *[self._run(i, i * 3) for i in range(1, 9)],  # 8 valid recent successes
            self._run(99, 1, conclusion="success"),  # current run id -> excluded
            self._run(100, 10, conclusion="failure"),
            self._run(101, 12, conclusion="cancelled"),
            self._run(102, 75, conclusion="success"),  # older than 60 min -> excluded
        ]
        allow, count = pages_rate_gate.evaluate_gate(
            runs, max_per_hour=10, now=self.now, current_run_id=99
        )
        self.assertTrue(allow)
        self.assertEqual(count, 8)

    def test_force_flag_overrides_throttle(self):
        runs = [self._run(i, i * 3) for i in range(1, 13)]
        allow, count = pages_rate_gate.evaluate_gate(
            runs, max_per_hour=10, now=self.now, force=True
        )
        self.assertTrue(allow)
        self.assertEqual(count, 12)


if __name__ == "__main__":
    unittest.main()
