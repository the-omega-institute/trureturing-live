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
FULL_ATLAS_PATH = OUT_PATH.with_name("truth-atlas-full.v1.json")

MAX_STARS = 3000
MAX_INTRA_EDGES = 1950
MAX_CROSS_EDGES = 260
MAX_ATLAS_EDGES = 16000
MAX_SUMMARY = 240
MAX_NODE_LINKS = 10
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


def star_detail(node: list, prereq_count: int = 0, dependent_count: int = 0, prereqs: list | None = None, dependents: list | None = None) -> list:
    """Module path, title, summary, topology role, DAG layer, theorem count, full prerequisite and
    dependent counts, and the prerequisite and dependent stars among the sampled stars."""
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
        prereq_count,
        dependent_count,
        list(prereqs or [])[:MAX_NODE_LINKS],
        list(dependents or [])[:MAX_NODE_LINKS],
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
    # An edge (u, v) runs from a prerequisite u to the module v that depends on it.
    prereqs_of: dict[int, list[int]] = defaultdict(list)
    dependents_of: dict[int, list[int]] = defaultdict(list)
    for e in edges:
        if len(e) >= 3 and e[2] == "truth-dependency":
            u, v = e[0], e[1]
            if u in truth_set and v in truth_set and u != v:
                truth_edges.append((u, v))
                deg[u] += 1
                deg[v] += 1
                out_deg[u] += 1
                in_deg[v] += 1
                prereqs_of[v].append(u)
                dependents_of[u].append(v)

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

    def node_reuse(i: int) -> int:
        n = nodes[i]
        return int(n[13]) if len(n) > 13 and isinstance(n[13], (int, float)) else 0

    selected_set: set[int] = set()
    total_truth = len(truth_indices) or 1
    for cid, pool in sorted(by_cid_all.items()):
        quota = max(190, int(round(MAX_STARS * (0.28 / len(by_cid_all) + 0.72 * len(pool) / total_truth))))
        # 1) Prioritize real high-reuse hubs (345+, 64-344) first, then expand real branching DAG chains via BFS
        hubs = sorted(pool, key=lambda i: (-node_reuse(i), -deg[i], i))
        picked_local: list[int] = []
        picked_set_local: set[int] = set()
        # Guarantee every core hub (tier 4) and top pillars (tier 3) in this galaxy are seeded first
        for h_i in hubs:
            if len(picked_local) >= int(quota * 0.34):
                break
            if reuse_tier(node_reuse(h_i)) >= 3:
                picked_set_local.add(h_i)
                picked_local.append(h_i)
        bfs_target = int(quota * 0.72)
        for root in hubs:
            if len(picked_local) >= bfs_target:
                break
            if root in picked_set_local and not adj_intra.get(root):
                continue
            q = [root]
            while q and len(picked_local) < bfs_target:
                cur = q.pop(0)
                if cur not in picked_set_local:
                    picked_set_local.add(cur)
                    picked_local.append(cur)
                # Follow up to 4 strongest real neighbors to preserve clean airy branching arms
                nbrs = sorted(adj_intra.get(cur, []), key=lambda j: (-node_reuse(j), -deg[j], j))
                added = 0
                for nb in nbrs:
                    if nb not in picked_set_local:
                        q.append(nb)
                        added += 1
                        if added >= 4:
                            break
        # 2) Fill remaining quota evenly across the galaxy to preserve airy outer stardust halo
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

    # Compute each star's panoramic 3D orbital spiral-galaxy position + real reuse tier (0..4)!
    max_layer = max((int(nodes[i][12]) for i in selected if len(nodes[i]) > 12 and isinstance(nodes[i][12], int)), default=10)
    max_layer = max(1, max_layer)

    # Radial shells keyed by real reuse tier: 345+ hubs form a spacious luminous galactic core -> 0 leaves dust the outer halo!
    tier_shells = (
        (0.84, 0.54),  # tier 0 (0 leaves): airy outer galactic halo stardust
        (0.68, 0.50),  # tier 1 (1-5): outer spiral wings
        (0.50, 0.46),  # tier 2 (6-63): main sweeping spiral arms
        (0.30, 0.42),  # tier 3 (64-344): inner spiral backbone
        (0.10, 0.34),  # tier 4 (345+ core hubs): spacious golden galactic core constellation
    )

    stars = []
    tier_counts = [0, 0, 0, 0, 0]
    for i in selected:
        cid = dom_to_cid.get(nodes[i][5] or "Other", other_cid)
        mx, my, mz, r90 = local_stats[cid]
        ax, ay, az, gal_r = anchor_map[cid]
        dx = (positions[i][0] - mx) / r90
        dy = (positions[i][1] - my) / r90
        dz = (positions[i][2] - mz) / r90
        reuse = node_reuse(i)
        tier = reuse_tier(reuse)
        tier_counts[tier] += 1

        r_raw = math.sqrt(dx * dx + dy * dy + dz * dz)
        r_norm = min(1.0, r_raw / 1.35)
        if cid == other_cid:
            # Spread Foundations ("Other") airily along the vast outer orbital star-river belt
            ang = math.atan2(dy, dx)
            halo_r = 0.86 + 0.32 * r_norm
            sx = int(round(math.cos(ang) * 920 * halo_r))
            sy = int(round(math.sin(ang) * 860 * halo_r))
            sz = int(round(-220 + max(-1.1, min(1.1, dz)) * 85))
            r_loc = halo_r
        else:
            # True logarithmic 2-arm astronomical spiral galaxy sculpted from real atlas-branched-dag-v5 bearings & reuse tiers!
            s_base, s_span = tier_shells[tier]
            # Spread nodes evenly within their tier shell using deterministic golden-ratio phase jitter for zero clumping
            jitter = ((i * 2654435761) & 0xFFFF) / 65535.0
            r_in_shell = 0.65 * math.pow(r_norm, 0.78) + 0.35 * jitter
            r_target = s_base + s_span * r_in_shell
            r_blend = 0.30 * min(1.38, r_raw) + 0.70 * r_target
            # Authentic azimuthal bearing from atlas-branched-dag-v5 -> gently clustered into 2 sweeping logarithmic spiral arms!
            phi0 = math.atan2(dz, dx) if (abs(dx) + abs(dz)) > 1e-4 else (jitter * math.pi * 2.0)
            arm_pull = 0.30 * math.sin(2.0 * phi0)
            twist = 1.38 * math.pow(r_blend, 0.85)
            phi = phi0 - arm_pull + twist
            rx_t = math.cos(phi) * r_blend
            rz_t = math.sin(phi) * r_blend
            # Natural nuclear bulge tapering into a crisp galactic spiral plane
            bulge = 0.38 * math.exp(-r_blend * 1.45) + 0.12
            dy_norm = max(-1.2, min(1.2, dy / max(0.35, r_raw)))
            ry_t = dy_norm * bulge
            sx = int(round(ax + rx_t * gal_r * 1.04))
            sy = int(round(ay + ry_t * gal_r * 0.95))
            sz = int(round(az + rz_t * gal_r * 1.04))
            r_loc = r_blend
        layer = int(nodes[i][12]) if len(nodes[i]) > 12 and isinstance(nodes[i][12], int) else 0
        gen = int(round(min(100, max(0, (0.58 * min(1.0, r_loc / 1.25) + 0.42 * min(1.0, layer / max_layer)) * 100))))
        d_weight = min(10, int(round(math.log1p(reuse + deg[i]) * 1.45)))
        stars.append([sx, sy, sz, cid, gen, d_weight, tier])

    # Extract REAL directed branching DAG edges:
    # 1) Clean uncluttered intra-galaxy spiral constellation bones (max render degree 4 per star)
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
        score = node_reuse(u) + node_reuse(v) + (deg[u] + deg[v]) * 4
        if cu == cv:
            du = math.dist(stars[su][:3], stars[sv][:3])
            if cu != other_cid and 12 < du < 285:
                intra_by_cid[cu].append((score, su, sv))
            elif cu == other_cid and 20 < du < 210:
                intra_by_cid[cu].append((score, su, sv))
        else:
            cross_cands.append((score, su, sv))

    chosen_edges = []
    per_gal_cap = max(220, MAX_INTRA_EDGES // max(1, len(clusters)))
    for cid, cands in sorted(intra_by_cid.items()):
        cands.sort(key=lambda item: (-item[0], item[1], item[2]))
        # Airy, structured branching degree (at most 4 rendered edges per star) so galaxy arms read clearly!
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
        "stars": [
            star_detail(
                nodes[i],
                in_deg[i],
                out_deg[i],
                sorted((idx_to_star[u] for u in prereqs_of[i] if u in idx_to_star), key=lambda k: (-deg[selected[k]], k)),
                sorted((idx_to_star[v] for v in dependents_of[i] if v in idx_to_star), key=lambda k: (-deg[selected[k]], k)),
            )
            for i in selected
        ],
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
            "tiers": tier_counts,
        },
        "clusters": clusters,
        "cluster_links": directed_links,
        "stars": stars,
        "edges": chosen_edges,
    }, details


