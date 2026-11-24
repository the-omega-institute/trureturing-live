import re
import unittest

from scripts.format_agent_event import EVENT_LINE_RE, format_event

# Exact regex from chrono-harness-instructions (github-event-v2.regex)
UPSTREAM_CHRONO_REGEX = re.compile(
    r"^CHRONO_AGENT_BEGIN_082981f29eb429599bac65802d2f5465 v=2 "
    r"agent=([a-z0-9][a-z0-9_-]*(?:/[a-z0-9][a-z0-9_-]*)+) "
    r"session=([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}) "
    r"parent=(-|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}) "
    r"task=([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}) "
    r"event=([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}) "
    r"action=(task|delegate|issue|pr|review|push|ci[.]wait|check|build|test|release) "
    r"state=(started|waiting|progress|blocked|succeeded|failed|cancelled) "
    r"target=((?:self|task/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|"
    r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+(?:#[1-9][0-9]*|@(?:[0-9a-f]{40}|[0-9a-f]{64})|"
    r"/run/[1-9][0-9]*(?:/attempt/[1-9][0-9]*)?|/tag/[A-Za-z0-9][A-Za-z0-9._/+\-]*))) "
    r"CHRONO_AGENT_END_94f7082e08249c1b16af162e9625946a$"
)


class FormatAgentEventTests(unittest.TestCase):
    def test_formats_valid_root_event_matching_upstream_regex(self):
        line = format_event(
            agent="codex/live-ops/health",
            action="issue",
            state="progress",
            target="self",
        )
        m = UPSTREAM_CHRONO_REGEX.match(line)
        self.assertIsNotNone(m)
        self.assertIsNotNone(EVENT_LINE_RE.match(line))
        agent, session, parent, task, event, action, state, target = m.groups()
        self.assertEqual(agent, "codex/live-ops/health")
        self.assertEqual(parent, "-")
        self.assertEqual(action, "issue")
        self.assertEqual(state, "progress")
        self.assertEqual(target, "self")
        self.assertEqual(len({session, task, event}), 3)

    def test_accepts_repo_issue_and_run_targets(self):
        for target in (
            "the-omega-institute/trureturing-live#34",
            "the-omega-institute/trureturing-live/run/45441709233",
            "the-omega-institute/trureturing-live-template#6",
        ):
            line = format_event(
                agent="codex/live-ops/template-sync",
                action="pr",
                state="succeeded",
                target=target,
            )
            self.assertIsNotNone(UPSTREAM_CHRONO_REGEX.match(line))

    def test_rejects_invalid_agent_or_duplicate_uuid(self):
        with self.assertRaises(ValueError):
            format_event(agent="singleword", action="pr", state="started")
        same = "058ca5a5-1923-4ec4-8cf6-74a1694a510d"
        with self.assertRaises(ValueError):
            format_event(
                agent="codex/live-ops/repair",
                action="pr",
                state="progress",
                session=same,
                task=same,
            )


if __name__ == "__main__":
    unittest.main()
