#!/usr/bin/env python3
"""Sync a compact 3D Truth DAG cosmic nebula projection from trureturing-pages.

Reads the live public atlas startup manifest at https://www.trureturing.org/data/atlas-startup.v1.json,
extracts a faithful stratified sample of real frozen Lean truth nodes and truth-dependency edges
with their certified 3D topology positions, and writes site/data/truth-nebula.v1.json.
"""

from __future__ import annotations

import gzip
import json
import math
import pathlib
import sys
import urllib.request
from collections import Counter, defaultdict

BASE_URL = "https://www.trureturing.org/"
MANIFEST_URL = BASE_URL + "data/atlas-startup.v1.json"
OUT_PATH = pathlib.Path(__file__).resolve().parents[1] / "site" / "data" / "truth-nebula.v1.json"

MAX_STARS = 1450
MAX_EDGES = 920
USER_AGENT = "Mozilla/5.0 (compatible; trureturing-live-nebula-sync/1.0; +https://live.trureturing.org)"


def fetch_bytes(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def safe_subpath(path: str) -> str:
    clean = str(path or "").lstrip("/")
    if not clean.startswith("data/atlas-startup/") or ".." in clean or "://" in clean:
        raise ValueError(f"Refusing unexpected atlas path: {path!r}")
    return clean


def build_nebula(manifest: dict, layout: dict, graph: dict) -> dict:
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    positions = layout.get("positions") or []
    if not nodes or len(positions) != len(nodes):
        raise ValueError("Layout/graph length mismatch")

    truth_indices = [i for i, n in enumerate(nodes) if len(n) > 5 and n[1] == "truth"]
    if not truth_indices:
        raise ValueError("No truth nodes found in atlas graph")
    truth_set = set(truth_indices)

    # Real truth-dependency edges & degrees
    deg = Counter()
    truth_edges: list[tuple[int, int]] = []
    for e in edges:
        if len(e) >= 3 and e[2] == "truth-dependency":
            u, v = e[0], e[1]
            if u in truth_set and v in truth_set and u != v:
                truth_edges.append((u, v))
                deg[u] += 1
                deg[v] += 1

    # Top 7 mathematical domain galaxies + Other (8 clusters total)
    dom_counts = Counter((nodes[i][5] or "Other") for i in truth_indices)
    top_domains = [d for d, _ in dom_counts.most_common(7)]
    dom_to_cid = {d: idx for idx, d in enumerate(top_domains)}

    # Compute bounding/centering stats across all truth nodes
    xs = [positions[i][0] for i in truth_indices]
    ys = [positions[i][1] for i in truth_indices]
    zs = [positions[i][2] for i in truth_indices]
    cx0 = sum(xs) / len(xs)
    cy0 = sum(ys) / len(ys)
    cz0 = sum(zs) / len(zs)
    span_x = max(1.0, max(abs(x - cx0) for x in xs))
    span_y = max(1.0, max(abs(y - cy0) for y in ys))
    span_z = max(1.0, max(abs(z - cz0) for z in zs))
    scale = max(span_x, span_y * 1.15, span_z * 1.15)

    def norm_xyz(i: int) -> tuple[int, int, int]:
        px, py, pz = positions[i]
        return (
            int(round(((px - cx0) / scale) * 1000)),
            int(round(((py - cy0) / scale) * 1000)),
            int(round(((pz - cz0) / scale) * 1000)),
        )

    # Cluster centroids & real counts
    cluster_sums = [[0.0, 0.0, 0.0, 0] for _ in range(len(top_domains) + 1)]
    for i in truth_indices:
        cid = dom_to_cid.get(nodes[i][5] or "Other", len(top_domains))
        nx, ny, nz = norm_xyz(i)
        s = cluster_sums[cid]
        s[0] += nx
        s[1] += ny
        s[2] += nz
        s[3] += 1

    cluster_names = top_domains + ["Other"]
    clusters = []
    for cid, name in enumerate(cluster_names):
        sx, sy, sz, cnt = cluster_sums[cid]
        if cnt == 0:
            continue
        clusters.append({
            "id": cid,
            "name": name,
            "count": cnt,
            "center": [int(round(sx / cnt)), int(round(sy / cnt)), int(round(sz / cnt))],
        })

    # Stratified deterministic selection:
    # 1) Top 260 hub theorems by truth-dependency degree
    # 2) Remaining quota evenly stratified across all domains & topological layers
    hub_sorted = sorted(truth_indices, key=lambda i: (-deg[i], i))
    selected_set: set[int] = set(hub_sorted[:260])

    by_cid: dict[int, list[int]] = defaultdict(list)
    for i in truth_indices:
        if i not in selected_set:
            cid = dom_to_cid.get(nodes[i][5] or "Other", len(top_domains))
            by_cid[cid].append(i)

    remaining = max(0, MAX_STARS - len(selected_set))
    total_avail = sum(len(v) for v in by_cid.values()) or 1
    for cid, pool in sorted(by_cid.items()):
        quota = max(18, int(round(remaining * len(pool) / total_avail)))
        step = max(1.0, len(pool) / quota)
        pos_f = 0.0
        taken = 0
        while taken < quota and int(pos_f) < len(pool) and len(selected_set) < MAX_STARS:
            selected_set.add(pool[int(pos_f)])
            pos_f += step
            taken += 1

    selected = sorted(selected_set)
    idx_to_star = {orig_i: star_i for star_i, orig_i in enumerate(selected)}

    # Compute radial + DAG depth generation 0..100 so expansion sweeps realistically core -> frontier
    max_layer = max((int(nodes[i][12]) for i in selected if len(nodes[i]) > 12 and isinstance(nodes[i][12], int)), default=10)
    max_layer = max(1, max_layer)
    radii = {}
    for i in selected:
        nx, ny, nz = norm_xyz(i)
        radii[i] = math.sqrt(nx * nx + ny * ny + nz * nz)
    max_rad = max(radii.values()) or 1.0

    stars = []
    for i in selected:
        nx, ny, nz = norm_xyz(i)
        cid = dom_to_cid.get(nodes[i][5] or "Other", len(top_domains))
        layer = int(nodes[i][12]) if len(nodes[i]) > 12 and isinstance(nodes[i][12], int) else 0
        r_norm = radii[i] / max_rad
        l_norm = min(1.0, layer / max_layer)
        gen = int(round(min(100, max(0, (0.68 * r_norm + 0.32 * l_norm) * 100))))
        d_weight = min(10, int(round(math.log1p(deg[i]) * 2.2)))
        stars.append([nx, ny, nz, cid, gen, d_weight])

    # Real truth-dependency edges between selected stars, prioritizing cross-cluster & hub links
    cand_edges: list[tuple[int, int, int]] = []
    seen_e: set[tuple[int, int]] = set()
    for u, v in truth_edges:
        su = idx_to_star.get(u)
        sv = idx_to_star.get(v)
        if su is None or sv is None or su == sv:
            continue
        pair = (su, sv) if su < sv else (sv, su)
        if pair in seen_e:
            continue
        seen_e.add(pair)
        cross = 1 if stars[su][3] != stars[sv][3] else 0
        score = cross * 40 + deg[u] + deg[v]
        cand_edges.append((score, su, sv))

    cand_edges.sort(key=lambda item: (-item[0], item[1], item[2]))
    chosen_edges = [[u, v] for _, u, v in cand_edges[:MAX_EDGES]]

    snap = graph.get("source_snapshot") or {}
    return {
        "schema_version": "trureturing-truth-nebula.v1",
        "source_commit": snap.get("source_commit") or "",
        "truth_release_digest": manifest.get("truth_release_digest") or "",
        "counts": {
            "total_nodes": len(nodes),
            "truth_nodes": len(truth_indices),
            "truth_edges": len(truth_edges),
            "sampled_stars": len(stars),
            "sampled_edges": len(chosen_edges),
        },
        "clusters": clusters,
        "stars": stars,
        "edges": chosen_edges,
    }


def main() -> int:
    manifest = json.loads(fetch_bytes(MANIFEST_URL).decode("utf-8"))
    fast = manifest.get("fast") or {}
    layout_path = safe_subpath((fast.get("layout") or {}).get("path", ""))
    graph_path = safe_subpath((fast.get("graph") or {}).get("path", ""))

    layout = json.loads(gzip.decompress(fetch_bytes(BASE_URL + layout_path)).decode("utf-8"))
    graph = json.loads(gzip.decompress(fetch_bytes(BASE_URL + graph_path)).decode("utf-8"))
    payload = build_nebula(manifest, layout, graph)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = OUT_PATH.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    tmp_path.replace(OUT_PATH)
    print(
        f"Wrote {OUT_PATH.relative_to(OUT_PATH.parents[2])} "
        f"({OUT_PATH.stat().st_size:,} bytes): "
        f"{payload['counts']['truth_nodes']:,} truth nodes -> "
        f"{payload['counts']['sampled_stars']} stars, {payload['counts']['sampled_edges']} DAG edges"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
