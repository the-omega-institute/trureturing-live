// ============================================================================
// TRURETURING // LIVE — WEBGL2 3-STRATA COSMIC OBSERVATORY ENGINE (hive-v39)
// Igloo Inc. × Active Theory × KPR × NASA Eyes architecture:
//   STRATUM 1 (地面): Lowered reflective obsidian/alabaster abyss floor (y = -1.35)
//   STRATUM 2 (空中): Suspended orbital Space Station + 8 CNC-etched crystal monoliths (y = 0..4.2)
//   STRATUM 3 (星空): Procedural FBM cosmic nebula sky dome + 3D Truth DAG galaxy canopy (y = 4.5..13.5)
//   POST-FX: Multi-pass Selective GPU Bloom + ACES Filmic + Chromatic Edge + Vignette + Film Grain
// ============================================================================
(function () {
  'use strict';

  const M4 = {
    create: () => new Float32Array(16),
    identity(out) {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    perspective(out, fovy, aspect, near, far, ndcShiftX = 0) {
      const f = 1.0 / Math.tan(fovy * 0.5);
      const nf = 1.0 / (near - far);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[8] = ndcShiftX; // Asymmetrical frustum optical center shift (centers 3D world in open viewport!)
      out[10] = (far + near) * nf;
      out[11] = -1;
      out[14] = 2 * far * near * nf;
      return out;
    },
    lookAt(out, eye, target, up) {
      let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
      let len = Math.hypot(zx, zy, zz) || 1;
      zx /= len; zy /= len; zz /= len;
      let xx = up[1] * zz - up[2] * zy;
      let xy = up[2] * zx - up[0] * zz;
      let xz = up[0] * zy - up[1] * zx;
      len = Math.hypot(xx, xy, xz) || 1;
      xx /= len; xy /= len; xz /= len;
      const yx = zy * xz - zz * xy;
      const yy = zz * xx - zx * xz;
      const yz = zx * xy - zy * xx;
      out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
      out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
      out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
      out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
      out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
      out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
      out[15] = 1;
      return out;
    },
    mul(out, a, b) {
      for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
      return out;
    },
    compose(out, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
      const cx = Math.cos(rx), sxr = Math.sin(rx);
      const cy = Math.cos(ry), syr = Math.sin(ry);
      const cz = Math.cos(rz), szr = Math.sin(rz);
      out[0] = (cy * cz + syr * sxr * szr) * sx;
      out[1] = (cx * szr) * sx;
      out[2] = (-syr * cz + cy * sxr * szr) * sx;
      out[3] = 0;
      out[4] = (-cy * szr + syr * sxr * cz) * sy;
      out[5] = (cx * cz) * sy;
      out[6] = (syr * szr + cy * sxr * cz) * sy;
      out[7] = 0;
      out[8] = (syr * cx) * sz;
      out[9] = (-sxr) * sz;
      out[10] = (cy * cx) * sz;
      out[11] = 0;
      out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
      return out;
    }
  };

  // ---- Map Truth DAG Coordinates into a 3D Celestial Helical Ring (周天星斗大阵) ----
  // Wraps all 7 named mathematical galaxies + the 360° Foundation Star River cleanly BELOW
  // the Supreme Akasha Eye (y = 6.95) and ABOVE the reflective Ground Abyss (y = -1.35)!
  const CELESTIAL_ANCHORS = {
    6: [ 0.00, 3.55, 10.6], // Observer: rear center below Supreme Akasha Eye
    0: [-0.56, 3.45, 10.8], // Combinatorics: upper-left orbiting halo
    2: [ 0.56, 3.45, 10.8], // Arith: upper-right orbiting halo
    3: [-1.00, 2.45, 10.8], // ConceptDynamics: mid-left helical wing
    5: [ 1.00, 2.45, 10.8], // Weil: mid-right helical wing
    1: [-1.26, 1.35, 10.4], // Quantum: lower-left flank above ground
    4: [ 1.26, 1.35, 10.4]  // Analytic: lower-right flank above ground
  };

  function mapStarToCelestialRing(nx, ny, nz, cid, clusterCenters) {
    const anc = cid != null ? CELESTIAL_ANCHORS[cid] : null;
    if (anc) {
      const cc = clusterCenters?.get(cid);
      const dx = cc ? (nx - cc[0] / 1000) : 0;
      const dy = cc ? (ny - cc[1] / 1000) : 0;
      const dz = cc ? (nz - cc[2] / 1000) : 0;
      const az = anc[0] + dx * 0.68;
      const rad = anc[2] + dz * 3.8 + Math.abs(dx) * 0.50;
      const wy = anc[1] + dy * 1.90;
      return [Math.sin(az) * rad, wy, -Math.cos(az) * rad - 0.65];
    }
    // Foundations Belt (Other): continuous 360° celestial star river orbiting strictly beneath the Akasha Eye!
    const rawAng = Math.atan2(nx, ny);
    const az = rawAng * 1.12;
    const rad = 10.2 + ((Math.abs(nx * 7.3 + ny * 5.1) % 1) * 2.1) + nz * 2.6;
    const wy = 0.50 + (Math.cos(az) * 0.5 + 0.5) * 3.25 + ny * 0.42;
    return [Math.sin(az) * rad, wy, -Math.cos(az) * rad - 0.55];
  }

  // ---- Procedural Architectural Mesh Builder + Sharp Crease Edge Extractor (EdgesGeometry equivalent) ----
  class MeshBuilder {
    constructor() {
      this.verts = [];
      this.faces = [];
    }

    addPolygon(pts, mat = 0) {
      if (pts.length < 3) return;
      const a = pts[0], b = pts[1], c = pts[2];
      const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
      const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      this.faces.push({ pts, n: [nx, ny, nz], mat });
      for (let i = 1; i < pts.length - 1; i++) {
        for (const p of [pts[0], pts[i], pts[i + 1]]) {
          this.verts.push(p[0], p[1], p[2], nx, ny, nz, mat);
        }
      }
    }

    addBox(cx, cy, cz, sx, sy, sz, mat = 0, rotY = 0) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const c = Math.cos(rotY), s = Math.sin(rotY);
      const tf = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
      const p000 = tf(-hx, -hy, -hz), p100 = tf(hx, -hy, -hz), p110 = tf(hx, hy, -hz), p010 = tf(-hx, hy, -hz);
      const p001 = tf(-hx, -hy,  hz), p101 = tf(hx, -hy,  hz), p111 = tf(hx, hy,  hz), p011 = tf(-hx, hy,  hz);
      this.addPolygon([p001, p101, p111, p011], mat);
      this.addPolygon([p100, p000, p010, p110], mat);
      this.addPolygon([p011, p111, p110, p010], mat);
      this.addPolygon([p000, p100, p101, p001], mat);
      this.addPolygon([p101, p100, p110, p111], mat);
      this.addPolygon([p000, p001, p011, p010], mat);
    }

    addPrism(cx, yBot, cz, rBot, rTop, height, sides, mat = 0, rotOffset = 0, capTop = true, capBot = true) {
      const bot = [], top = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + rotOffset;
        const ca = Math.cos(a), sa = Math.sin(a);
        bot.push([cx + ca * rBot, yBot, cz + sa * rBot]);
        top.push([cx + ca * rTop, yBot + height, cz + sa * rTop]);
      }
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        this.addPolygon([bot[j], bot[i], top[i], top[j]], mat);
      }
      if (capTop && rTop > 0.0005) this.addPolygon(top.slice().reverse(), mat);
      if (capBot && rBot > 0.0005) this.addPolygon(bot.slice(), mat);
    }

    addChamferedTerrace(sx, sz, hx, hz, ch, yBot, yTop, mat = 0, undersideTaper = 0) {
      const polyTop = [
        [sx - hx + ch, sz - hz], [sx + hx - ch, sz - hz],
        [sx + hx, sz - hz + ch], [sx + hx, sz + hz - ch],
        [sx + hx - ch, sz + hz], [sx - hx + ch, sz + hz],
        [sx - hx, sz + hz - ch], [sx - hx, sz - hz + ch]
      ];
      const bot = polyTop.map(([x, z]) => [x, yBot, z]);
      const top = polyTop.map(([x, z]) => [x, yTop, z]);
      const n = polyTop.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        this.addPolygon([bot[j], bot[i], top[i], top[j]], mat);
      }
      this.addPolygon(top.slice().reverse(), mat);
      if (undersideTaper > 0) {
        // Tapered architectural underside hull keel so floating decks feel heavy & monumental in mid-air!
        const keel = polyTop.map(([x, z]) => [
          sx + (x - sx) * 0.62,
          yBot - undersideTaper,
          sz + (z - sz) * 0.62
        ]);
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          this.addPolygon([keel[j], keel[i], bot[i], bot[j]], 0);
        }
        this.addPolygon(keel.slice(), 0);
      }
    }

    addOctahedron(cx, cy, cz, rx, ry, rz, mat = 1, rotY = 0) {
      const c = Math.cos(rotY), s = Math.sin(rotY);
      const tf = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
      const top = tf(0, ry, 0), bot = tf(0, -ry, 0);
      const eq = [tf(rx, 0, 0), tf(0, 0, rz), tf(-rx, 0, 0), tf(0, 0, -rz)];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        this.addPolygon([eq[j], eq[i], top], mat);
        this.addPolygon([eq[i], eq[j], bot], mat);
      }
    }

    addIcosahedron(cx, cy, cz, radius, mat = 1, explode = 0) {
      const t = (1 + Math.sqrt(5)) * 0.5;
      const raw = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
      ].map(([x, y, z]) => {
        const l = Math.hypot(x, y, z);
        return [x / l * radius, y / l * radius, z / l * radius];
      });
      const idx = [
        [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
        [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
        [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
        [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
      ];
      for (const [a, b, c] of idx) {
        const pa = raw[a], pb = raw[b], pc = raw[c];
        const mx = (pa[0] + pb[0] + pc[0]) / 3;
        const my = (pa[1] + pb[1] + pc[1]) / 3;
        const mz = (pa[2] + pb[2] + pc[2]) / 3;
        const ml = Math.hypot(mx, my, mz) || 1;
        const ox = cx + (mx / ml) * explode;
        const oy = cy + (my / ml) * explode;
        const oz = cz + (mz / ml) * explode;
        this.addPolygon([
          [ox + pa[0], oy + pa[1], oz + pa[2]],
          [ox + pb[0], oy + pb[1], oz + pb[2]],
          [ox + pc[0], oy + pc[1], oz + pc[2]]
        ], mat);
      }
    }

    addTorusRing(cx, cy, cz, majorR, minorR, segs = 32, tubeSegs = 6, tiltX = 0, tiltZ = 0, mat = 2) {
      const cX = Math.cos(tiltX), sX = Math.sin(tiltX);
      const cZ = Math.cos(tiltZ), sZ = Math.sin(tiltZ);
      const ringPt = (u, v) => {
        const cu = Math.cos(u), su = Math.sin(u);
        const cv = Math.cos(v), sv = Math.sin(v);
        const r = majorR + minorR * cv;
        let x = r * cu, y = minorR * sv, z = r * su;
        const y1 = y * cX - z * sX, z1 = y * sX + z * cX;
        const x2 = x * cZ - y1 * sZ, y2 = x * sZ + y1 * cZ;
        return [cx + x2, cy + y2, cz + z1];
      };
      for (let i = 0; i < segs; i++) {
        const u0 = (i / segs) * Math.PI * 2;
        const u1 = ((i + 1) / segs) * Math.PI * 2;
        for (let j = 0; j < tubeSegs; j++) {
          const v0 = (j / tubeSegs) * Math.PI * 2;
          const v1 = ((j + 1) / tubeSegs) * Math.PI * 2;
          this.addPolygon([ringPt(u0, v0), ringPt(u1, v0), ringPt(u1, v1), ringPt(u0, v1)], mat);
        }
      }
    }

    addParabolicDish(cx, cy, cz, radius, depth, segs = 12, rings = 3, tiltX = -0.35, mat = 1) {
      const cX = Math.cos(tiltX), sX = Math.sin(tiltX);
      const tf = (x, y, z) => {
        const y1 = y * cX - z * sX;
        const z1 = y * sX + z * cX;
        return [cx + x, cy + y1, cz + z1];
      };
      for (let r = 0; r < rings; r++) {
        const f0 = r / rings, f1 = (r + 1) / rings;
        const r0 = f0 * radius, r1 = f1 * radius;
        const y0 = f0 * f0 * depth, y1 = f1 * f1 * depth;
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2;
          const a1 = ((i + 1) / segs) * Math.PI * 2;
          const p00 = tf(Math.cos(a0) * r0, y0, Math.sin(a0) * r0);
          const p10 = tf(Math.cos(a1) * r0, y0, Math.sin(a1) * r0);
          const p11 = tf(Math.cos(a1) * r1, y1, Math.sin(a1) * r1);
          const p01 = tf(Math.cos(a0) * r1, y1, Math.sin(a0) * r1);
          if (r === 0) this.addPolygon([p00, p11, p01], mat);
          else this.addPolygon([p00, p10, p11, p01], mat);
        }
      }
    }

    build(gl, creaseDeg = 22) {
      const cosThresh = Math.cos((creaseDeg * Math.PI) / 180);
      const qKey = p => `${Math.round(p[0] * 500)},${Math.round(p[1] * 500)},${Math.round(p[2] * 500)}`;
      const edgeMap = new Map();
      for (const f of this.faces) {
        const pts = f.pts;
        const m = pts.length;
        for (let i = 0; i < m; i++) {
          const a = pts[i], b = pts[(i + 1) % m];
          const ka = qKey(a), kb = qKey(b);
          const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
          const prev = edgeMap.get(key);
          if (!prev) {
            edgeMap.set(key, { a, b, n: f.n, mat: f.mat, count: 1, sharp: true });
          } else {
            const dot = prev.n[0] * f.n[0] + prev.n[1] * f.n[1] + prev.n[2] * f.n[2];
            prev.count += 1;
            prev.sharp = dot < cosThresh || prev.mat !== f.mat;
          }
        }
      }
      const edgeVerts = [];
      for (const e of edgeMap.values()) {
        if (e.count === 1 || e.sharp) {
          edgeVerts.push(e.a[0], e.a[1], e.a[2], e.mat, e.b[0], e.b[1], e.b[2], e.mat);
        }
      }
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.STATIC_DRAW);

      const ebo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, ebo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeVerts), gl.STATIC_DRAW);

      return { vbo, vertCount: this.verts.length / 7, ebo, edgeCount: edgeVerts.length / 4 };
    }
  }

  // ---- GLSL ES 3.00 SHADERS ----

  // 0. PROCEDURAL COSMIC NEBULA SKY DOME (STRATUM 3 backdrop — rich astrophysical depth, zero flat black void!)
  const SKY_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aPos;
  out vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.9999, 1.0);
  }`;

  const SKY_FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform float uTheme;       // 0=dark, 1=blueprint, 2=light
  uniform float uTime;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uGalaxyAlpha; // 0.25 (station) .. 1.0 (mix) .. 1.35 (galaxy)
  uniform float uAspect;
  out vec4 fragColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.52;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(3.1, 1.7);
      a *= 0.50;
    }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    // Parallax sky coordinates locked to camera yaw/pitch
    vec2 skyP = p + vec2(uYaw * 0.45, -uPitch * 0.42);

    if (uTheme > 1.5) {
      // Studio Architectural Maquette Cyclorama
      vec3 topC = vec3(0.96, 0.948, 0.920);
      vec3 midC = vec3(0.922, 0.908, 0.875);
      vec3 botC = vec3(0.875, 0.858, 0.822);
      vec3 col = mix(botC, mix(midC, topC, smoothstep(0.35, 0.95, vUv.y)), smoothstep(0.0, 0.65, vUv.y));
      // Faint celestial watercolor wash in upper sky when galaxy layer is active
      float band = exp(-pow((vUv.y - 0.78) * 3.4, 2.0));
      float neb = fbm(skyP * 2.4 + vec2(0.0, uTime * 0.008));
      col = mix(col, vec3(0.84, 0.89, 0.90), band * neb * 0.22 * uGalaxyAlpha);
      fragColor = vec4(col, 1.0);
      return;
    }

    vec3 deepAbyss = uTheme > 0.5 ? vec3(0.024, 0.058, 0.118) : vec3(0.012, 0.019, 0.034);
    vec3 horizonMist = uTheme > 0.5 ? vec3(0.055, 0.128, 0.235) : vec3(0.034, 0.058, 0.098);
    vec3 col = mix(deepAbyss, horizonMist, exp(-pow((vUv.y - 0.46) * 2.4, 2.0)) * 0.85);

    // Sweeping Astronomical Milky-Way / Cosmic Nebula Canopy across upper sky (STRATUM 3!)
    float skyBand = smoothstep(0.28, 0.72, vUv.y) * (1.0 - smoothstep(0.88, 1.15, vUv.y) * 0.35);
    vec2 uvA = skyP * 2.1 + vec2(uTime * 0.006, 0.0);
    float n1 = fbm(uvA);
    float n2 = fbm(uvA * 1.9 + vec2(n1 * 1.4, -n1 * 0.9));
    float ridge = smoothstep(0.36, 0.84, n2);

    vec3 nebBlue = uTheme > 0.5 ? vec3(0.11, 0.28, 0.52) : vec3(0.075, 0.175, 0.315);
    vec3 nebCyan = uTheme > 0.5 ? vec3(0.18, 0.45, 0.68) : vec3(0.105, 0.335, 0.420);
    vec3 nebGold = vec3(0.26, 0.22, 0.15);

    float gBoost = clamp(uGalaxyAlpha, 0.15, 1.45);
    col += nebBlue * (n1 * 0.48) * skyBand * gBoost;
    col += nebCyan * (ridge * 0.36) * skyBand * gBoost;
    col += nebGold * (pow(ridge, 2.5) * 0.18) * skyBand * gBoost * smoothstep(0.0, 0.7, skyP.x + 0.35);

    // Subtle atmospheric horizon glow dividing Ground Abyss & Aerial Station from Cosmic Canopy
    float hor = exp(-pow((vUv.y - 0.52) * 8.5, 2.0));
    col += vec3(0.12, 0.24, 0.34) * hor * 0.16;

    fragColor = vec4(col, 1.0);
  }`;

  // 1. LOWERED REFLECTIVE OBSIDIAN / ALABASTER ABYSS FLOOR (STRATUM 1: 地面 y = -1.35)
  const FLOOR_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  uniform mat4 uViewProj;
  out vec3 vWorldPos;
  void main() {
    vWorldPos = aPos;
    gl_Position = uViewProj * vec4(aPos, 1.0);
  }`;

  const FLOOR_FS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos;
  uniform vec3 uCamPos;
  uniform vec3 uFogColor;
  uniform vec3 uFloorColor;
  uniform vec3 uGridColor;
  uniform vec3 uLightPos[8];
  uniform vec3 uLightCol[8];
  uniform float uLightPow[8];
  uniform float uTheme;
  uniform float uTime;
  uniform float uStationAlpha;
  uniform float uSonarRadius;
  uniform float uSonarAlpha;
  out vec4 fragColor;

  float gridFactor(vec2 coord, float scale, float width) {
    vec2 p = coord / scale;
    vec2 g = abs(fract(p - 0.5) - 0.5) / max(fwidth(p), vec2(0.0005));
    float l = min(g.x, g.y);
    return 1.0 - smoothstep(0.0, width, l);
  }

  void main() {
    vec3 P = vWorldPos;
    vec3 N = vec3(0.0, 1.0, 0.0);
    vec3 V = normalize(uCamPos - P);
    float dist = length(P.xz);

    // Brushed obsidian micro-roughness texture
    float micro = sin(P.x * 3.1 + P.z * 2.3) * cos(P.x * 1.7 - P.z * 3.9) * 0.5 + 0.5;
    vec3 col = uFloorColor * (0.92 + 0.14 * micro);

    // Anti-aliased orbital ground CAD grid (2m major + subtle 0.5m micro)
    float majorG = gridFactor(P.xz, 2.0, 1.15);
    float minorG = gridFactor(P.xz, 0.5, 0.85);
    float gridFade = exp(-dist * 0.072);
    float gridMask = (majorG * 0.68 + minorG * 0.16) * gridFade;
    col = mix(col, uGridColor, gridMask * (uTheme > 1.5 ? 0.30 : 0.28));

    // Concentric Orbital Foundation Trench Rings on the Ground Plane (r = 9.0, r = 11.4, r = 13.8) + slow pulse ring
    float r1 = (1.0 - smoothstep(0.0, 0.07, abs(dist - 9.0))) * 0.44;
    float rMid = (1.0 - smoothstep(0.0, 0.045, abs(dist - 11.4))) * 0.28;
    float r2 = (1.0 - smoothstep(0.0, 0.055, abs(dist - 13.8))) * 0.22;
    float waveR = fract(uTime * 0.065) * 16.0;
    float rWave = (1.0 - smoothstep(0.0, 0.22, abs(dist - waveR))) * sin(fract(uTime * 0.065) * 3.14159) * 0.16;
    // 8 radial celestial formation azimuth lines across the orbital floor
    float ang = atan(P.z, P.x);
    float radTick = pow(abs(cos(ang * 4.0)), 64.0) * smoothstep(2.5, 5.0, dist) * exp(-dist * 0.075) * 0.26;
    col += uGridColor * (r1 + rMid + r2 + rWave + radTick) * (uTheme > 1.5 ? 0.45 : 0.72);
    // Interactive 3D Golden-Jade Sonar Wave (✦ 灵识扫频 — purely visual & musical!)
    if (uSonarAlpha > 0.005) {
      float sRing = 1.0 - smoothstep(0.0, 0.42, abs(dist - uSonarRadius));
      float sTrail = exp(-max(0.0, uSonarRadius - dist) * 0.65) * step(dist, uSonarRadius) * 0.28;
      vec3 sonarCol = uTheme > 1.5 ? vec3(0.14, 0.56, 0.54) : vec3(0.92, 0.80, 0.48);
      col += sonarCol * (sRing * 1.15 + sTrail) * uSonarAlpha;
    }

    // Real-time reflective specular bounce pools from ALL 8 suspended monoliths hovering ABOVE the abyss!
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.8);
    for (int i = 0; i < 8; i++) {
      vec3 lp = uLightPos[i];
      float pw = uLightPow[i];
      if (pw <= 0.001) continue;
      vec3 Lvec = lp - P;
      float d2 = dot(Lvec, Lvec) + 1.1;
      vec3 L = normalize(Lvec);
      float att = pw / (1.0 + d2 * 0.18);
      float diff = max(dot(N, L), 0.0);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), mix(16.0, 44.0, micro));
      if (uTheme > 1.5) {
        float occ = exp(-dot(P.xz - lp.xz, P.xz - lp.xz) * 0.55);
        col *= (1.0 - occ * 0.13);
        col += uLightCol[i] * (diff * att * 0.09);
      } else {
        col += uLightCol[i] * (diff * att * 0.20 + spec * att * (0.36 + 0.55 * fres));
      }
    }

    float camDist = length(uCamPos - P);
    float fog = 1.0 - exp(-pow(max(0.0, camDist - 16.0) * 0.042, 1.8));
    float radialFade = smoothstep(16.0, 34.0, dist);
    float alpha = (1.0 - radialFade) * (1.0 - fog * 0.78) * uStationAlpha;
    col = mix(col, uFogColor, clamp(fog * 0.85, 0.0, 0.92));
    if (alpha < 0.004) discard;
    fragColor = vec4(col, alpha);
  }`;

  // 2. 1→99 CNC-ETCHED IRIDESCENT ARCTIC CRYSTAL / BRUSHED TITANIUM PBR SHADER (Igloo × Active Theory!)
  const PBR_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNorm;
  layout(location=2) in float aMat;
  uniform mat4 uViewProj;
  uniform mat4 uModel;
  out vec3 vWorldPos;
  out vec3 vLocalPos;
  out vec3 vNorm;
  out float vMat;
  void main() {
    vLocalPos = aPos;
    vec4 wp = uModel * vec4(aPos, 1.0);
    vWorldPos = wp.xyz;
    vNorm = normalize(mat3(uModel) * aNorm);
    vMat = aMat;
    gl_Position = uViewProj * wp;
  }`;

  const PBR_FS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos;
  in vec3 vLocalPos;
  in vec3 vNorm;
  in float vMat;
  uniform vec3 uCamPos;
  uniform vec3 uAccent;
  uniform vec3 uFogColor;
  uniform float uActive;
  uniform float uRunning;
  uniform float uTheme;
  uniform float uTime;
  uniform float uStationAlpha;
  uniform float uSonarRadius;
  uniform float uSonarAlpha;
  out vec4 fragColor;

  void main() {
    vec3 N = normalize(vNorm);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(uCamPos - vWorldPos);
    float NoV = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - NoV, 2.8);
    float sharpFresnel = pow(1.0 - NoV, 4.6);

    // 3-Point Arctic Studio Key / Fill / Rim Lighting
    vec3 Lkey = normalize(vec3(-0.56, 0.84, 0.56));
    vec3 Lfill = normalize(vec3(0.78, 0.32, -0.44));
    vec3 Lrim = normalize(vec3(0.05, 0.58, -0.84));
    float diffKey = max(dot(N, Lkey), 0.0);
    float diffFill = max(dot(N, Lfill), 0.0);
    float diffRim = max(dot(N, Lrim), 0.0);
    vec3 Hkey = normalize(Lkey + V);
    vec3 Hrim = normalize(Lrim + V);

    // Procedural CNC micro-panel grooves & subtle brushed metallic sheen (breaks flat plastic polygons!)
    float panelX = smoothstep(0.95, 1.0, abs(sin(vWorldPos.x * 6.5)));
    float panelY = smoothstep(0.95, 1.0, abs(sin(vWorldPos.y * 8.5)));
    float panelZ = smoothstep(0.95, 1.0, abs(sin(vWorldPos.z * 6.5)));
    float seam = clamp((panelX + panelY + panelZ) * 0.35, 0.0, 0.45);
    float brushed = sin(vLocalPos.y * 55.0 + vLocalPos.x * 18.0) * 0.035;

    // Igloo signature iridescent arctic-aurora Fresnel refraction gradient (cyan -> platinum -> faint aurora violet)
    vec3 auroraRim = mix(uAccent, vec3(0.76, 0.88, 1.0), 0.42 + 0.25 * sin(NoV * 5.0 + vWorldPos.y * 1.6));
    auroraRim = mix(auroraRim, vec3(0.62, 0.68, 0.98), clamp(fresnel * 0.35, 0.0, 0.35));

    // Whisper-subtle vertical holographic scan shimmer across crystal faces
    float scanBand = exp(-pow(fract(vWorldPos.y * 0.38 - uTime * 0.16) - 0.5, 2.0) * 90.0) * 0.10;

    float heightAO = mix(0.60, 1.15, clamp((vWorldPos.y + 0.35) * 0.45, 0.0, 1.0));
    float activeLift = 1.0 + uActive * 0.45 + uRunning * 0.16;

    vec3 col;
    float alpha = uStationAlpha;

    if (vMat > 2.5) {
      // Material 3: EMISSIVE INNER QUANTUM CORE (drives crisp selective GPU Bloom!)
      vec3 coreTint = mix(uAccent, vec3(0.94, 0.99, 1.0), 0.50 + 0.26 * NoV);
      float pulse = 0.92 + 0.08 * sin(uTime * 1.9 + vWorldPos.y * 2.8);
      col = coreTint * (1.45 + uActive * 0.80 + uRunning * 0.32) * pulse;
      if (uTheme > 1.5) col = mix(uAccent * 1.05, vec3(1.0), 0.26);
    } else if (vMat > 1.5) {
      // Material 2: CNC-MACHINED BRUSHED TITANIUM TRIM
      vec3 base = (uTheme > 1.5 ? vec3(0.76, 0.75, 0.72) : (uTheme > 0.5 ? vec3(0.24, 0.38, 0.58) : vec3(0.23, 0.30, 0.39))) + brushed;
      base *= (1.0 - seam * 0.18);
      float specKey = pow(max(dot(N, Hkey), 0.0), 64.0);
      float specRim = pow(max(dot(N, Hrim), 0.0), 26.0);
      vec3 keyCol = uTheme > 1.5 ? vec3(1.0, 0.98, 0.94) : vec3(0.86, 0.94, 1.0);
      col = base * (0.28 + 0.74 * diffKey + 0.26 * diffFill) * heightAO;
      col += keyCol * specKey * 1.05;
      col += auroraRim * (specRim * 0.58 + fresnel * 0.62 * activeLift);
    } else if (vMat > 0.5) {
      // Material 1: IGLOO FROSTED ARCTIC CRYSTAL / SMOKED GLASS MONOLITH
      vec3 base = (uTheme > 1.5
        ? vec3(0.92, 0.91, 0.88)
        : (uTheme > 0.5 ? vec3(0.08, 0.20, 0.36) : vec3(0.065, 0.115, 0.185))) + brushed * 0.6;
      float specKey = pow(max(dot(N, Hkey), 0.0), 82.0);
      float specRim = pow(max(dot(N, Hrim), 0.0), 24.0);
      vec3 skyRefl = uTheme > 1.5 ? vec3(0.98, 0.97, 0.95) : vec3(0.52, 0.76, 0.96);
      col = base * (0.34 + 0.68 * diffKey + 0.34 * diffFill) * heightAO;
      float innerScatter = pow(max(0.0, 1.0 - abs(N.y)), 1.5) * (0.16 + uActive * 0.20 + uRunning * 0.08);
      col += uAccent * (innerScatter + (uTheme > 1.5 ? 0.0 : scanBand));
      col += skyRefl * specKey * (uTheme > 1.5 ? 0.55 : 1.25);
      col += auroraRim * (specRim * 0.48 + fresnel * (uTheme > 1.5 ? 0.28 : 0.82) * activeLift);
      col += vec3(0.96, 0.99, 1.0) * sharpFresnel * (uTheme > 1.5 ? 0.20 : 0.68);
      alpha *= (uTheme > 1.5 ? 0.94 : 0.88);
    } else {
      // Material 0: CNC-ETCHED MATTE OBSIDIAN / ARCHITECTURAL HULL DECK
      vec3 base = (uTheme > 1.5
        ? vec3(0.86, 0.84, 0.79)
        : (uTheme > 0.5 ? vec3(0.06, 0.14, 0.26) : vec3(0.058, 0.082, 0.118))) * (1.0 - seam * 0.22);
      float specKey = pow(max(dot(N, Hkey), 0.0), 26.0);
      col = base * (0.38 + 0.66 * diffKey + 0.25 * diffFill + 0.14 * diffRim) * heightAO;
      col += vec3(0.78, 0.88, 1.0) * specKey * (uTheme > 1.5 ? 0.18 : 0.36);
      col += auroraRim * fresnel * (0.18 + uActive * 0.34);
    }

    float camDist = length(uCamPos - vWorldPos);
    float fog = 1.0 - exp(-pow(max(0.0, camDist - 18.0) * 0.032, 1.8));
    col = mix(col, uFogColor, clamp(fog * 0.68, 0.0, 0.75));
    if (alpha < 0.01) discard;
    fragColor = vec4(col, alpha);
  }`;

  const EDGE_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in float aMat;
  uniform mat4 uViewProj;
  uniform mat4 uModel;
  out float vMat;
  out vec3 vWorldPos;
  void main() {
    vec4 wp = uModel * vec4(aPos, 1.0);
    vWorldPos = wp.xyz;
    vMat = aMat;
    vec4 clip = uViewProj * wp;
    clip.z -= 0.0018 * clip.w;
    gl_Position = clip;
  }`;

  const EDGE_FS = `#version 300 es
  precision highp float;
  in float vMat;
  in vec3 vWorldPos;
  uniform vec3 uAccent;
  uniform vec3 uCamPos;
  uniform float uAlpha;
  uniform float uActive;
  uniform float uTheme;
  out vec4 fragColor;
  void main() {
    vec3 silver = uTheme > 1.5 ? vec3(0.24, 0.30, 0.38) : vec3(0.76, 0.88, 0.98);
    vec3 col = vMat > 0.5 ? mix(silver, uAccent, 0.52 + uActive * 0.35) : mix(silver, uAccent, 0.28 + uActive * 0.42);
    if (vMat > 2.5) col = mix(uAccent, vec3(1.0), 0.62);
    float camDist = length(uCamPos - vWorldPos);
    float fade = clamp(1.18 - camDist * 0.020, 0.25, 1.0);
    float a = uAlpha * (vMat > 0.5 ? 1.0 : 0.62) * (1.0 + uActive * 0.65) * fade;
    fragColor = vec4(col, clamp(a, 0.0, 0.95));
  }`;

  const VOL_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNorm;
  uniform mat4 uViewProj;
  uniform mat4 uModel;
  out vec3 vWorldPos;
  out vec3 vNorm;
  out float vLocalY;
  void main() {
    vLocalY = aPos.y;
    vec4 wp = uModel * vec4(aPos, 1.0);
    vWorldPos = wp.xyz;
    vNorm = normalize(mat3(uModel) * aNorm);
    gl_Position = uViewProj * wp;
  }`;

  const VOL_FS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos;
  in vec3 vNorm;
  in float vLocalY;
  uniform vec3 uCamPos;
  uniform vec3 uAccent;
  uniform float uStrength;
  out vec4 fragColor;
  void main() {
    vec3 V = normalize(uCamPos - vWorldPos);
    float edge = pow(abs(dot(normalize(vNorm), V)), 1.9);
    float vFade = smoothstep(0.0, 0.15, vLocalY) * pow(max(0.0, 1.0 - vLocalY), 1.55);
    float a = edge * vFade * uStrength;
    if (a < 0.002) discard;
    fragColor = vec4(uAccent * (0.95 + 0.35 * edge), a);
  }`;

  const STAR_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aCol;
  layout(location=2) in float aSize;
  layout(location=3) in float aAlpha;
  uniform mat4 uViewProj;
  uniform float uDpr;
  uniform float uAlphaMul;
  out vec3 vCol;
  out float vAlpha;
  out float vKind;
  void main() {
    vec4 clip = uViewProj * vec4(aPos, 1.0);
    gl_Position = clip;
    float pSize = aSize * uDpr * clamp(32.0 / max(10.0, clip.w), 0.78, 2.45);
    gl_PointSize = pSize;
    vCol = aCol;
    vAlpha = aAlpha * uAlphaMul;
    // 0 = Lean verified jewel star, 1 = gentle silk nebula cloud, 2 = warm settled conjecture lantern star!
    vKind = aSize > 18.0 ? 1.0 : (aSize >= 8.0 ? 2.0 : 0.0);
  }`;

  const STAR_FS = `#version 300 es
  precision highp float;
  in vec3 vCol;
  in float vAlpha;
  in float vKind;
  out vec4 fragColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    if (vKind > 0.5 && vKind < 1.5) {
      // Ultra-gentle, velvety JWST silk nebula veil (soft pastel mist, zero harsh edges!)
      float silk = pow(max(0.0, 1.0 - r * r), 2.15);
      fragColor = vec4(vCol, silk * vAlpha);
    } else if (vKind > 1.5) {
      // Gentle warm Conjecture Lantern Star with delicate 4-point astronomical diffraction halo
      float core = exp(-r * r * 11.0);
      float glow = pow(max(0.0, 1.0 - r), 2.3) * 0.42;
      float rayX = exp(-abs(d.y) * 26.0) * exp(-abs(d.x) * 4.8) * 0.46;
      float rayY = exp(-abs(d.x) * 26.0) * exp(-abs(d.y) * 4.8) * 0.46;
      float lum = clamp(core + glow + rayX + rayY, 0.0, 1.0);
      fragColor = vec4(mix(vCol, vec3(1.0, 0.98, 0.92), core * 0.65), lum * vAlpha);
    } else {
      // Soft pearlescent Lean verified theorem star
      float core = exp(-r * r * 6.8);
      float halo = exp(-r * r * 2.1) * 0.34;
      fragColor = vec4(mix(vCol, vec3(0.96, 0.99, 1.0), core * 0.38), (core + halo) * vAlpha);
    }
  }`;

  const DAG_LINE_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aCol;
  layout(location=2) in float aAlpha;
  uniform mat4 uViewProj;
  uniform mat4 uModel;
  uniform float uAlphaMul;
  out vec3 vCol;
  out float vAlpha;
  void main() {
    gl_Position = uViewProj * uModel * vec4(aPos, 1.0);
    vCol = aCol;
    vAlpha = aAlpha * uAlphaMul;
  }`;

  const DAG_LINE_FS = `#version 300 es
  precision highp float;
  in vec3 vCol;
  in float vAlpha;
  out vec4 fragColor;
  void main() {
    if (vAlpha < 0.005) discard;
    fragColor = vec4(vCol, clamp(vAlpha, 0.0, 0.85));
  }`;

  // GPU-Animated Ascending Ethereal Qi / Starlight Motes (修仙灵气螺旋上升星尘!)
  const QI_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec4 aOrb;   // (radius, baseAngle, phase, speed)
  layout(location=1) in vec3 aCol;
  layout(location=2) in vec2 aStyle; // (size, alpha)
  uniform mat4 uViewProj;
  uniform float uTime;
  uniform float uDpr;
  uniform float uAlphaMul;
  out vec3 vCol;
  out float vAlpha;
  out float vKind;
  void main() {
    float u = fract(aOrb.z + uTime * aOrb.w);
    float wy = -1.1 + u * 7.6; // gently rises from reflective ground abyss (-1.1) up to Akasha crown (+6.5)!
    float ang = aOrb.y + u * 1.45 + uTime * 0.055;
    // Slight inward taper as ethereal qi gathers toward the Akasha Eye crown
    float rad = aOrb.x * (1.04 - u * 0.14);
    vec3 wp = vec3(sin(ang) * rad, wy, -cos(ang) * rad - 0.55);
    vec4 clip = uViewProj * vec4(wp, 1.0);
    gl_Position = clip;
    gl_PointSize = aStyle.x * uDpr * clamp(30.0 / max(10.0, clip.w), 0.75, 2.2);
    float env = smoothstep(0.0, 0.16, u) * smoothstep(1.0, 0.78, u);
    vCol = aCol;
    vAlpha = aStyle.y * env * uAlphaMul;
    vKind = 0.0;
  }`;

  const QUAD_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aPos;
  out vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

  const BRIGHT_FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uTex;
  uniform float uThreshold;
  out vec4 fragColor;
  void main() {
    vec3 c = texture(uTex, vUv).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float soft = smoothstep(uThreshold, uThreshold + 0.42, lum);
    fragColor = vec4(c * soft, 1.0);
  }`;

  const BLUR_FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uDir;
  out vec4 fragColor;
  void main() {
    vec3 sum = texture(uTex, vUv).rgb * 0.227027;
    sum += texture(uTex, vUv + uDir * 1.384615).rgb * 0.316216;
    sum += texture(uTex, vUv - uDir * 1.384615).rgb * 0.316216;
    sum += texture(uTex, vUv + uDir * 3.230769).rgb * 0.070270;
    sum += texture(uTex, vUv - uDir * 3.230769).rgb * 0.070270;
    fragColor = vec4(sum, 1.0);
  }`;

  const COMPOSITE_FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uBloom;
  uniform float uTheme;
  uniform float uTime;
  uniform float uBloomStrength;
  out vec4 fragColor;

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  void main() {
    vec2 centered = vUv - 0.5;
    float r2 = dot(centered, centered);
    float ca = (uTheme > 1.5 ? 0.0004 : 0.0012) * r2;
    vec3 scene;
    scene.r = texture(uScene, vUv + centered * ca).r;
    scene.g = texture(uScene, vUv).g;
    scene.b = texture(uScene, vUv - centered * ca).b;

    vec3 bloom = texture(uBloom, vUv).rgb;
    vec3 col = scene + bloom * uBloomStrength;

    if (uTheme < 1.5) {
      col = aces(col * 1.08);
      float vig = 1.0 - r2 * 0.54;
      col *= clamp(vig, 0.58, 1.0);
    } else {
      col = clamp(col, 0.0, 1.0);
      float vig = 1.0 - r2 * 0.12;
      col *= clamp(vig, 0.88, 1.0);
    }
    float grain = (hash12(gl_FragCoord.xy + fract(uTime * 11.3)) - 0.5) * (uTheme > 1.5 ? 0.011 : 0.019);
    col = clamp(col + grain, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
  }`;

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile error: ${err}`);
    }
    return sh;
  }

  function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    const s1 = compileShader(gl, gl.VERTEX_SHADER, vs);
    const s2 = compileShader(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, s1);
    gl.attachShader(p, s2);
    gl.linkProgram(p);
    gl.deleteShader(s1);
    gl.deleteShader(s2);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(p)}`);
    }
    const locs = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      if (!info) continue;
      locs[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
    }
    return { p, u: locs };
  }

  function createFBO(gl, w, h, withDepth, useFloat) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, useFloat ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let rbo = null;
    if (withDepth) {
      rbo = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbo);
    }
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, rbo, w, h, ok };
  }

  function destroyFBO(gl, obj) {
    if (!obj) return;
    if (obj.fbo) gl.deleteFramebuffer(obj.fbo);
    if (obj.tex) gl.deleteTexture(obj.tex);
    if (obj.rbo) gl.deleteRenderbuffer(obj.rbo);
  }

  // ---- Build Suspended Floating Orbital Space Station + 8 Sculptural 3D Monoliths ----
  function buildWorldGeometries(gl) {
    const g = {};

    // SUSPENDED FLOATING ORBITAL STATION HULL (y = 0.0, floating 1.35m ABOVE the abyss floor!)
    const campus = new MeshBuilder();
    // 2 Main Sovereign Floating Wing Decks + 2 Compact Cantilevered South-Ring Embedded Branch Pods!
    campus.addChamferedTerrace(-5.65, -0.50, 2.02, 3.78, 0.42, 0.0, 0.11, 0, 0.44);
    campus.addChamferedTerrace( 5.65, -0.50, 2.02, 3.78, 0.42, 0.0, 0.11, 0, 0.44);
    campus.addChamferedTerrace(-4.25,  5.20, 1.50, 0.96, 0.32, 0.0, 0.10, 0, 0.30);
    campus.addChamferedTerrace( 4.25,  5.20, 1.50, 0.96, 0.32, 0.0, 0.10, 0, 0.30);
    // Angled radial structural gusset struts physically bolting both independent branch pods directly into the outer titanium orbital ring!
    const angRev = Math.atan2(4.85, -4.25);
    const angStu = Math.atan2(4.85,  4.25);
    campus.addBox(-5.24, 0.02, 6.33, 2.10, 0.08, 0.36, 2, angRev);
    campus.addBox( 5.24, 0.02, 6.33, 2.10, 0.08, 0.36, 2, angStu);

    // Suspended Central Verification Octagonal Deck + Deep Tapered Reactor Keel Underneath!
    campus.addPrism(0, 0.0, -0.45, 1.82, 1.66, 0.16, 8, 0, Math.PI / 8);
    campus.addPrism(0, 0.16, -0.45, 1.50, 1.44, 0.10, 8, 2, Math.PI / 8);
    campus.addPrism(0, -0.68, -0.45, 0.48, 1.62, 0.68, 8, 0, Math.PI / 8); // heavy floating underside hull keel!
    campus.addPrism(0, -0.82, -0.45, 0.24, 0.46, 0.14, 8, 3, Math.PI / 8); // glowing underside gravity-core ring!

    // Twin Extruded Structural Bridge Spans joining Wings <-> Central Verification Core
    campus.addBox(-2.58, 0.14, -0.45, 2.25, 0.08, 0.72, 0);
    campus.addBox( 2.58, 0.14, -0.45, 2.25, 0.08, 0.72, 0);
    campus.addBox(-2.58, 0.21, -0.82, 2.25, 0.04, 0.05, 2);
    campus.addBox(-2.58, 0.21, -0.08, 2.25, 0.04, 0.05, 2);
    campus.addBox( 2.58, 0.21, -0.82, 2.25, 0.04, 0.05, 2);
    campus.addBox( 2.58, 0.21, -0.08, 2.25, 0.04, 0.05, 2);

    // Sleek Brushed-Titanium Outer Orbital Station Structural Ring (unites all decks as one floating Space Station!)
    campus.addTorusRing(0, -0.04, 0.35, 8.95, 0.055, 64, 6, 0, 0, 2);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      campus.addBox(Math.cos(a) * 8.95, -0.04, 0.35 + Math.sin(a) * 8.95, 0.26, 0.14, 0.26, 2, -a);
    }
    g.campus = campus.build(gl, 20);

    // BRANCH A (02 独立评审 · 红队审计支路): Independent inner violet sliding busbar (z = 3.08, x = -5.40..+3.60)
    // Physically isolated from Studio's feeder at x = +4.25 (zero crossing!)
    const revRail = new MeshBuilder();
    revRail.addBox(-0.90, 0.07, 3.08, 9.0, 0.045, 0.12, 2);
    revRail.addBox(-0.90, 0.11, 3.08, 8.8, 0.024, 0.042, 3);
    revRail.addBox(-4.25, 0.06, 3.66, 0.24, 0.05, 1.24, 0);
    revRail.addBox(-4.25, 0.10, 3.66, 0.045, 0.022, 1.18, 3);
    revRail.addBox(-5.45, 0.11, 3.08, 0.18, 0.14, 0.24, 2);
    revRail.addBox( 3.65, 0.11, 3.08, 0.18, 0.14, 0.24, 2);
    g.revRail = revRail.build(gl, 20);

    // BRANCH B (06 工具与表达 · 工具基建支路): Independent outer ice-cyan sliding busbar (z = 3.88, x = -3.60..+5.40)
    // Physically isolated from Review's feeder at x = -4.25 (zero crossing!)
    const stuRail = new MeshBuilder();
    stuRail.addBox( 0.90, 0.07, 3.88, 9.0, 0.045, 0.12, 2);
    stuRail.addBox( 0.90, 0.11, 3.88, 8.8, 0.024, 0.042, 3);
    stuRail.addBox( 4.25, 0.06, 4.08, 0.24, 0.05, 0.44, 0);
    stuRail.addBox( 4.25, 0.10, 4.08, 0.045, 0.022, 0.40, 3);
    stuRail.addBox(-3.65, 0.11, 3.88, 0.18, 0.14, 0.24, 2);
    stuRail.addBox( 5.45, 0.11, 3.88, 0.18, 0.14, 0.24, 2);
    g.stuRail = stuRail.build(gl, 20);

    // Dynamic 3D Sliding Rheostat Wiper Contact (instanced independently on Branch A & Branch B rails!)
    const wiper = new MeshBuilder();
    wiper.addBox(0, 0.14, 0, 0.50, 0.11, 0.30, 2);
    wiper.addOctahedron(0, 0.27, 0, 0.15, 0.17, 0.15, 3);
    g.wiper = wiper.build(gl, 18);

    // Pedestal Hex Plinth
    const plinth = new MeshBuilder();
    plinth.addPrism(0, 0.0, 0, 0.92, 0.80, 0.10, 6, 0, Math.PI / 6);
    plinth.addPrism(0, 0.10, 0, 0.70, 0.66, 0.06, 6, 2, Math.PI / 6);
    g.plinth = plinth.build(gl, 20);

    // 00 // VERIFICATION — Stepped Crystalline Octagonal Spire + Inner Core + Twin Containment Rings
    const verBase = new MeshBuilder();
    verBase.addPrism(0, 0.0, 0, 0.76, 0.62, 0.46, 8, 1, Math.PI / 8);
    verBase.addPrism(0, 0.50, 0, 0.58, 0.44, 0.52, 8, 1, Math.PI / 8);
    verBase.addPrism(0, 1.06, 0, 0.40, 0.02, 0.64, 8, 1, Math.PI / 8);
    verBase.addPrism(0, 0.12, 0, 0.24, 0.18, 1.20, 6, 3, 0);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      verBase.addBox(Math.cos(a) * 0.72, 0.56, Math.sin(a) * 0.72, 0.07, 1.08, 0.22, 2, -a);
    }
    g.verification = verBase.build(gl, 18);

    const verRing = new MeshBuilder();
    verRing.addTorusRing(0, 0, 0, 1.04, 0.032, 32, 6, 0.36, 0.15, 2);
    verRing.addTorusRing(0, 0, 0, 0.86, 0.022, 28, 6, -0.44, -0.22, 1);
    g.verRing = verRing.build(gl, 28);

    // 01 // RESEARCH — Igloo Fractured Floating Crystal Icosahedron Monolith
    const resCore = new MeshBuilder();
    resCore.addOctahedron(0, 0, 0, 0.28, 0.36, 0.28, 3);
    g.resCore = resCore.build(gl, 15);
    const resShell = new MeshBuilder();
    resShell.addIcosahedron(0, 0, 0, 0.68, 1, 0.09);
    g.resShell = resShell.build(gl, 18);

    // 02 // REVIEW — Twin Counter-Poised Brutalist Obsidian-Glass Monolith Slabs
    const revBase = new MeshBuilder();
    revBase.addBox(0, 0.58, 0, 0.08, 1.06, 0.08, 2);
    revBase.addOctahedron(0, 1.24, 0, 0.14, 0.20, 0.14, 3);
    g.revBase = revBase.build(gl, 18);
    const revSlab = new MeshBuilder();
    revSlab.addBox(0, 0, 0, 0.44, 0.86, 0.18, 1, 0.22);
    revSlab.addBox(0, 0.46, 0, 0.46, 0.04, 0.20, 2, 0.22);
    g.revSlab = revSlab.build(gl, 18);

    // 03 // BOOKS — Stratified Floating Glass Archive Monolith
    const bookSlab = new MeshBuilder();
    bookSlab.addChamferedTerrace(0, 0, 0.66, 0.46, 0.14, -0.04, 0.04, 1);
    g.bookSlab = bookSlab.build(gl, 20);
    const bookCore = new MeshBuilder();
    bookCore.addBox(0, 0.60, 0, 0.14, 0.96, 0.14, 3, Math.PI / 4);
    g.bookCore = bookCore.build(gl, 18);

    // 04 // PUBLICATION — Tri-Obelisk Stepped Crystalline Monolith Cluster
    const pub = new MeshBuilder();
    pub.addPrism(0.0, 0.0, 0.0, 0.34, 0.22, 1.28, 6, 1, 0);
    pub.addPrism(0.0, 1.28, 0.0, 0.22, 0.02, 0.28, 6, 3, 0);
    pub.addPrism(-0.46, 0.0, 0.22, 0.24, 0.16, 0.86, 6, 1, Math.PI / 6);
    pub.addPrism(-0.46, 0.86, 0.22, 0.16, 0.02, 0.18, 6, 2, Math.PI / 6);
    pub.addPrism(0.44, 0.0, -0.18, 0.26, 0.18, 1.02, 6, 1, Math.PI / 6);
    pub.addPrism(0.44, 1.02, -0.18, 0.18, 0.02, 0.22, 6, 2, Math.PI / 6);
    g.publication = pub.build(gl, 18);

    // 05 // OUTREACH — Sculpted Faceted Deep-Space Parabolic Dish Monolith
    const outBase = new MeshBuilder();
    outBase.addPrism(0, 0.0, 0, 0.42, 0.26, 0.56, 6, 0, Math.PI / 6);
    g.outBase = outBase.build(gl, 18);
    const outDish = new MeshBuilder();
    outDish.addParabolicDish(0, 0, 0, 0.72, 0.34, 12, 3, -0.34, 1);
    outDish.addPrism(0, 0.02, -0.02, 0.05, 0.02, 0.56, 6, 2, 0);
    outDish.addOctahedron(0, 0.62, -0.18, 0.10, 0.12, 0.10, 3);
    g.outDish = outDish.build(gl, 24);

    // 06 // STUDIO — Nested Brutalist Precision Foundry Cube Monolith
    const stuOuter = new MeshBuilder();
    const s = 0.44, t = 0.065;
    for (const a of [-s, s]) {
      for (const b of [-s, s]) {
        stuOuter.addBox(a, b, 0, t, t, s * 2 + t, 2);
        stuOuter.addBox(a, 0, b, t, s * 2 + t, t, 2);
        stuOuter.addBox(0, a, b, s * 2 + t, t, t, 2);
      }
    }
    g.stuOuter = stuOuter.build(gl, 20);
    const stuInner = new MeshBuilder();
    stuInner.addBox(0, 0, 0, 0.48, 0.48, 0.48, 1);
    stuInner.addOctahedron(0, 0, 0, 0.24, 0.24, 0.24, 3);
    g.stuInner = stuInner.build(gl, 18);

    // A0 // DIRECTION (AKASHA EYE / 阿卡西之眼) — Levitating Sacred Diamond Core + Triple Celestial Astrolabe Rings
    const dirCore = new MeshBuilder();
    dirCore.addOctahedron(0, 0, 0, 0.58, 0.82, 0.58, 1, Math.PI / 4);
    dirCore.addOctahedron(0, 0, 0, 0.30, 0.32, 0.30, 3, 0);
    g.dirCore = dirCore.build(gl, 16);
    const dirRing = new MeshBuilder();
    dirRing.addTorusRing(0, 0, 0, 1.32, 0.022, 48, 6, 0.14, -0.10, 2);
    dirRing.addTorusRing(0, 0, 0, 1.06, 0.036, 36, 6, 0.36, 0.20, 2);
    dirRing.addTorusRing(0, 0, 0, 0.80, 0.024, 32, 6, -0.58, -0.35, 2);
    g.dirRing = dirRing.build(gl, 28);

    // 3D Sacred Celestial Meridian Rings & Ascending Double-Helix Qi Ribbons (周天星轨阵环 — between Ground & Akasha Eye!)
    const ringVerts = [];
    const addCelestialCircle = (yCenter, rad, tiltX, tiltZ, segs, col, alpha, ticks = 24) => {
      const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
      const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
      const pt = (a, r) => {
        let x = Math.sin(a) * r, y = 0, z = -Math.cos(a) * r;
        const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
        const x2 = x * cz - y1 * sz, y2 = x * sz + y1 * cz;
        return [x2, y2 + yCenter, z1 - 0.55];
      };
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        // Gently soften the immediate front camera window so the foreground Space Station stays crystal-clear
        const frontFade = 0.28 + 0.72 * (1.0 - Math.max(0, Math.cos(a0 - Math.PI)) * 0.75);
        const p0 = pt(a0, rad), p1 = pt(a1, rad);
        ringVerts.push(
          p0[0], p0[1], p0[2], col[0], col[1], col[2], alpha * frontFade,
          p1[0], p1[1], p1[2], col[0], col[1], col[2], alpha * frontFade
        );
      }
      for (let k = 0; k < ticks; k++) {
        const a = (k / ticks) * Math.PI * 2;
        const frontFade = 0.25 + 0.75 * (1.0 - Math.max(0, Math.cos(a - Math.PI)) * 0.75);
        const pIn = pt(a, rad - (k % 3 === 0 ? 0.34 : 0.16));
        const pOut = pt(a, rad + (k % 3 === 0 ? 0.26 : 0.12));
        ringVerts.push(
          pIn[0], pIn[1], pIn[2], col[0], col[1], col[2], alpha * 1.45 * frontFade,
          pOut[0], pOut[1], pOut[2], col[0], col[1], col[2], alpha * 1.45 * frontFade
        );
      }
    };
    addCelestialCircle(1.25, 10.35,  0.04,  0.02, 128, [0.56, 0.86, 0.90], 0.14, 24);
    addCelestialCircle(2.50, 10.95, -0.05, -0.03, 128, [0.68, 0.86, 0.96], 0.13, 24);
    addCelestialCircle(3.75, 10.55,  0.03, -0.02, 128, [0.92, 0.84, 0.66], 0.16, 18);
    // Twin ultra-gentle ascending 3D helical silk ribbons sweeping from Ground -> Celestial Orbit below Akasha Eye
    for (let strand = 0; strand < 2; strand++) {
      const hSegs = 80;
      const offset = strand * Math.PI;
      const hCol = strand === 0 ? [0.56, 0.88, 0.90] : [0.92, 0.83, 0.64];
      for (let i = 0; i < hSegs; i++) {
        const u0 = i / hSegs, u1 = (i + 1) / hSegs;
        const a0 = -2.25 + u0 * 4.5 + offset * 0.18;
        const a1 = -2.25 + u1 * 4.5 + offset * 0.18;
        const r0 = 10.9 - u0 * 0.50 + Math.sin(u0 * Math.PI * 2) * 0.30;
        const r1 = 10.9 - u1 * 0.50 + Math.sin(u1 * Math.PI * 2) * 0.30;
        const y0 = 0.40 + u0 * 3.65;
        const y1 = 0.40 + u1 * 3.65;
        const env = Math.sin(u0 * Math.PI) * 0.14;
        ringVerts.push(
          Math.sin(a0) * r0, y0, -Math.cos(a0) * r0 - 0.55, hCol[0], hCol[1], hCol[2], env,
          Math.sin(a1) * r1, y1, -Math.cos(a1) * r1 - 0.55, hCol[0], hCol[1], hCol[2], env
        );
      }
    }
    const celestialRingVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, celestialRingVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ringVerts), gl.STATIC_DRAW);
    g.celestialRings = { vbo: celestialRingVbo, count: ringVerts.length / 7 };

    // GPU-Animated Ascending Ethereal Qi Motes (168 golden-jade & starlight particles spiralling upward!)
    const qiVerts = [];
    let qSeed = 4219;
    const qRand = () => { qSeed = (qSeed * 16807) % 2147483647; return (qSeed - 1) / 2147483646; };
    for (let i = 0; i < 168; i++) {
      const inner = i < 36;
      const rad = inner ? (1.1 + qRand() * 2.2) : (8.8 + qRand() * 3.2);
      const baseAng = qRand() * Math.PI * 2;
      const phase = qRand();
      const speed = (inner ? 0.048 : 0.026) + qRand() * 0.024;
      const gold = i % 3 === 0;
      const col = gold ? [0.92, 0.82, 0.56] : [0.54, 0.88, 0.94];
      const sz = inner ? (2.1 + qRand() * 1.4) : (1.8 + qRand() * 2.0);
      const al = inner ? (0.36 + qRand() * 0.24) : (0.28 + qRand() * 0.34);
      qiVerts.push(rad, baseAng, phase, speed, col[0], col[1], col[2], sz, al);
    }
    const qiVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qiVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(qiVerts), gl.STATIC_DRAW);
    g.qi = { vbo: qiVbo, count: qiVerts.length / 9 };

    // Volumetric Light Cylinder (open cylinder height 0..1, radius 1)
    const volVerts = [];
    const segs = 24;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      volVerts.push(
        c0, 0, s0, c0, 0, s0,  c1, 0, s1, c1, 0, s1,  c1, 1, s1, c1, 0, s1,
        c0, 0, s0, c0, 0, s0,  c1, 1, s1, c1, 0, s1,  c0, 1, s0, c0, 0, s0
      );
    }
    const volVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, volVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(volVerts), gl.STATIC_DRAW);
    g.vol = { vbo: volVbo, count: volVerts.length / 6 };

    // Volumetric Global Surveillance Cone (radiates DOWNWARD from Supreme Akasha Eye over all galaxies & station!)
    const coneVerts = [];
    const cSegs = 32;
    const topR = 0.16, botR = 1.0;
    for (let i = 0; i < cSegs; i++) {
      const a0 = (i / cSegs) * Math.PI * 2;
      const a1 = ((i + 1) / cSegs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      coneVerts.push(
        c0 * botR, 0, s0 * botR, c0, 0.25, s0,  c1 * botR, 0, s1 * botR, c1, 0.25, s1,  c1 * topR, 1, s1 * topR, c1, 0.25, s1,
        c0 * botR, 0, s0 * botR, c0, 0.25, s0,  c1 * topR, 1, s1 * topR, c1, 0.25, s1,  c0 * topR, 1, s0 * topR, c0, 0.25, s0
      );
    }
    const coneVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coneVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coneVerts), gl.STATIC_DRAW);
    g.cone = { vbo: coneVbo, count: coneVerts.length / 6 };

    // Lowered Infinite Reflective Abyss Floor Quad (STRATUM 1: y = -1.35!)
    const fl = 48;
    const fy = -1.35;
    const floorVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -fl, fy, -fl,  fl, fy, -fl,  fl, fy,  fl,
      -fl, fy, -fl,  fl, fy,  fl, -fl, fy,  fl
    ]), gl.STATIC_DRAW);
    g.floor = { vbo: floorVbo, count: 6 };

    // Full-screen Post Quad
    const quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    g.quad = { vbo: quadVbo, count: 6 };

    // Dynamic 3D Truth DAG GPU buffers (Stars, Nebula Clouds, Constellation Edges)
    g.starVbo = gl.createBuffer();
    g.starCount = 0;
    g.nebulaVbo = gl.createBuffer();
    g.nebulaCount = 0;
    g.dagEdgeVbo = gl.createBuffer();
    g.dagEdgeCount = 0;

    return g;
  }

  class TrureGL {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
      if (!gl) throw new Error('WebGL2 unavailable');
      this.gl = gl;
      this.hasFloat = Boolean(gl.getExtension('EXT_color_buffer_float'));

      this.skyProg = createProgram(gl, SKY_VS, SKY_FS);
      this.floorProg = createProgram(gl, FLOOR_VS, FLOOR_FS);
      this.pbrProg = createProgram(gl, PBR_VS, PBR_FS);
      this.edgeProg = createProgram(gl, EDGE_VS, EDGE_FS);
      this.volProg = createProgram(gl, VOL_VS, VOL_FS);
      this.starProg = createProgram(gl, STAR_VS, STAR_FS);
      this.qiProg = createProgram(gl, QI_VS, STAR_FS);
      this.dagLineProg = createProgram(gl, DAG_LINE_VS, DAG_LINE_FS);
      this.brightProg = createProgram(gl, QUAD_VS, BRIGHT_FS);
      this.blurProg = createProgram(gl, QUAD_VS, BLUR_FS);
      this.compProg = createProgram(gl, QUAD_VS, COMPOSITE_FS);

      this.geo = buildWorldGeometries(gl);
      this.projMat = M4.create();
      this.viewMat = M4.create();
      this.viewProj = M4.create();
      this.modelMat = M4.create();
      this.identityMat = M4.identity(M4.create());
      this.camPos = [0, 10, 22];
      this.fovY = (37 * Math.PI) / 180;
      this.cssW = 1280;
      this.cssH = 720;
      this.dpr = 1;
      this.yaw = 0;
      this.pitch = 0.4;

      this.sceneFBO = null;
      this.bloomA = null;
      this.bloomB = null;
      this.fboW = 0;
      this.fboH = 0;
      this.starHash = '';
      this.clusterCenters = new Map();
      this.skyClusters = []; // cached 3D celestial ring positions of Truth DAG clusters
    }

    ensureSize(cssW, cssH, dpr) {
      this.cssW = Math.max(1, cssW);
      this.cssH = Math.max(1, cssH);
      this.dpr = Math.min(2, dpr || 1);
      const pw = Math.round(this.cssW * this.dpr);
      const ph = Math.round(this.cssH * this.dpr);
      if (this.canvas.width !== pw || this.canvas.height !== ph) {
        this.canvas.width = pw;
        this.canvas.height = ph;
      }
      if (this.fboW !== pw || this.fboH !== ph) {
        const gl = this.gl;
        destroyFBO(gl, this.sceneFBO);
        destroyFBO(gl, this.bloomA);
        destroyFBO(gl, this.bloomB);
        const bw = Math.max(2, Math.floor(pw * 0.5));
        const bh = Math.max(2, Math.floor(ph * 0.5));
        this.sceneFBO = createFBO(gl, pw, ph, true, this.hasFloat);
        if (!this.sceneFBO.ok) {
          destroyFBO(gl, this.sceneFBO);
          this.hasFloat = false;
          this.sceneFBO = createFBO(gl, pw, ph, true, false);
        }
        this.bloomA = createFBO(gl, bw, bh, false, this.hasFloat);
        this.bloomB = createFBO(gl, bw, bh, false, this.hasFloat);
        this.fboW = pw;
        this.fboH = ph;
      }
    }

    // ndcShiftX shifts optical center cleanly leftward when right-side HUD console is open!
    setCamera(yaw, pitch, dist, targetX, targetY, targetZ, ndcShiftX = 0) {
      this.yaw = yaw;
      this.pitch = pitch;
      const aspect = this.cssW / this.cssH;
      this.fovY = (aspect < 1.2 ? 44 : 38.0) * (Math.PI / 180);
      M4.perspective(this.projMat, this.fovY, aspect, 0.35, 160.0, ndcShiftX);

      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      this.camPos[0] = targetX + dist * cp * sy;
      this.camPos[1] = targetY + dist * sp;
      this.camPos[2] = targetZ + dist * cp * cy;

      M4.lookAt(this.viewMat, this.camPos, [targetX, targetY, targetZ], [0, 1, 0]);
      M4.mul(this.viewProj, this.projMat, this.viewMat);
    }

    project(wx, wy, wz) {
      const m = this.viewProj;
      const cx = m[0] * wx + m[4] * wy + m[8]  * wz + m[12];
      const cy = m[1] * wx + m[5] * wy + m[9]  * wz + m[13];
      const cw = m[3] * wx + m[7] * wy + m[11] * wz + m[15];
      if (cw <= 0.25) return null;
      const ndcX = cx / cw;
      const ndcY = cy / cw;
      const focal = (this.cssH * 0.5) / Math.tan(this.fovY * 0.5);
      return {
        x: (ndcX * 0.5 + 0.5) * this.cssW,
        y: (0.5 - ndcY * 0.5) * this.cssH,
        z: cw,
        s: focal / cw
      };
    }

    mapSkyPoint(nx, ny, nz, cid = null) {
      return mapStarToCelestialRing(nx, ny, nz, cid, this.clusterCenters);
    }

    // Upload real 1,160 Lean Truth DAG stars, gentle 5-layer silk nebula clouds, gossamer filaments,
    // AND warm settled Conjecture Lantern Stars — ONE unified, gentle celestial cosmos!
    syncTruthDag(stars, edges, clusters, nebPalette, recentByCluster, isLight, settledConjectures = []) {
      const conjKey = settledConjectures ? settledConjectures.length : 0;
      const key = `${stars?.length || 0}:${edges?.length || 0}:${recentByCluster?.size || 0}:${conjKey}:${isLight ? 1 : 0}`;
      if (key === this.starHash) return;
      this.starHash = key;

      this.clusterCenters = new Map();
      if (clusters && clusters.length) {
        for (const cl of clusters) {
          if (cl?.center) this.clusterCenters.set(cl.id, cl.center);
        }
      }

      const starData = [];
      const nebData = [];
      const edgeData = [];

      // 1. Deep-space ambient starfield dome (quiet, serene astronomical backdrop)
      let seed = 7331;
      const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < 360; i++) {
        const theta = rand() * Math.PI * 2;
        const elev = -0.02 + rand() * 0.78;
        const rad = 36 + rand() * 24;
        const x = Math.cos(theta) * Math.cos(elev) * rad;
        const y = Math.sin(elev) * rad + 1.0;
        const z = Math.sin(theta) * Math.cos(elev) * rad - 8.0;
        const tone = isLight ? [0.24, 0.36, 0.44] : (i % 6 === 0 ? [0.96, 0.89, 0.76] : [0.76, 0.88, 0.98]);
        starData.push(x, y, z, tone[0], tone[1], tone[2], 1.3 + rand() * 1.8, isLight ? 0.20 : (0.16 + rand() * 0.36));
      }

      // 2. Real Lean Verified Truth DAG stars on the 3D Celestial Helical Ring
      const worldPts = [];
      if (stars && stars.length) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const [wx, wy, wz] = mapStarToCelestialRing(s[0] / 1000, s[1] / 1000, s[2] / 1000, s[3], this.clusterCenters);
          worldPts.push([wx, wy, wz]);
          const hasG = Boolean(recentByCluster?.get(s[3])?.count);
          const col = (nebPalette && nebPalette[s[3] % nebPalette.length]) || [128, 198, 232];
          const deg = s[5] || 1;
          const isOther = s[3] === 7;
          const sz = isOther ? 2.1 : ((deg >= 7 ? 4.1 : 2.6) * (hasG ? 1.18 : 1.0));
          const al = (isOther ? 0.30 : (hasG ? 0.78 : 0.46)) * (isLight ? 0.76 : 1.0);
          starData.push(wx, wy, wz, col[0] / 255, col[1] / 255, col[2] / 255, sz, al);
        }
      }

      // 3. Gentle 5-Layer Silk Volumetric Nebula Clouds behind every named galaxy (soft JWST watercolor mist!)
      this.skyClusters = [];
      const clusterPosById = new Map();
      if (clusters && clusters.length) {
        for (const cl of clusters) {
          if (cl.name === 'Other') continue;
          const [cx3, cy3, cz3] = mapStarToCelestialRing(cl.center[0] / 1000, cl.center[1] / 1000, cl.center[2] / 1000, cl.id, this.clusterCenters);
          const col = (nebPalette && nebPalette[cl.id % nebPalette.length]) || [128, 198, 232];
          const hasG = Boolean(recentByCluster?.get(cl.id)?.count);
          this.skyClusters.push({ cl, x: cx3, y: cy3, z: cz3, col });
          clusterPosById.set(cl.id, [cx3, cy3, cz3]);
          const rC = col[0] / 255, gC = col[1] / 255, bC = col[2] / 255;
          // Blend a gentle warm pearl tint into outer veil so nebula feels luminous & organic, never harsh!
          const wR = rC * 0.68 + 0.30, wG = gC * 0.72 + 0.26, wB = bC * 0.78 + 0.18;
          const baseSz = hasG ? 128.0 : 98.0;
          const baseAl = isLight ? (hasG ? 0.095 : 0.055) : (hasG ? 0.22 : 0.145);
          nebData.push(cx3, cy3, cz3, rC, gC, bC, baseSz, baseAl);
          nebData.push(cx3 - 1.15, cy3 + 0.38, cz3 - 0.55, wR, wG, wB, baseSz * 0.84, baseAl * 0.56);
          nebData.push(cx3 + 1.15, cy3 - 0.30, cz3 + 0.45, rC, gC, bC, baseSz * 0.78, baseAl * 0.54);
          nebData.push(cx3 - 0.45, cy3 - 0.42, cz3 + 0.55, wR, wG, wB, baseSz * 0.66, baseAl * 0.46);
          nebData.push(cx3 + 0.55, cy3 + 0.48, cz3 - 0.40, 0.94, 0.86, 0.70, baseSz * 0.58, baseAl * (hasG ? 0.42 : 0.24));
        }
      }

      // 3B. Gentle Warm Conjecture Lantern Stars (settled proved/refuted conjectures glowing softly inside their own galaxy!)
      if (settledConjectures && settledConjectures.length && clusterPosById.size) {
        const domainToCid = (rec) => {
          const t = `${rec.area || ''} ${rec.title || ''} ${rec.enTitle || ''}`;
          if (/量子|quantum|bloch|fibonacci|entangl|fidelity|unistochastic|qubit/i.test(t)) return 1;
          if (/数论|robin|prime|zeckendorf|berstel|arith|integer/i.test(t)) return 2;
          if (/组合|graph|petersen|clique|combinator|quorum|deletion|insertion/i.test(t)) return 0;
          if (/分析|fourier|birkhoff|ergodic|limsup|diverg|heat|spectral|collision|analytic/i.test(t)) return 4;
          if (/weil|代数|bmv|gram|algebra/i.test(t)) return 5;
          if (/观察|observer|compact|locus/i.test(t)) return 6;
          return 3; // ConceptDynamics
        };
        const perCid = new Map();
        for (const rec of settledConjectures.slice(0, 28)) {
          const cid = domainToCid(rec);
          const center = clusterPosById.get(cid);
          if (!center) continue;
          const idx = perCid.get(cid) || 0;
          perCid.set(cid, idx + 1);
          const ang = idx * 2.39996 + cid * 0.9; // golden-angle gentle organic constellation spread!
          const dist = 0.45 + Math.sqrt(idx + 1) * 0.42;
          const lx = center[0] + Math.cos(ang) * dist;
          const ly = center[1] + Math.sin(ang) * dist * 0.55 + 0.12;
          const lz = center[2] + Math.sin(ang * 0.7) * 0.35;
          const isRef = rec.verdict === 'refuted';
          const lc = isLight
            ? (isRef ? [0.76, 0.38, 0.14] : [0.72, 0.52, 0.16])
            : (isRef ? [0.97, 0.74, 0.54] : [0.98, 0.88, 0.66]);
          // Size 11.5..14.0 activates the gentle 4-point JWST Lantern Star shader mode!
          starData.push(lx, ly, lz, lc[0], lc[1], lc[2], isRef ? 12.2 : 13.6, isLight ? 0.72 : 0.86);
        }
      }

      // 4. Delicate Gossamer 3D Intra-Galaxy Lean Theorem Filaments (gentle & silky!)
      if (edges && edges.length && worldPts.length) {
        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          if (e[2] === 1) continue;
          const u = e[0], v = e[1];
          const pu = worldPts[u], pv = worldPts[v];
          if (!pu || !pv) continue;
          const cid = stars[u][3];
          if (stars[v][3] !== cid) continue;
          if (Math.hypot(pu[0] - pv[0], pu[1] - pv[1], pu[2] - pv[2]) > 2.15) continue;
          const hasG = Boolean(recentByCluster?.get(cid)?.count);
          const col = (nebPalette && nebPalette[cid % nebPalette.length]) || [128, 198, 232];
          const al = (hasG ? 0.21 : 0.105) * (isLight ? 0.82 : 1.0);
          edgeData.push(
            pu[0], pu[1], pu[2], col[0] / 255, col[1] / 255, col[2] / 255, al,
            pv[0], pv[1], pv[2], col[0] / 255, col[1] / 255, col[2] / 255, al
          );
        }
      }

      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.starVbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starData), gl.STATIC_DRAW);
      this.geo.starCount = starData.length / 8;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.nebulaVbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nebData), gl.STATIC_DRAW);
      this.geo.nebulaCount = nebData.length / 8;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.dagEdgeVbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeData), gl.STATIC_DRAW);
      this.geo.dagEdgeCount = edgeData.length / 7;
    }

    drawMesh(mesh, modelMat, accent, active, running, themeIdx, t, edgeAlpha, stationAlpha) {
      if (stationAlpha < 0.02) return;
      const gl = this.gl;
      const pp = this.pbrProg;
      gl.useProgram(pp.p);
      gl.uniformMatrix4fv(pp.u.uViewProj, false, this.viewProj);
      gl.uniformMatrix4fv(pp.u.uModel, false, modelMat);
      gl.uniform3fv(pp.u.uCamPos, this.camPos);
      gl.uniform3fv(pp.u.uAccent, accent);
      gl.uniform3fv(pp.u.uFogColor, this.fogColor);
      gl.uniform1f(pp.u.uActive, active);
      gl.uniform1f(pp.u.uRunning, running);
      gl.uniform1f(pp.u.uTheme, themeIdx);
      gl.uniform1f(pp.u.uTime, t);
      gl.uniform1f(pp.u.uStationAlpha, stationAlpha);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.vertCount);

      if (mesh.edgeCount > 0 && edgeAlpha * stationAlpha > 0.01) {
        const ep = this.edgeProg;
        gl.useProgram(ep.p);
        gl.uniformMatrix4fv(ep.u.uViewProj, false, this.viewProj);
        gl.uniformMatrix4fv(ep.u.uModel, false, modelMat);
        gl.uniform3fv(ep.u.uCamPos, this.camPos);
        gl.uniform3fv(ep.u.uAccent, accent);
        gl.uniform1f(ep.u.uAlpha, edgeAlpha * stationAlpha);
        gl.uniform1f(ep.u.uActive, active);
        gl.uniform1f(ep.u.uTheme, themeIdx);

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.ebo);
        gl.disableVertexAttribArray(2);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
        gl.drawArrays(gl.LINES, 0, mesh.edgeCount);
      }
    }

    drawVolumetricPillar(x, y, z, radius, height, accent, strength, useCone = false) {
      if (strength < 0.004) return;
      const gl = this.gl;
      const vp = this.volProg;
      gl.useProgram(vp.p);
      M4.compose(this.modelMat, x, y, z, 0, 0, 0, radius, height, radius);
      gl.uniformMatrix4fv(vp.u.uViewProj, false, this.viewProj);
      gl.uniformMatrix4fv(vp.u.uModel, false, this.modelMat);
      gl.uniform3fv(vp.u.uCamPos, this.camPos);
      gl.uniform3fv(vp.u.uAccent, accent);
      gl.uniform1f(vp.u.uStrength, strength);

      const geom = (useCone && this.geo.cone) ? this.geo.cone : this.geo.vol;
      gl.bindBuffer(gl.ARRAY_BUFFER, geom.vbo);
      gl.disableVertexAttribArray(2);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, geom.count);
    }

    render(params) {
      const {
        t, themeIdx, entities, activeId, focusedId, bootAge, quiet,
        stationAlpha = 1.0, galaxyAlpha = 1.0, sonarRadius = 0.0, sonarAlpha = 0.0,
        rheostatRevX = -2.0, rheostatStuX = 2.0
      } = params;
      const gl = this.gl;
      const tAnim = quiet ? 4.2 : t;
      const isLight = themeIdx > 1.5;
      const isBlueprint = themeIdx > 0.5 && themeIdx < 1.5;

      this.fogColor = isLight
        ? [0.918, 0.902, 0.866]
        : isBlueprint
          ? [0.028, 0.068, 0.132]
          : [0.015, 0.024, 0.044];
      const floorCol = isLight
        ? [0.945, 0.933, 0.902]
        : isBlueprint
          ? [0.034, 0.084, 0.162]
          : [0.020, 0.032, 0.052];
      const gridCol = isLight
        ? [0.56, 0.54, 0.50]
        : isBlueprint
          ? [0.46, 0.72, 0.96]
          : [0.44, 0.66, 0.86];

      const drawFullQuad = () => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.quad.vbo);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
        gl.disableVertexAttribArray(3);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };

      // ---- PASS 1: RENDER 3-STRATA SCENE INTO HDR OFFSCREEN FBO ----
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fbo);
      gl.viewport(0, 0, this.fboW, this.fboH);
      gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // 1A. PROCEDURAL COSMIC NEBULA SKY DOME (STRATUM 3 atmospheric sky!)
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      {
        const sk = this.skyProg;
        gl.useProgram(sk.p);
        gl.uniform1f(sk.u.uTheme, themeIdx);
        gl.uniform1f(sk.u.uTime, tAnim);
        gl.uniform1f(sk.u.uYaw, this.yaw);
        gl.uniform1f(sk.u.uPitch, this.pitch);
        gl.uniform1f(sk.u.uGalaxyAlpha, galaxyAlpha);
        gl.uniform1f(sk.u.uAspect, this.cssW / this.cssH);
        drawFullQuad();
      }

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Pack 8 dynamic point lights for ground floor reflections
      const lPos = new Float32Array(24);
      const lCol = new Float32Array(24);
      const lPow = new Float32Array(8);
      for (let i = 0; i < Math.min(8, entities.length); i++) {
        const e = entities[i];
        lPos[i * 3] = e.x;
        lPos[i * 3 + 1] = (e.y || 0) + (e.eye ? 1.8 : 0.6);
        lPos[i * 3 + 2] = e.z;
        lCol[i * 3] = e.rgb[0] / 255;
        lCol[i * 3 + 1] = e.rgb[1] / 255;
        lCol[i * 3 + 2] = e.rgb[2] / 255;
        lPow[i] = (e.eye ? 0.55 : (e.isSel ? 2.6 : e.running ? 1.55 : 0.78)) * Math.max(stationAlpha, 0.28);
      }

      // 1B. STRATUM 1 — LOWERED REFLECTIVE GROUND ABYSS FLOOR (y = -1.35!)
      const floorAlpha = Math.max(stationAlpha, galaxyAlpha * 0.34);
      if (floorAlpha > 0.04) {
        const fp = this.floorProg;
        gl.useProgram(fp.p);
        gl.uniformMatrix4fv(fp.u.uViewProj, false, this.viewProj);
        gl.uniform3fv(fp.u.uCamPos, this.camPos);
        gl.uniform3fv(fp.u.uFogColor, this.fogColor);
        gl.uniform3fv(fp.u.uFloorColor, floorCol);
        gl.uniform3fv(fp.u.uGridColor, gridCol);
        gl.uniform3fv(fp.u.uLightPos, lPos);
        gl.uniform3fv(fp.u.uLightCol, lCol);
        gl.uniform1fv(fp.u.uLightPow, lPow);
        gl.uniform1f(fp.u.uTheme, themeIdx);
        gl.uniform1f(fp.u.uTime, tAnim);
        gl.uniform1f(fp.u.uStationAlpha, floorAlpha);
        gl.uniform1f(fp.u.uSonarRadius, sonarRadius);
        gl.uniform1f(fp.u.uSonarAlpha, sonarAlpha);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.floor.vbo);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.drawArrays(gl.TRIANGLES, 0, this.geo.floor.count);
      }

      // 1C. STRATUM 2 — SUSPENDED FLOATING ORBITAL SPACE STATION + AKASHA EYE (y = 0.0..6.95!)
      if (stationAlpha > 0.04 || galaxyAlpha > 0.04) {
        if (stationAlpha > 0.04) {
          M4.identity(this.modelMat);
          const campusAccent = isLight ? [0.16, 0.48, 0.48] : isBlueprint ? [0.56, 0.82, 1.0] : [0.46, 0.84, 0.94];
          this.drawMesh(this.geo.campus, this.modelMat, campusAccent, activeId === 'verification' ? 0.5 : 0.0, 0.3, themeIdx, tAnim, isLight ? 0.28 : 0.36, stationAlpha);
          // Independent Embedded Branch A Rail (02 独立评审 · Violet-Silver) + Sliding Wiper A
          const revAccent = isLight ? [0.38, 0.34, 0.72] : isBlueprint ? [0.62, 0.82, 1.0] : [0.68, 0.74, 0.98];
          const revAct = activeId === 'review' ? 1.0 : 0.25;
          if (this.geo.revRail) {
            M4.identity(this.modelMat);
            this.drawMesh(this.geo.revRail, this.modelMat, revAccent, revAct, 0.65, themeIdx, tAnim, isLight ? 0.34 : 0.44, stationAlpha);
          }
          if (this.geo.wiper) {
            const rx = Math.max(-5.15, Math.min(3.35, rheostatRevX));
            M4.compose(this.modelMat, rx, 0.0, 3.08, 0, 0, 0, 1, 1, 1);
            this.drawMesh(this.geo.wiper, this.modelMat, revAccent, Math.max(0.75, revAct), 1.0, themeIdx, tAnim, 0.56, stationAlpha);
          }
          // Independent Embedded Branch B Rail (06 工具与表达 · Ice-Cyan) + Sliding Wiper B
          const stuAccent = isLight ? [0.10, 0.46, 0.66] : isBlueprint ? [0.54, 0.86, 1.0] : [0.48, 0.84, 0.98];
          const stuAct = activeId === 'studio' ? 1.0 : 0.25;
          if (this.geo.stuRail) {
            M4.identity(this.modelMat);
            this.drawMesh(this.geo.stuRail, this.modelMat, stuAccent, stuAct, 0.65, themeIdx, tAnim, isLight ? 0.34 : 0.44, stationAlpha);
          }
          if (this.geo.wiper) {
            const sx = Math.max(-3.35, Math.min(5.15, rheostatStuX));
            M4.compose(this.modelMat, sx, 0.0, 3.88, 0, 0, 0, 1, 1, 1);
            this.drawMesh(this.geo.wiper, this.modelMat, stuAccent, Math.max(0.75, stuAct), 1.0, themeIdx, tAnim, 0.56, stationAlpha);
          }
        }

        for (const e of entities) {
          // Keep the Akasha Eye luminous as the celestial crown even in Galaxy Observatory mode!
          const entAlpha = e.eye ? Math.max(stationAlpha, galaxyAlpha * 0.82) : stationAlpha;
          if (entAlpha < 0.04) continue;
          const rawBoot = Math.max(0.08, Math.min(1, (bootAge - e.order * 0.025) / 0.32));
          const bootK = 1 - Math.pow(1 - rawBoot, 3);
          const accent = [e.rgb[0] / 255, e.rgb[1] / 255, e.rgb[2] / 255];
          const act = e.isSel ? 1.0 : (focusedId === e.id ? 1.0 : 0.0);
          const run = e.running ? 1.0 : 0.0;
          const edgeA = isLight ? 0.38 : (0.36 + act * 0.32);
          const y0 = e.y || 0;

          if (!e.eye && e.id !== 'verification') {
            M4.compose(this.modelMat, e.x, y0 + 0.10, e.z, 0, 0, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.plinth, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.72, entAlpha);
          }

          if (e.id === 'verification') {
            const scH = (0.96 + (e.hEntity - 1.44) * 0.25) * bootK;
            M4.compose(this.modelMat, e.x, y0 + 0.06, e.z, 0, tAnim * 0.06, 0, bootK, scH, bootK);
            this.drawMesh(this.geo.verification, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15, entAlpha);
            M4.compose(this.modelMat, e.x, y0 + 0.84 * scH, e.z, Math.sin(tAnim * 0.32) * 0.14, -tAnim * 0.28, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.verRing, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.9, entAlpha);
          } else if (e.id === 'research') {
            const fy = y0 + 1.00 * bootK + Math.sin(tAnim * 0.9) * 0.05;
            M4.compose(this.modelMat, e.x, fy, e.z, tAnim * 0.14, tAnim * 0.24, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.resShell, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15, entAlpha);
            M4.compose(this.modelMat, e.x, fy, e.z, -tAnim * 0.22, -tAnim * 0.32, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.resCore, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA, entAlpha);
          } else if (e.id === 'review') {
            M4.compose(this.modelMat, e.x, y0 + 0.20, e.z, 0, 0, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.revBase, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA, entAlpha);
            const sway = Math.sin(tAnim * 0.85) * 0.10;
            M4.compose(this.modelMat, e.x - 0.42 * bootK, y0 + (0.76 + sway) * bootK, e.z, 0, 0.28, 0.06, bootK, bootK, bootK);
            this.drawMesh(this.geo.revSlab, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA, entAlpha);
            M4.compose(this.modelMat, e.x + 0.42 * bootK, y0 + (0.76 - sway) * bootK, e.z, 0, -0.28, -0.06, bootK, bootK, bootK);
            this.drawMesh(this.geo.revSlab, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA, entAlpha);
          } else if (e.id === 'books') {
            M4.compose(this.modelMat, e.x, y0 + 0.20, e.z, 0, tAnim * 0.16, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.bookCore, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA, entAlpha);
            for (let lv = 0; lv < 5; lv++) {
              const ly = y0 + (0.36 + lv * 0.185 + Math.sin(tAnim * 1.1 + lv * 0.65) * 0.028) * bootK;
              const sc = (1.0 - lv * 0.07) * bootK;
              M4.compose(this.modelMat, e.x, ly, e.z, 0, lv * 0.12 + Math.sin(tAnim * 0.35 + lv) * 0.08, 0, sc, bootK, sc);
              this.drawMesh(this.geo.bookSlab, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.95, entAlpha);
            }
          } else if (e.id === 'publication') {
            M4.compose(this.modelMat, e.x, y0 + 0.20, e.z, 0, 0.25 + Math.sin(tAnim * 0.2) * 0.08, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.publication, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.05, entAlpha);
          } else if (e.id === 'outreach') {
            M4.compose(this.modelMat, e.x, y0 + 0.20, e.z, 0, 0, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.outBase, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA, entAlpha);
            M4.compose(this.modelMat, e.x, y0 + 0.74 * bootK, e.z, 0, tAnim * 0.18, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.outDish, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.05, entAlpha);
          } else if (e.id === 'studio') {
            const cy3 = y0 + 0.84 * bootK;
            M4.compose(this.modelMat, e.x, cy3, e.z, tAnim * 0.14, tAnim * 0.22, 0.18, bootK, bootK, bootK);
            this.drawMesh(this.geo.stuOuter, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.0, entAlpha);
            M4.compose(this.modelMat, e.x, cy3, e.z, -tAnim * 0.26, -tAnim * 0.34, 0, bootK, bootK, bootK);
            this.drawMesh(this.geo.stuInner, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15, entAlpha);
          } else if (e.id === 'direction') {
            const fy = y0 + Math.sin(tAnim * 0.85) * 0.08;
            const scEye = bootK * 1.18;
            M4.compose(this.modelMat, e.x, fy, e.z, 0, tAnim * 0.20, 0, scEye, scEye, scEye);
            this.drawMesh(this.geo.dirCore, this.modelMat, accent, Math.max(act, 0.55), 1.0, themeIdx, tAnim, edgeA * 1.25, entAlpha);
            M4.compose(this.modelMat, e.x, fy, e.z, Math.sin(tAnim * 0.28) * 0.16, -tAnim * 0.24, 0, scEye, scEye, scEye);
            this.drawMesh(this.geo.dirRing, this.modelMat, accent, Math.max(act, 0.45), 1.0, themeIdx, tAnim, edgeA * 1.05, entAlpha);
          }
        }

        // 1D. Volumetric Atmospheric Pillars + Supreme Akasha Eye Global Surveillance Cone!
        if (!isLight) {
          gl.depthMask(false);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          const ver = entities.find(e => e.id === 'verification');
          const eyeEnt = entities.find(e => e.eye);
          if (ver && stationAlpha > 0.05) {
            const vc = [ver.rgb[0] / 255, ver.rgb[1] / 255, ver.rgb[2] / 255];
            this.drawVolumetricPillar(ver.x, (ver.y || 0) + 0.15, ver.z, 0.96, 4.4, vc, 0.13 * stationAlpha);
            this.drawVolumetricPillar(ver.x, -1.35, ver.z, 0.56, 1.35, vc, 0.22 * stationAlpha);
          }
          if (eyeEnt) {
            // Grand translucent downward Global Surveillance Light Cone radiating from Supreme Akasha Eye over all galaxies & station!
            const ec = [0.92, 0.80, 0.50];
            const ea = Math.max(stationAlpha, galaxyAlpha * 0.78);
            const eyeY = eyeEnt.y || 6.95;
            this.drawVolumetricPillar(eyeEnt.x, 0.45, eyeEnt.z, 4.6, eyeY - 0.55, ec, 0.068 * ea, true);
            this.drawVolumetricPillar(eyeEnt.x, 1.6, eyeEnt.z, 1.85, eyeY - 1.65, [0.58, 0.86, 0.96], 0.055 * ea, true);
          }
          if (stationAlpha > 0.05) {
            this.drawVolumetricPillar(-5.65, -1.35, -0.50, 0.42, 1.15, [0.38, 0.82, 0.78], 0.11 * stationAlpha);
            this.drawVolumetricPillar( 5.65, -1.35, -0.50, 0.42, 1.15, [0.46, 0.78, 0.96], 0.11 * stationAlpha);
            for (const e of entities) {
              if (e.isSel && !e.eye && e.id !== 'verification') {
                this.drawVolumetricPillar(e.x, (e.y || 0) + 0.12, e.z, 0.80, 3.2, [e.rgb[0] / 255, e.rgb[1] / 255, e.rgb[2] / 255], 0.16 * stationAlpha);
              }
            }
          }
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(true);
        }
      }

      // 1E. STRATUM 3 — 3D CELESTIAL HELICAL TRUTH DAG RING (周天星斗大阵) ENCIRCLING GROUND <-> AKASHA EYE!
      // Rendered with DEPTH_TEST ON + depthMask OFF so stars, sacred meridian rings & rising spiritual qi wrap
      // authentically BEHIND and IN FRONT OF the floating sanctuary in true 3D depth!
      if (galaxyAlpha > 0.04) {
        gl.depthMask(false);
        if (!isLight) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        // Sacred counter-rotating 3D Astrolabe Meridian Rings & Ascending Double-Helix Qi Ribbons
        if (this.geo.celestialRings && this.geo.celestialRings.count > 0) {
          const dl = this.dagLineProg;
          gl.useProgram(dl.p);
          M4.compose(this.modelMat, 0, 0, 0, 0, tAnim * 0.018, 0, 1, 1, 1);
          gl.uniformMatrix4fv(dl.u.uViewProj, false, this.viewProj);
          gl.uniformMatrix4fv(dl.u.uModel, false, this.modelMat);
          gl.uniform1f(dl.u.uAlphaMul, galaxyAlpha * (isLight ? 0.55 : 0.95));
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.celestialRings.vbo);
          gl.disableVertexAttribArray(3);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
          gl.drawArrays(gl.LINES, 0, this.geo.celestialRings.count);
        }

        // Volumetric nebula clouds behind each named galaxy along the celestial ring
        if (this.geo.nebulaCount > 0) {
          const sp = this.starProg;
          gl.useProgram(sp.p);
          gl.uniformMatrix4fv(sp.u.uViewProj, false, this.viewProj);
          gl.uniform1f(sp.u.uDpr, this.dpr);
          gl.uniform1f(sp.u.uAlphaMul, galaxyAlpha);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.nebulaVbo);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 24);
          gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 28);
          gl.drawArrays(gl.POINTS, 0, this.geo.nebulaCount);
        }

        // Crisp 3D intra-galaxy constellation edges
        if (this.geo.dagEdgeCount > 0) {
          const dl = this.dagLineProg;
          gl.useProgram(dl.p);
          gl.uniformMatrix4fv(dl.u.uViewProj, false, this.viewProj);
          gl.uniformMatrix4fv(dl.u.uModel, false, this.identityMat);
          gl.uniform1f(dl.u.uAlphaMul, galaxyAlpha);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.dagEdgeVbo);
          gl.disableVertexAttribArray(3);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
          gl.drawArrays(gl.LINES, 0, this.geo.dagEdgeCount);
        }

        // 1,160+ real frozen Truth DAG stars + Foundation 360° Celestial River
        if (this.geo.starCount > 0) {
          const sp = this.starProg;
          gl.useProgram(sp.p);
          gl.uniformMatrix4fv(sp.u.uViewProj, false, this.viewProj);
          gl.uniform1f(sp.u.uDpr, this.dpr);
          gl.uniform1f(sp.u.uAlphaMul, galaxyAlpha);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.starVbo);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 24);
          gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 28);
          gl.drawArrays(gl.POINTS, 0, this.geo.starCount);
          gl.disableVertexAttribArray(3);
        }

        // GPU-Animated Ascending Ethereal Qi / Starlight Motes rising silently from Ground -> Akasha Eye!
        if (this.geo.qi && this.geo.qi.count > 0 && !isLight) {
          const qp = this.qiProg;
          gl.useProgram(qp.p);
          gl.uniformMatrix4fv(qp.u.uViewProj, false, this.viewProj);
          gl.uniform1f(qp.u.uTime, tAnim);
          gl.uniform1f(qp.u.uDpr, this.dpr);
          gl.uniform1f(qp.u.uAlphaMul, galaxyAlpha * 0.92);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.qi.vbo);
          gl.disableVertexAttribArray(3);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 36, 0);
          gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 16);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 36, 28);
          gl.drawArrays(gl.POINTS, 0, this.geo.qi.count);
        }

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);
      }

      // ---- PASS 2..5: SELECTIVE GPU BLOOM + ACES FILMIC + CHROMATIC EDGE + VIGNETTE + FILM GRAIN ----
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
      gl.useProgram(this.brightProg.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
      gl.uniform1i(this.brightProg.u.uTex, 0);
      gl.uniform1f(this.brightProg.u.uThreshold, isLight ? 0.94 : 0.38);
      drawFullQuad();

      gl.useProgram(this.blurProg.p);
      gl.uniform1i(this.blurProg.u.uTex, 0);
      for (let pass = 0; pass < 2; pass++) {
        const spread = pass === 0 ? 1.30 : 2.50;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
        gl.uniform2f(this.blurProg.u.uDir, spread / this.bloomA.w, 0);
        drawFullQuad();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
        gl.uniform2f(this.blurProg.u.uDir, 0, spread / this.bloomA.h);
        drawFullQuad();
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.fboW, this.fboH);
      gl.useProgram(this.compProg.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
      gl.uniform1i(this.compProg.u.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
      gl.uniform1i(this.compProg.u.uBloom, 1);
      gl.uniform1f(this.compProg.u.uTheme, themeIdx);
      gl.uniform1f(this.compProg.u.uTime, tAnim);
      gl.uniform1f(this.compProg.u.uBloomStrength, isLight ? 0.14 : (isBlueprint ? 0.62 : 0.72));
      drawFullQuad();
    }
  }

  window.TrureGL = TrureGL;
})();
