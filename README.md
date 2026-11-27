# trureturing live

A public research observatory for the trureturing ecosystem. Explore active GitHub
Actions, research questions and pull requests across the public repositories;
follow each observation back to its source.

The homepage opens with the institute's operating method: human direction,
mathematical attack, independent review, formal checks, and books/publication/outreach.
The eight departments are drawn as one architecture with responsibility paths and
explicit public-reference connections. Select a department to open its workbench:
every public participant observed in that department gets a work-seat row with its
recent tasks and source links. Independent research sessions and Actions engines
have distinct roles. New observed activity can move the viewpoint; selecting a
department fixes it until the reader resumes following. A separate question view
follows one mathematical line through its explicit issue, contribution, check and
book references. The interface presents research in plain language and links back
to public sources.

Production domain: **https://live.trureturing.org/**.
The GitHub Pages project URL
https://the-omega-institute.github.io/trureturing-live/ redirects to that custom
domain. The existing Atlas stays at https://www.trureturing.org/atlas.

The dashboard is plain HTML, CSS and JavaScript. The panorama collector uses Python's
standard library; continuous organization observations use a pinned Rust foundation.
The public dashboard loads without a frontend build, runtime CDN, or browser login.

The live dashboard serves a pinned copy of the Nyx assistant widget. Visitors approve a scoped browser credential on NyxID. The SDK encrypts the child credential with a non-exportable key in the site's IndexedDB and revalidates it after reload. The dedicated chrono-cd service forwards requests to NyxID. Text chat and voice can read the current tab’s observation time, selected view, research questions and activity. They can look up the dashboard’s public records and source links by section and switch between organization and journey views. Disconnecting revokes the child credential across that site's tabs.
Voice calls are enabled by default. Connect NyxID with the requested OpenAI service (`llm-openai`), then select the call button beside the empty message field and allow microphone access. Visitors with a previous text-only grant need to authorize the additional service.
[SDK v0.2.3](https://github.com/ChronoAIProject/nyx-assistant-sdk/releases/tag/v0.2.3)

During an active tour the dashboard groups newly observed organization activity and newly frozen Lean modules into a digest. The batch ID and counts tell the guide when to retrieve a research update. Source-backed research records are kept ahead of routine checks in each batch. Alexandra can receive one digest at a natural pause at most every three minutes and look up relevant records three at a time. The tab keeps up to 48 records per batch for the three latest digests. Pausing or ending the tour clears the batches.

Alexandra greets visitors in English and waits. Say “开始讲解” or “Start the tour” to begin a continuous tour of the space station and theorem starfield. Visitors can switch languages or ask her to pause. The host sets her name with `data-voice-name`. In a supported desktop browser, select **Share this tab** in the call and choose the dashboard. The guide can take compressed stills of that tab during the call. Stop sharing or hang up to end capture.

Visitors can ask Alexandra to inspect a module star, follow a prerequisite, open a conjecture lantern, or explain a connection between domains. She can query the released atlas and recent freeze observations separately. The guide tools return four search results at a time and link module details to the source revision.

The voice guide uses OpenAI `gpt-realtime-2.1`. Its tour instructions adapt a guide’s opening question, visual cue, pacing and interpretation of a significant detail to the live research dashboard. [Tour Guide Pro](https://github.com/aiunlocked1412/claude-skill-unlock/blob/f40e6c332784b7bd66999dd52aafa58cfd4c3816/skills/08-hospitality/tour-guide-pro/SKILL.md) · [National Park Service interpretive planning](https://www.nps.gov/subjects/hfc/interpretive-planning.htm)

## Run locally

The organization event foundation is a pinned source dependency at
`vendor/live-harness`. Initialize it and build with the repository's Rust toolchain:

```sh
git submodule update --init
sh tools/build-foundation.sh
GH_TOKEN="$(gh auth token)" python3 scripts/live.py --once --output /tmp/live.json
```

`organization.json` belongs to this deployment. It assigns explicit sources to
research, independent review, formal verification, books, publication, outreach
and tools, with human direction represented separately. The generic Rust mechanism
is [trureturing-live-template](https://github.com/the-omega-institute/trureturing-live-template).
That repository contains no UI. An update changes the reviewed submodule commit;
configuration and frontend presentation stay here.

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
appear. Core (`trureturing`) and Books (`trureturing-books`) supply the principal
research questions and chapter contributions. The explicit departmental source
registry is `organization.json`; discovery alone does not assign an unregistered
repository to a department. Private and internal
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
- Hive positions identify configured departmental responsibilities. Solid paths
  show those responsibilities; dashed connections come from explicit public
  references. A reference does not establish a private dispatch or prove that a
  whole research pipeline has completed.
- `editorial.json` supplies this site's Chinese question and paper descriptions.
  Technical maintenance titles are omitted from mathematical topic cards.
  Publications come from the existing public publication index at
  `https://www.trureturing.org/assets/publication-index.json`; original authors,
  titles, source links and preprint status are preserved.

The frontend checks the full panorama every minute and the organization stream
every 15 seconds. Its header uses the actual organization observation time.
Observations older than three minutes lose their live execution indicators and
show a readable delay message. Failed requests retain the last valid view; older
responses cannot roll it back. Initial loading, manual selection and historical
replay do not produce invented arrival signals. Reduced motion, quiet viewing,
keyboard department navigation and mobile layouts are supported.

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
pending replacement. The Rust foundation reads the sources in `organization.json`,
grouped by repository with four bounded reader workers. Busy discussion, research
checks, book checks and the outreach coordinator update about once a minute;
slower sources update every five minutes with their own freshness allowance.
Conditional requests reuse source-confirmed unchanged results. The existing public
discussion view consumes this same reader cache, without a second set of API calls.
Individual source times, coverage and failures remain in the structured view.
Runner startup, API failures and worker handover can introduce gaps.

The observer writes `live.json` to the **machine-owned `live-data` branch** using
the job's short-lived repository token. This is a current-state pointer: each
publication replaces its orphan commit. It does not retain a growing Git history
of repeated telemetry. The publisher checks the ownership marker and expected
head and refuses to replace human work or a changed pointer. Do not use this
branch for source work. `live.json` includes an `organization` field with the
`ai-org.live.v1` public view. A separate `organization-checkpoint.json` preserves
only already-public GitHub recovery metadata between workers. This is a deliberate
deployment-specific exception to the template's default private checkpoint policy:
runtime registrations and runtime records are rejected before public recovery
publication. The native HTTP cache stays on the runner and is never published.
A public read-only reader resolves the latest commit from
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

Related public repositories are discovered automatically for the panorama. Add an
explicit source to `organization.json` to connect that repository's activity to a
department. Keep source contracts and adapters in the generic Rust foundation;
trureturing's language, layout, editorial choices and publications stay here.

The foundation's `report` command supports owner-approved independent sessions,
public task registrations and expiring presence. This deployment has no private
session feed attached. Such a feed needs separate private checkpoint storage:
the public recovery publisher deliberately rejects runtime records. GitHub
accounts, issue claims and CI trigger accounts never establish a model identity
or current session presence.

Code: MIT. Source GitHub records retain their original authorship and repository
identity.