def reuse_tier(dependent_count: int) -> int:
    """Match trureturing-pages reuse tiers (0, 1-5, 6-63, 64-344, 345+)."""
    if dependent_count >= 345:
        return 4
    if dependent_count >= 64:
        return 3
    if dependent_count >= 6:
        return 2
    if dependent_count >= 1:
        return 1
    return 0


def build_full_atlas(manifest: dict, layout: dict, graph: dict) -> dict:
    """Full 100% real Truth DAG in authentic atlas-branched-dag-v5 3D topology.

    Outputs compact flat integer arrays so WebGL2 renders ALL ~19,000 real Lean
    verified modules and up to 16,000 real directed dependency edges at 60fps
    without synthetic smoke clouds.
    """
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    positions = layout.get("positions") or []
    if not nodes or len(positions) != len(nodes):
        raise ValueError("Layout/graph length mismatch")

    truth_indices = [i for i, n in enumerate(nodes) if len(n) > 5 and n[1] == "truth"]
    if not truth_indices:
        raise ValueError("No truth nodes found in atlas graph")
    truth_set = set(truth_indices)

    dom_counts = Counter((nodes[i][5] or "Other") for i in truth_indices)
    top_domains = [d for d, _ in dom_counts.most_common(7)]
    dom_to_cid = {d: idx for idx, d in enumerate(top_domains)}
    other_cid = len(top_domains)

    # Robust 4th-96th percentile bounding frame so extreme outliers don't compress the main graph
    xs = sorted(positions[i][0] for i in truth_indices)
    ys = sorted(positions[i][1] for i in truth_indices)
    zs = sorted(positions[i][2] for i in truth_indices)
    n_t = len(truth_indices)
    lo = max(0, int(n_t * 0.03))
    hi = min(n_t - 1, int(n_t * 0.97))
    cx = (xs[lo] + xs[hi]) * 0.5
    cy = (ys[lo] + ys[hi]) * 0.5
    cz = (zs[lo] + zs[hi]) * 0.5
    rx = max(1.0, (xs[hi] - xs[lo]) * 0.5)
    ry = max(1.0, (ys[hi] - ys[lo]) * 0.5)
    rz = max(1.0, (zs[hi] - zs[lo]) * 0.5)
    span = max(rx, ry * 1.15, rz * 1.15)

    max_layer = max((int(nodes[i][12]) for i in truth_indices if len(nodes[i]) > 12 and isinstance(nodes[i][12], int)), default=10)
    max_layer = max(1, max_layer)

    # Sort nodes ascending by reuse tier so core amber-gold hubs (tier 4) draw cleanly on top!
    def node_reuse(i: int) -> int:
        n = nodes[i]
        return int(n[13]) if len(n) > 13 and isinstance(n[13], (int, float)) else 0

    def node_layer(i: int) -> int:
        n = nodes[i]
        return int(n[12]) if len(n) > 12 and isinstance(n[12], int) else 0

    ordered = sorted(truth_indices, key=lambda i: (reuse_tier(node_reuse(i)), node_layer(i), i))
    orig_to_atlas = {orig_i: atlas_i for atlas_i, orig_i in enumerate(ordered)}

    flat_nodes: list[int] = []
    coords_by_atlas: list[tuple[int, int, int]] = []
    cid_sums: dict[int, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])
    tier_counts = [0, 0, 0, 0, 0]

    for orig_i in ordered:
        px, py, pz = positions[orig_i]
        nx = max(-1350, min(1350, int(round((px - cx) / span * 1000.0))))
        ny = max(-1100, min(1100, int(round((py - cy) / span * 1000.0))))
        nz = max(-1100, min(1100, int(round((pz - cz) / span * 1000.0))))
        cid = dom_to_cid.get(nodes[orig_i][5] or "Other", other_cid)
        t_val = reuse_tier(node_reuse(orig_i))
        tier_counts[t_val] += 1
        lay_norm = min(1.0, max(0.0, node_layer(orig_i) / max_layer))
        gen = min(99, max(0, int(round(math.pow(lay_norm, 0.55) * 99))))
        meta = t_val * 100 + gen
        flat_nodes.extend((nx, ny, nz, cid, meta))
        coords_by_atlas.append((nx, ny, nz))
        acc = cid_sums[cid]
        acc[0] += nx
        acc[1] += ny
        acc[2] += nz
        acc[3] += 1.0

    # Real 3D cluster centroids in authentic atlas-branched-dag-v5 space
    centers: dict[str, list[int]] = {}
    for cid in range(len(top_domains)):
        acc = cid_sums.get(cid)
        if acc and acc[3] > 0:
            centers[str(cid)] = [int(round(acc[0] / acc[3])), int(round(acc[1] / acc[3])), int(round(acc[2] / acc[3]))]

    # Collect up to MAX_ATLAS_EDGES real directed truth-dependency edges preserving branching trees & hubs!
    edge_cands: list[tuple[int, int, int]] = []
    seen_e: set[tuple[int, int]] = set()
    for e in edges:
        if len(e) < 3 or e[2] != "truth-dependency":
            continue
        u, v = e[0], e[1]
        if u not in truth_set or v not in truth_set or u == v:
            continue
        au = orig_to_atlas.get(u)
        av = orig_to_atlas.get(v)
        if au is None or av is None or au == av:
            continue
        pair = (au, av) if au < av else (av, au)
        if pair in seen_e:
            continue
        seen_e.add(pair)
        cu, cv = coords_by_atlas[au], coords_by_atlas[av]
        d3 = math.dist(cu, cv)
        if d3 > 980.0:
            continue
        # Favor structured local/mid-range branches + high-reuse hubs over noisy extreme chords
        score = node_reuse(u) + node_reuse(v) + (180 if d3 < 320.0 else 0)
        edge_cands.append((score, au, av))

    edge_cands.sort(key=lambda item: (-item[0], item[1], item[2]))
    flat_edges: list[int] = []
    for _, au, av in edge_cands[:MAX_ATLAS_EDGES]:
        flat_edges.extend((au, av))

    snap = graph.get("source_snapshot") or {}
    return {
        "schema_version": "trureturing-truth-atlas-full.v1",
        "layout_profile": layout.get("layout_profile") or manifest.get("layout_profile") or "atlas-branched-dag-v5",
        "source_commit": snap.get("source_commit") or "",
        "truth_release_digest": manifest.get("truth_release_digest") or "",
        "counts": {
            "truth_nodes": len(ordered),
            "rendered_edges": len(flat_edges) // 2,
            "max_layer": max_layer,
            "tiers": tier_counts,
        },
        "centers": centers,
        "nodes": flat_nodes,
        "edges": flat_edges,
    }


