#!/usr/bin/env python3
"""Format a chrono-harness compatible github-event-v2 footer line for GitHub Issues & PRs."""

from __future__ import annotations

import argparse
import re
import sys
import uuid

BEGIN_MARKER = "CHRONO_AGENT_BEGIN_082981f29eb429599bac65802d2f5465"
END_MARKER = "CHRONO_AGENT_END_94f7082e08249c1b16af162e9625946a"

UUID_V4_RE = r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
AGENT_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*(?:/[a-z0-9][a-z0-9_-]*)+$")
TARGET_RE = re.compile(
    rf"^(?:self|task/{UUID_V4_RE}|"
    r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+"
    r"(?:#[1-9][0-9]*|@(?:[0-9a-f]{40}|[0-9a-f]{64})|"
    r"/run/[1-9][0-9]*(?:/attempt/[1-9][0-9]*)?|"
    r"/tag/[A-Za-z0-9][A-Za-z0-9._/+\-]*))$"
)
EVENT_LINE_RE = re.compile(
    rf"^{BEGIN_MARKER} v=2 "
    r"agent=([a-z0-9][a-z0-9_-]*(?:/[a-z0-9][a-z0-9_-]*)+) "
    rf"session=({UUID_V4_RE}) "
    rf"parent=(-|(?:{UUID_V4_RE})) "
    rf"task=({UUID_V4_RE}) "
    rf"event=({UUID_V4_RE}) "
    r"action=(task|delegate|issue|pr|review|push|ci[.]wait|check|build|test|release) "
    r"state=(started|waiting|progress|blocked|succeeded|failed|cancelled) "
    rf"target=((?:self|task/{UUID_V4_RE}|[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+(?:#[1-9][0-9]*|@(?:[0-9a-f]{{40}}|[0-9a-f]{{64}})|/run/[1-9][0-9]*(?:/attempt/[1-9][0-9]*)?|/tag/[A-Za-z0-9][A-Za-z0-9._/+\-]*))) "
    rf"{END_MARKER}$"
)

VALID_ACTIONS = frozenset(
    {
        "task",
        "delegate",
        "issue",
        "pr",
        "review",
        "push",
        "ci.wait",
        "check",
        "build",
        "test",
        "release",
    }
)
VALID_STATES = frozenset(
    {"started", "waiting", "progress", "blocked", "succeeded", "failed", "cancelled"}
)


def _new_uuid(used: set[str]) -> str:
    while True:
        candidate = str(uuid.uuid4())
        if candidate not in used:
            used.add(candidate)
            return candidate


def format_event(
    *,
    agent: str,
    action: str,
    state: str,
    target: str = "self",
    session: str | None = None,
    parent: str = "-",
    task: str | None = None,
    event: str | None = None,
) -> str:
    if not AGENT_RE.match(agent):
        raise ValueError(f"Invalid agent path: {agent!r}")
    if action not in VALID_ACTIONS:
        raise ValueError(f"Invalid action: {action!r}")
    if state not in VALID_STATES:
        raise ValueError(f"Invalid state: {state!r}")
    if not TARGET_RE.match(target):
        raise ValueError(f"Invalid target: {target!r}")

    used: set[str] = set()
    if parent != "-":
        if not re.fullmatch(UUID_V4_RE, parent):
            raise ValueError(f"Invalid parent UUIDv4: {parent!r}")
        used.add(parent)

    def resolve(val: str | None, field: str) -> str:
        if val is None:
            return _new_uuid(used)
        if not re.fullmatch(UUID_V4_RE, val):
            raise ValueError(f"Invalid {field} UUIDv4: {val!r}")
        if val in used:
            raise ValueError(f"Duplicate UUID across fields: {field}={val!r}")
        used.add(val)
        return val

    session_id = resolve(session, "session")
    task_id = resolve(task, "task")
    event_id = resolve(event, "event")

    line = (
        f"{BEGIN_MARKER} v=2 "
        f"agent={agent} session={session_id} parent={parent} "
        f"task={task_id} event={event_id} "
        f"action={action} state={state} target={target} "
        f"{END_MARKER}"
    )
    if not EVENT_LINE_RE.match(line):
        raise ValueError(f"Formatted event failed grammar check: {line!r}")
    return line


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", required=True, help="Agent path, e.g. codex/live-ops/health")
    parser.add_argument("--action", required=True, choices=sorted(VALID_ACTIONS))
    parser.add_argument("--state", required=True, choices=sorted(VALID_STATES))
    parser.add_argument("--target", default="self")
    parser.add_argument("--session", default=None)
    parser.add_argument("--parent", default="-")
    parser.add_argument("--task", default=None)
    parser.add_argument("--event", default=None)
    args = parser.parse_args(argv)

    print(
        format_event(
            agent=args.agent,
            action=args.action,
            state=args.state,
            target=args.target,
            session=args.session,
            parent=args.parent,
            task=args.task,
            event=args.event,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
