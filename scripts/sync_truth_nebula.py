#!/usr/bin/env python3
"""Sync a structured 3D Truth DAG cosmic nebula projection from trureturing-pages.

Reads https://www.trureturing.org/data/atlas-startup.v1.json, preserves each real
mathematical galaxy's certified 3D local silhouette while framing the 8 galaxies
into a panoramic sky constellation arch, extracts real directed intra-cluster DAG
branching trees + real inter-galaxy dependency bundles, and writes
site/data/truth-nebula.v1.json.
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
DETAILS_PATH = OUT_PATH.with_name("truth-nebula-details.v1.json")

MAX_STARS = 1160
MAX_INTRA_EDGES = 640
MAX_CROSS_EDGES = 120
MAX_SUMMARY = 240
USER_AGENT = "Mozilla/5.0 (compatible; trureturing-live-nebula-sync/1.0; +https://live.trureturing.org)"

# Wide outer cosmic perimeter anchors framing the ENTIRE widescreen sky AROUND
# (never on top of!) the concrete foreground campus, Lean Bridge & Akasha Eye.
GALAXY_ANCHORS = {
    "Combinatorics":   (-475,  935, -150, "组合数学", "COMBINATORICS"),
    "Arith":           ( 475,  935, -150, "数论算术", "ARITH"),
    "ConceptDynamics": (-825,  615, -120, "概念动力", "CONCEPT DYNAMICS"),
    "Weil":            ( 825,  615, -120, "Weil 理论", "WEIL"),
    "Quantum":         (-795, -755, -110, "量子结构", "QUANTUM"),
    "Analytic":        ( 795, -755, -110, "解析分析", "ANALYTIC"),
    "Observer":        (   0, -830, -140, "观察者论", "OBSERVER"),
    "Other":           (   0,  980, -240, "公理星带", "FOUNDATIONS"),
}


def fetch_bytes(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def safe_subpath(path: str) -> str:
    clean = str(path or "").lstrip("/")
    if not clean.startswith("data/atlas-startup/") or ".." in clean or "://" in clean:
        raise ValueError(f"Refusing unexpected atlas path: {path!r}")
    return clean


def star_detail(node: list) -> list:
    """Module path, title, summary, topology role, DAG layer and theorem count of one star."""
    summary = str(node[4] or "") if len(node) > 4 else ""
    if len(summary) > MAX_SUMMARY:
        summary = summary[:MAX_SUMMARY].rstrip() + "…"
    admission = node[16] if len(node) > 16 and isinstance(node[16], dict) else {}
    layer = node[12] if len(node) > 12 and isinstance(node[12], int) else 0
    return [
        str(node[0] or ""),
        str(node[3] or "") if len(node) > 3 else "",
        summary,
        str(node[10] or "") if len(node) > 10 else "",
        layer,
        int(admission.get("theorem_count") or 0),
    ]


def build_nebula(manifest: dict, layout: dict, graph: dict) -> tuple[dict, dict]:
    """The sampled nebula and, aligned star by star, the details shown when a galaxy is opened."""
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    positions = layout.get("positions") or []
    if not nodes or len(positions) != len(nodes):
        raise ValueError("Layout/graph length mismatch")

    truth_indices = [i for i, n in enumerate(nodes) if len(n) > 5 and n[1] == "truth"]
    if not truth_indices:
        raise ValueError("No truth nodes found in atlas graph")
    truth_set = set(truth_indices)

    # Collect all real truth-dependency edges & degrees
    deg = Counter()
    in_deg = Counter()
    out_deg = Counter()
    truth_edges: list[tuple[int, int]] = []
    for e in edges:
        if len(e) >= 3 and e[2] == "truth-dependency":
            u, v = e[0], e[1]
            if u in truth_set and v in truth_set and u != v:
                truth_edges.append((u, v))
                deg[u] += 1
                deg[v] += 1
                out_deg[u] += 1
                in_deg[v] += 1

    # Top 7 mathematical domains + Other (= 8 galaxies)
    dom_counts = Counter((nodes[i][5] or "Other") for i in truth_indices)
    top_domains = [d for d, _ in dom_counts.most_common(7)]
    cluster_names = top_domains + ["Other"]
    dom_to_cid = {d: idx for idx, d in enumerate(top_domains)}
    other_cid = len(top_domains)

    # Real inter-galaxy directed truth-dependency bundle counts!
    inter_counts = Counter()
    for u, v in truth_edges:
        cu = dom_to_cid.get(nodes[u][5] or "Other", other_cid)
        cv = dom_to_cid.get(nodes[v][5] or "Other", other_cid)
        if cu != cv:
            inter_counts[(cu, cv)] += 1

    # Keep top 16 real inter-galaxy dependency bundles (merge reverse into dominant direction if both exist)
    directed_links = []
    seen_pairs = set()
    for (cu, cv), cnt in inter_counts.most_common(40):
        pair = (min(cu, cv), max(cu, cv))
        if pair in seen_pairs or cnt < 22:
            continue
        seen_pairs.add(pair)
        rev = inter_counts.get((cv, cu), 0)
        directed_links.append([cu, cv, cnt, rev])
        if len(directed_links) >= 16:
            break

    # Compute each galaxy's real local 3D centroid & spread so every galaxy preserves
    # its authentic certified topology silhouette when mounted on its sky arch anchor!
    by_cid_all: dict[int, list[int]] = defaultdict(list)
    for i in truth_indices:
        cid = dom_to_cid.get(nodes[i][5] or "Other", other_cid)
        by_cid_all[cid].append(i)

    local_stats: dict[int, tuple[float, float, float, float]] = {}
    for cid, pool in by_cid_all.items():
        mx = sum(positions[i][0] for i in pool) / len(pool)
        my = sum(positions[i][1] for i in pool) / len(pool)
        mz = sum(positions[i][2] for i in pool) / len(pool)
        # Robust 90th-percentile radius so outlier stray points don't squash the cluster
        rs = sorted(math.sqrt((positions[i][0] - mx) ** 2 + (positions[i][1] - my) ** 2 + (positions[i][2] - mz) ** 2) for i in pool)
        r90 = max(1.0, rs[int(len(rs) * 0.90)])
        local_stats[cid] = (mx, my, mz, r90)

    # Fallback anchor ring if a future domain appears outside GALAXY_ANCHORS
    clusters = []
    anchor_map: dict[int, tuple[int, int, int, float]] = {}
    for cid, name in enumerate(cluster_names):
        cnt = len(by_cid_all[cid])
        if cnt == 0:
            continue
        if name in GALAXY_ANCHORS:
            ax, ay, az, zh, en = GALAXY_ANCHORS[name]
        else:
            ang = (cid / max(1, len(cluster_names))) * math.pi * 2
            ax, ay, az = int(math.cos(ang) * 700), int(350 + math.sin(ang) * 300), -140
            zh, en = name, name.upper()
        # Airy, un-clumped cosmic dispersion so each galaxy reads as a spacious branching DAG nebula!
        gal_r = 250.0 if name == "Other" else min(215.0, 142.0 + math.sqrt(cnt / 500.0) * 34.0)
        anchor_map[cid] = (ax, ay, az, gal_r)
        clusters.append({
            "id": cid,
            "name": name,
            "en": en,
            "zh": zh,
            "count": cnt,
            "center": [ax, ay, az],
            "radius": int(round(gal_r)),
        })

    # Stratified selection biased toward connected real DAG trees inside every galaxy!
    # Pick hub nodes + their real direct dependency neighbors first so intra-galaxy DAG edges are super rich!
    adj_intra: dict[int, list[int]] = defaultdict(list)
    for u, v in truth_edges:
        cu = dom_to_cid.get(nodes[u][5] or "Other", other_cid)
        cv = dom_to_cid.get(nodes[v][5] or "Other", other_cid)
        if cu == cv:
            adj_intra[u].append(v)
            adj_intra[v].append(u)

    selected_set: set[int] = set()
    total_truth = len(truth_indices) or 1
    for cid, pool in sorted(by_cid_all.items()):
        quota = max(85, int(round(MAX_STARS * (0.35 / len(by_cid_all) + 0.65 * len(pool) / total_truth))))
        # 1) Seed top connected hubs in this galaxy and expand 1-hop real DAG chains via BFS
        hubs = sorted(pool, key=lambda i: (-deg[i], i))
        picked_local: list[int] = []
        picked_set_local: set[int] = set()
        bfs_target = int(quota * 0.68)
        for root in hubs:
            if len(picked_local) >= bfs_target:
                break
            if root in picked_set_local:
                continue
            q = [root]
            while q and len(picked_local) < bfs_target:
                cur = q.pop(0)
                if cur in picked_set_local:
                    continue
                picked_set_local.add(cur)
                picked_local.append(cur)
                # Follow up to 4 strongest real neighbors to preserve clean branching DAG trees
                nbrs = sorted(adj_intra.get(cur, []), key=lambda j: (-deg[j], j))
                added = 0
                for nb in nbrs:
                    if nb not in picked_set_local:
                        q.append(nb)
                        added += 1
                        if added >= 4:
                            break
        # 2) Fill remaining quota evenly across the galaxy to preserve full star-cloud volume
        rem_pool = [i for i in pool if i not in picked_set_local]
        rem_need = max(0, quota - len(picked_local))
        if rem_pool and rem_need > 0:
            step = max(1.0, len(rem_pool) / rem_need)
            pos_f = 0.0
            while len(picked_local) < quota and int(pos_f) < len(rem_pool):
                picked_local.append(rem_pool[int(pos_f)])
                pos_f += step
        selected_set.update(picked_local)

    selected = sorted(selected_set)[:MAX_STARS]
    idx_to_star = {orig_i: star_i for star_i, orig_i in enumerate(selected)}

    # Compute each star's panoramic 3D position + local/global topological generation (0..100)
    max_layer = max((int(nodes[i][12]) for i in selected if len(nodes[i]) > 12 and isinstance(nodes[i][12], int)), default=10)
    max_layer = max(1, max_layer)

    stars = []
    for i in selected:
        cid = dom_to_cid.get(nodes[i][5] or "Other", other_cid)
        mx, my, mz, r90 = local_stats[cid]
        ax, ay, az, gal_r = anchor_map[cid]
        dx = (positions[i][0] - mx) / r90
        dy = (positions[i][1] - my) / r90
        dz = (positions[i][2] - mz) / r90
        # Spread stars airily with radial push-out (sqrt curve) so clusters NEVER clump into dense white knots!
        r_loc = math.sqrt(dx * dx + dy * dy + dz * dz)
        if r_loc > 1e-4:
            r_airy = min(1.42, math.pow(min(1.45, r_loc), 0.62) * 1.18)
            mult = r_airy / r_loc
            dx *= mult
            dy *= mult
            dz *= mult
            r_loc = r_airy
        if cid == other_cid:
            # Spread Foundations ("Other") airily along the vast outer galactic halo instead of a central clump!
            ang = math.atan2(dy, dx)
            halo_r = 0.84 + 0.34 * min(1.0, r_loc / 1.42)
            sx = int(round(math.cos(ang) * 920 * halo_r))
            sy = int(round(math.sin(ang) * 860 * halo_r))
            sz = int(round(-220 + dz * 90))
        else:
            sx = int(round(ax + dx * gal_r))
            sy = int(round(ay + dy * gal_r * 0.78))
            sz = int(round(az + dz * gal_r * 0.65))
        layer = int(nodes[i][12]) if len(nodes[i]) > 12 and isinstance(nodes[i][12], int) else 0
        # Combine local radial distance & real DAG topological layer -> generation 0..100
        gen = int(round(min(100, max(0, (0.62 * min(1.0, r_loc / 1.15) + 0.38 * min(1.0, layer / max_layer)) * 100))))
        d_weight = min(10, int(round(math.log1p(deg[i]) * 2.2)))
        stars.append([sx, sy, sz, cid, gen, d_weight])

    # Extract REAL directed branching DAG edges:
    # 1) Clean intra-galaxy branching edges (ordered lower-gen -> higher-gen, max ~85 per galaxy)
    # 2) Key real cross-galaxy theorem links
    intra_by_cid: dict[int, list[tuple[int, int, int]]] = defaultdict(list)
    cross_cands: list[tuple[int, int, int]] = []
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
        cu, cv = stars[su][3], stars[sv][3]
        score = deg[u] + deg[v]
        if cu == cv:
            # Keep clean airy branching edges inside each named galaxy (skip sprawling halo ring chords for Other)
            du = math.dist(stars[su][:3], stars[sv][:3])
            if cu != other_cid and 24 < du < 245:
                intra_by_cid[cu].append((score, su, sv))
            elif cu == other_cid and 30 < du < 180:
                intra_by_cid[cu].append((score, su, sv))
        else:
            cross_cands.append((score, su, sv))

    chosen_edges = []
    per_gal_cap = max(55, MAX_INTRA_EDGES // max(1, len(clusters)))
    for cid, cands in sorted(intra_by_cid.items()):
        cands.sort(key=lambda item: (-item[0], item[1], item[2]))
        # Keep clean branching degree (at most 4 rendered edges per star) so DAG tree branches stay super legible!
        render_deg = Counter()
        added = 0
        for _, u, v in cands:
            if render_deg[u] >= 4 or render_deg[v] >= 4:
                continue
            render_deg[u] += 1
            render_deg[v] += 1
            chosen_edges.append([u, v, 0])
            added += 1
            if added >= per_gal_cap:
                break

    cross_cands.sort(key=lambda item: (-item[0], item[1], item[2]))
    for _, u, v in cross_cands[:MAX_CROSS_EDGES]:
        chosen_edges.append([u, v, 1])

    snap = graph.get("source_snapshot") or {}
    source_commit = snap.get("source_commit") or ""
    release = manifest.get("truth_release_digest") or ""
    details = {
        "schema_version": "trureturing-truth-nebula-details.v1",
        "source_commit": source_commit,
        "truth_release_digest": release,
        "stars": [star_detail(nodes[i]) for i in selected],
    }
    return {
        "schema_version": "trureturing-truth-nebula.v1",
        "source_commit": source_commit,
        "truth_release_digest": release,
        "counts": {
            "total_nodes": len(nodes),
            "truth_nodes": len(truth_indices),
            "truth_edges": len(truth_edges),
            "sampled_stars": len(stars),
            "sampled_edges": len(chosen_edges),
            "cluster_links": len(directed_links),
        },
        "clusters": clusters,
        "cluster_links": directed_links,
        "stars": stars,
        "edges": chosen_edges,
    }, details


def main() -> int:
    manifest = json.loads(fetch_bytes(MANIFEST_URL).decode("utf-8"))
    fast = manifest.get("fast") or {}
    layout_path = safe_subpath((fast.get("layout") or {}).get("path", ""))
    graph_path = safe_subpath((fast.get("graph") or {}).get("path", ""))

    layout = json.loads(gzip.decompress(fetch_bytes(BASE_URL + layout_path)).decode("utf-8"))
    graph = json.loads(gzip.decompress(fetch_bytes(BASE_URL + graph_path)).decode("utf-8"))
    payload, details = build_nebula(manifest, layout, graph)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    for path, data in ((DETAILS_PATH, details), (OUT_PATH, payload)):
        tmp_path = path.with_suffix(".json.tmp")
        tmp_path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        tmp_path.replace(path)
    print(
        f"Wrote {OUT_PATH.relative_to(OUT_PATH.parents[2])} "
        f"({OUT_PATH.stat().st_size:,} bytes): "
        f"{payload['counts']['truth_nodes']:,} truth nodes -> "
        f"{payload['counts']['sampled_stars']} stars, "
        f"{payload['counts']['sampled_edges']} DAG edges, "
        f"{payload['counts']['cluster_links']} inter-galaxy bundles"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