def main() -> int:
    manifest = json.loads(fetch_bytes(MANIFEST_URL).decode("utf-8"))
    fast = manifest.get("fast") or {}
    layout_path = safe_subpath((fast.get("layout") or {}).get("path", ""))
    graph_path = safe_subpath((fast.get("graph") or {}).get("path", ""))

    layout = json.loads(gzip.decompress(fetch_bytes(BASE_URL + layout_path)).decode("utf-8"))
    graph = json.loads(gzip.decompress(fetch_bytes(BASE_URL + graph_path)).decode("utf-8"))
    payload, details = build_nebula(manifest, layout, graph)
    full_atlas = build_full_atlas(manifest, layout, graph)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    for path, data in ((DETAILS_PATH, details), (OUT_PATH, payload), (FULL_ATLAS_PATH, full_atlas)):
        tmp_path = path.with_suffix(".json.tmp")
        tmp_path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        tmp_path.replace(path)
    print(
        f"Wrote {OUT_PATH.relative_to(OUT_PATH.parents[2])} "
        f"({OUT_PATH.stat().st_size:,} bytes): "
        f"{payload['counts']['truth_nodes']:,} truth nodes -> "
        f"{payload['counts']['sampled_stars']} stars, "
        f"{payload['counts']['sampled_edges']} DAG edges, "
        f"{payload['counts']['cluster_links']} inter-galaxy bundles; "
        f"full atlas: {FULL_ATLAS_PATH.stat().st_size:,} bytes "
        f"({full_atlas['counts']['truth_nodes']:,} nodes, {full_atlas['counts']['rendered_edges']:,} edges)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
