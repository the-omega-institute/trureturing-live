#!/bin/sh
set -eu
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export CARGO_TARGET_DIR="${LIVE_HARNESS_TARGET_DIR:-$task_root/.build/live-harness}"
cargo build --locked --release --manifest-path "$task_root/vendor/live-harness/Cargo.toml"
"$CARGO_TARGET_DIR/release/live-harness" check --config "$task_root/organization.json"
