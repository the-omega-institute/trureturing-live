# trureturing live

A public research observatory for the trureturing ecosystem. Explore active GitHub
Actions, research questions and pull requests across the public repositories;
follow each observation back to its source.

Production domain: **https://live.trureturing.org/**.
The independent GitHub Pages origin is
https://the-omega-institute.github.io/trureturing-live/ until the custom domain
is attached. The existing Atlas stays at https://www.trureturing.org/atlas.

The dashboard is plain HTML, CSS and JavaScript. The collector uses Python's
standard library. There is no frontend build step, runtime CDN, browser token,
private data dependency or change to any observed repository.

## Run locally

```sh
python3 scripts/collect.py --use-gh
python3 -m http.server 8780 --directory site
```

Open http://localhost:8780. `--use-gh` reads the existing GitHub CLI credential into
the collector process; it never writes it to the snapshot. Alternatively, provide
`GH_TOKEN` to the collector. Without authentication, GitHub's public API allowance
can be insufficient for the complete sample.

```sh
python3 -m unittest discover -s tests -v
node --check site/assets/app.mjs
```

## Data and meaning

`config.json` owns the public repository allowlist and presentation coordinates.
Every collection first checks that a repository is public. Private and internal
repositories are excluded before any activity is read. The collector exports
selected public fields, explicit project links, and declared session identifiers;
it exports no raw comment bodies, logs, private trackers or correspondence.

`site/data/snapshot.json` uses schema `trureturing-live.v1`. Every repository has
its own observation time, source coverage and errors. The complete snapshot has
`collected_at`, the collection interval and the number of API requests used.

- Running and waiting counts describe **observed workflow runs**, not agents.
- Active queries sample up to 100 runs per state (`in_progress`, `queued`,
  `waiting`) per repository. The 50 most recent runs also supply pending,
  requested, completed and other states. Limits and unavailable reads remain
  explicit in each repository's `coverage`; counts are not a complete census.
- Tasks sample the 60 most recently updated issue endpoint records (excluding
  pull requests), plus up to 30 open pull requests. Recently closed issues remain
  visible. Missing assignees do not establish that nobody has claimed a task.
- A small comment sample on Core and Requests adds explicit cross-repository
  handoff links, each retaining its comment URL. It does not infer completion
  from prose or claim that every discussion has been read.
- A workflow links to a PR through GitHub's attached PR identity or an exact
  current PR head SHA. Titles, branch names and account identities cannot establish
  that relationship by themselves.
- Publicly declared sessions are attribution. No heartbeat feed is connected,
  so the dashboard makes no agent-online or model-identity claim.
- Workflow success is an execution outcome. It does not attest mathematical
  novelty, proof scope, source fidelity, or compatible verified publication.
- Map positions identify research areas by repository. Decorative orbits are
  layout guides; they encode no mathematical dependencies or task transfers.

The frontend checks the published snapshot every minute and displays its actual
age. After 15 minutes it marks the observation as delayed. An unavailable fetch
keeps the last valid browser snapshot visibly marked; a total collection outage
fails publication and retains the existing deployment. Partial endpoint failures
are shown as missing readings. Existing snapshots and source changes are never
mixed into an invented current run.

## Automatic observation and publication

`.github/workflows/pages.yml` runs every five minutes, on main pushes and on
manual dispatch. It reads public GitHub records with the job's short-lived
`GITHUB_TOKEN`, then deploys the static site to GitHub Pages. It does not place
credentials in browser code or require access to private source repositories.
The collector caps each collection at 75 logical API requests (one bounded retry
for transient transport/server errors). GitHub controls scheduled-run timing;
the site displays the observed timestamp rather than promising a fixed latency.
GitHub may disable schedules on a public repository after prolonged inactivity;
the delayed-data indicator continues to report the last actual observation.

Enable Pages with `build_type: workflow`. For the custom domain, create a
DNS-only CNAME from `live.trureturing.org` to
`the-omega-institute.github.io`, then set the Pages custom domain and HTTPS.
Only this independent repository's deployment is affected.

## Extending the view

Add public repositories to `config.json`; give them stable map coordinates and
descriptions. Structured claim/heartbeat events can later add agent occupancy,
and published result receipts can connect tasks to exact Atlas/GID nodes. Those
sources need their own explicit contracts; they are not inferred from CI green
checks or GitHub trigger accounts.

Code: MIT. Source GitHub records retain their original authorship and repository
identity.
