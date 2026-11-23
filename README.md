# trureturing live

A public research observatory for the trureturing ecosystem. Explore active GitHub
Actions, research questions and pull requests across the public repositories;
follow each observation back to its source.

The homepage leads with public collaboration: topic threads, comment excerpts,
inline review comments, explicitly mentioned accounts and linked deliveries.
These are GitHub records, not an invented transcript of internal agent messages.

Production domain: **https://live.trureturing.org/**.
The GitHub Pages project URL
https://the-omega-institute.github.io/trureturing-live/ redirects to that custom
domain. The existing Atlas stays at https://www.trureturing.org/atlas.

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
npm ci --ignore-scripts
npm test
```

## Data and meaning

`config.json` owns discovery rules and presentation labels. Each collection
discovers **all public `trureturing*` repositories**, plus `mathesis`, from the
organization's public inventory. Newly split public repositories automatically
appear. Core (`trureturing`) and Books (`trureturing-books`) have dedicated
research/delivery panels and prominent map entries. Private and internal
repositories are excluded before any activity is read. The collector exports
selected public fields, explicit project links, and declared session identifiers;
it exports no raw comment bodies, logs, private trackers or correspondence.

`site/data/snapshot.json` uses schema `trureturing-live.v1`. Every repository has
its own observation time, source coverage and errors. The complete snapshot has
`collected_at`, the collection interval and the number of API requests used.

- Running and waiting counts describe **observed workflow runs**, not agents.
- Every repository samples up to 100 `in_progress` runs. Core and Books also
  query up to 100 `queued` and `waiting` runs each. The 50 most recent runs in
  every repository additionally supply pending, queued, waiting, requested,
  completed and other states. Limits and unavailable reads remain
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

The frontend checks the full panorama every minute and the independent
collaboration stream every 15 seconds. Its header shows the actual live observer
timestamp; panorama age remains separately visible. Collaboration older than
three minutes is marked delayed. An unavailable fetch
keeps the last valid browser snapshot visibly marked; a total collection outage
fails publication and retains the existing deployment. Partial endpoint failures
are shown as missing readings. Existing snapshots and source changes are never
mixed into an invented current run.

## Automatic observation and publication

`.github/workflows/pages.yml` runs every fifteen minutes, on main pushes and on
manual dispatch. It reads public GitHub records with the job's short-lived
`GITHUB_TOKEN`, then deploys the static site to GitHub Pages. It does not place
credentials in browser code or require access to private source repositories.
The collector caps each collection at 75 logical API requests (one bounded retry
for transient transport/server errors). GitHub controls scheduled-run timing;
the site displays the observed timestamp rather than promising a fixed latency.
GitHub may disable schedules on a public repository after prolonged inactivity;
the delayed-data indicator continues to report the last actual observation.

Pages uses `build_type: workflow` and the custom domain in `site/CNAME`.
The existing Cloudflare route for `live.trureturing.org` already reaches GitHub
Pages; the new site binds that hostname to this repository. For a new hostname,
point a CNAME to `the-omega-institute.github.io` before attaching the Pages custom
domain and HTTPS. Only this independent repository's deployment is affected.

## Continuous collaboration channel

`.github/workflows/live.yml` maintains one observer for 55 minutes. Its five-minute
schedule acts as a watchdog: concurrency permits one active observer and one
pending replacement. Each observation reads Core and Books comments and recent
workflow runs, rotates inline reviews between them, and rotates public comment
sampling across the remaining related repositories. Individual source observation
times and errors stay in the feed. The cadence is approximately one minute;
runner startup, API failures and worker handover can introduce gaps.

The observer writes `live.json` to the **machine-owned `live-data` branch** using
the job's short-lived repository token. This is a current-state pointer: each
publication replaces its orphan commit. It does not retain a growing Git history
of repeated telemetry. The publisher checks the ownership marker and expected
head and refuses to replace human work or a changed pointer. Do not use this
branch for source work. A public read-only reader resolves the latest commit from
GitHub's Atom feed and loads the JSON at that immutable SHA. This avoids the
five-minute cache on raw branch URLs. A delayed Pages deployment cannot stop
this data channel. No observer
credential is sent to the browser or an external hosting provider.

The reader is `https://trureturing-live-reader.vercel.app/api/live`, implemented
by `api/live.mjs`. It reads two fixed public GitHub URLs without a token, allows
only reads, and caches the response for ten seconds. `publication_sha` binds each
response to the observed data commit. The public Atom feed is used instead of
consuming each viewer's unauthenticated REST allowance. The Vercel project is
`trureturing-live-reader`; deploy its source with `vercel deploy --prod --yes`.
It has no GitHub credential or connection to private repositories. Its root URL
redirects to the production observatory. The main site remains on GitHub Pages.

Only bounded excerpts of public discussion prose are projected. Code dumps,
credential-like strings, local paths and contact addresses are omitted. Each
excerpt links to its original record. Accounts, explicit mentions and declared
sessions retain distinct meanings: co-participation in one issue is not evidence
of an internal direct message or an independently verified AI identity. Internal
agent communication and heartbeats require an explicitly supplied producer feed;
this downstream site does not instrument or change source repositories.

## Extending the view

Related public repositories are discovered automatically. Add other explicit
names or naming prefixes to the discovery policy in `config.json`; label
overrides supply descriptions. The map adapts to the discovered inventory.
Structured claim/heartbeat events can later add agent occupancy,
and published result receipts can connect tasks to exact Atlas/GID nodes. Those
sources need their own explicit contracts; they are not inferred from CI green
checks or GitHub trigger accounts.

Code: MIT. Source GitHub records retain their original authorship and repository
identity.
