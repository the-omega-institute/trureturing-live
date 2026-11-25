// ============================================================================
// TRURETURING // LIVE — REAL WEBGL2 PBR SPATIAL ENGINE (Igloo × Active Theory × KPR)
// Zero external dependencies. Full GPU pipeline:
//   1. True OpenGL right-handed Perspective + Smooth Damped Fly-In Camera
//   2. Procedural Reflective Obsidian / Arctic-Concrete Floor + fwidth() CAD Grid
//   3. PBR Faceted Crystal / Obsidian / Brushed-Titanium Monolith Shaders (GGX + Fresnel)
//   4. Clean Hard-Edge Crease Wireframes (EdgesGeometry-equivalent, zero triangle diagonals)
//   5. Volumetric Atmospheric Light Pillars
//   6. Deep-Space 3D Truth DAG Starfield & Outer Frontier Crystallization
//   7. Multi-Pass GPU Selective Bloom + ACES Filmic Tone Mapping + Vignette + Film Grain
// ============================================================================
(function () {
  'use strict';

  // ---- Minimal Float32 Mat4 / Vec3 Math ----
  const M4 = {
    create: () => new Float32Array(16),
    identity(out) {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    perspective(out, fovy, aspect, near, far) {
      const f = 1.0 / Math.tan(fovy * 0.5);
      const nf = 1.0 / (near - far);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
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
      // Y * X * Z
      const m00 = (cy * cz + syr * sxr * szr) * sx;
      const m10 = (cx * szr) * sx;
      const m20 = (-syr * cz + cy * sxr * szr) * sx;
      const m01 = (-cy * szr + syr * sxr * cz) * sy;
      const m11 = (cx * cz) * sy;
      const m21 = (syr * szr + cy * sxr * cz) * sy;
      const m02 = (syr * cx) * sz;
      const m12 = (-sxr) * sz;
      const m22 = (cy * cx) * sz;
      out[0] = m00; out[1] = m10; out[2] = m20; out[3] = 0;
      out[4] = m01; out[5] = m11; out[6] = m21; out[7] = 0;
      out[8] = m02; out[9] = m12; out[10] = m22; out[11] = 0;
      out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
      return out;
    }
  };

  // ---- Procedural Architectural Mesh Builder + Automatic Sharp Crease Edge Extractor ----
  // Produces solid flat-shaded triangle geometry AND clean EdgesGeometry-style hard edges (NO ugly triangle diagonals!)
  class MeshBuilder {
    constructor() {
      this.verts = []; // [x,y,z, nx,ny,nz, matId]
      this.faces = []; // { pts: [[x,y,z],...], n: [nx,ny,nz], mat: number }
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
      this.addPolygon([p001, p101, p111, p011], mat); // +Z
      this.addPolygon([p100, p000, p010, p110], mat); // -Z
      this.addPolygon([p011, p111, p110, p010], mat); // +Y
      this.addPolygon([p000, p100, p101, p001], mat); // -Y
      this.addPolygon([p101, p100, p110, p111], mat); // +X
      this.addPolygon([p000, p001, p011, p010], mat); // -X
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

    addChamferedTerrace(sx, sz, hx, hz, ch, yBot, yTop, mat = 0) {
      const poly2D = [
        [sx - hx + ch, sz - hz], [sx + hx - ch, sz - hz],
        [sx + hx, sz - hz + ch], [sx + hx, sz + hz - ch],
        [sx + hx - ch, sz + hz], [sx - hx + ch, sz + hz],
        [sx - hx, sz + hz - ch], [sx - hx, sz - hz + ch]
      ];
      const bot = poly2D.map(([x, z]) => [x, yBot, z]);
      const top = poly2D.map(([x, z]) => [x, yTop, z]);
      const n = poly2D.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        this.addPolygon([bot[j], bot[i], top[i], top[j]], mat);
      }
      this.addPolygon(top.slice().reverse(), mat);
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
        // tilt X then Z
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
          if (r === 0) {
            this.addPolygon([p00, p11, p01], mat);
          } else {
            this.addPolygon([p00, p10, p11, p01], mat);
          }
        }
      }
    }

    // Extract ONLY sharp architectural crease edges (EdgesGeometry equivalent: dihedral angle > thresholdDeg!)
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

      return {
        vbo,
        vertCount: this.verts.length / 7,
        ebo,
        edgeCount: edgeVerts.length / 4
      };
    }
  }

  // ---- GLSL Shaders (ES 3.00) ----

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
  uniform float uTheme; // 0=dark, 1=blueprint, 2=light
  uniform float uTime;
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
    vec3 R = reflect(-V, N);
    float dist = length(P.xz);

    // Subtle procedural brushed-obsidian / matte-concrete roughness variation
    float micro = sin(P.x * 3.7 + P.z * 2.1) * cos(P.x * 1.9 - P.z * 4.3) * 0.5 + 0.5;
    vec3 col = uFloorColor * (0.94 + 0.12 * micro);

    // Anti-aliased architectural CAD grid (2m major + subtle 1m minor cross-ticks)
    float majorG = gridFactor(P.xz, 2.0, 1.15);
    float minorG = gridFactor(P.xz, 0.5, 0.9);
    float gridFade = exp(-dist * 0.088);
    float innerFade = smoothstep(0.5, 2.2, dist);
    float gridMask = (majorG * 0.65 + minorG * 0.15) * gridFade;
    col = mix(col, uGridColor, gridMask * (uTheme > 1.5 ? 0.30 : 0.26));

    // Real-time specular & diffuse reflection bounce from all 8 glowing monolith cores!
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    for (int i = 0; i < 8; i++) {
      vec3 lp = uLightPos[i];
      float pw = uLightPow[i];
      if (pw <= 0.001) continue;
      vec3 Lvec = lp - P;
      float d2 = dot(Lvec, Lvec) + 0.85;
      vec3 L = normalize(Lvec);
      float att = pw / (1.0 + d2 * 0.22);
      // Soft ground pool + crisp wet-obsidian specular sheen
      float diff = max(dot(N, L), 0.0);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), mix(18.0, 42.0, micro));
      if (uTheme > 1.5) {
        // Light maquette: gentle subtle bounce tint + soft contact occlusion shadow
        float occ = exp(-dot(P.xz - lp.xz, P.xz - lp.xz) * 0.72);
        col *= (1.0 - occ * 0.14);
        col += uLightCol[i] * (diff * att * 0.08);
      } else {
        col += uLightCol[i] * (diff * att * 0.16 + spec * att * (0.28 + 0.45 * fres));
      }
    }

    // Subtle concentric orbital elevation ring on plaza floor
    float ringD = abs(dist - 8.4);
    float ring = (1.0 - smoothstep(0.0, 0.06, ringD)) * 0.22 * exp(-dist * 0.04);
    col += uGridColor * ring * (uTheme > 1.5 ? 0.4 : 0.6);

    // Smooth atmospheric depth fog dissolving into deep space
    float camDist = length(uCamPos - P);
    float fog = 1.0 - exp(-pow(max(0.0, camDist - 12.0) * 0.046, 1.85));
    float radialFade = smoothstep(14.0, 32.0, dist);
    float alpha = (1.0 - radialFade) * (1.0 - fog * 0.85);
    col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));
    if (alpha < 0.004) discard;
    fragColor = vec4(col, alpha);
  }`;

  const PBR_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNorm;
  layout(location=2) in float aMat;
  uniform mat4 uViewProj;
  uniform mat4 uModel;
  out vec3 vWorldPos;
  out vec3 vNorm;
  out float vMat;
  void main() {
    vec4 wp = uModel * vec4(aPos, 1.0);
    vWorldPos = wp.xyz;
    vNorm = normalize(mat3(uModel) * aNorm);
    vMat = aMat;
    gl_Position = uViewProj * wp;
  }`;

  const PBR_FS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos;
  in vec3 vNorm;
  in float vMat;
  uniform vec3 uCamPos;
  uniform vec3 uAccent;
  uniform vec3 uFogColor;
  uniform float uActive;   // 0..1 selected/hovered boost
  uniform float uRunning;  // 0..1 live activity boost
  uniform float uTheme;    // 0=dark, 1=blueprint, 2=light
  uniform float uTime;
  out vec4 fragColor;

  void main() {
    vec3 N = normalize(vNorm);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(uCamPos - vWorldPos);
    float NoV = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - NoV, 3.0);
    float sharpFresnel = pow(1.0 - NoV, 4.8);

    // 3-Point Arctic Studio Lighting (Igloo Inc. crisp directional key + cool fill + rim!)
    vec3 Lkey = normalize(vec3(-0.58, 0.82, 0.56));
    vec3 Lfill = normalize(vec3(0.76, 0.34, -0.45));
    vec3 Lrim = normalize(vec3(0.05, 0.55, -0.85));

    float diffKey = max(dot(N, Lkey), 0.0);
    float diffFill = max(dot(N, Lfill), 0.0);
    float diffRim = max(dot(N, Lrim), 0.0);

    vec3 Hkey = normalize(Lkey + V);
    vec3 Hrim = normalize(Lrim + V);

    // Height ambient occlusion: darker near floor, crisper toward crown
    float heightAO = mix(0.62, 1.12, clamp(vWorldPos.y * 0.52, 0.0, 1.0));
    float activeLift = 1.0 + uActive * 0.42 + uRunning * 0.14;

    vec3 col;
    float alpha = 1.0;

    if (vMat > 2.5) {
      // Material 3: EMISSIVE INNER DATA CORE (triggers crisp selective UnrealBloom!)
      vec3 coreTint = mix(uAccent, vec3(0.92, 0.98, 1.0), 0.48 + 0.25 * NoV);
      float pulse = 0.92 + 0.08 * sin(uTime * 1.8 + vWorldPos.y * 2.5);
      col = coreTint * (1.35 + uActive * 0.75 + uRunning * 0.30) * pulse;
      if (uTheme > 1.5) col = mix(uAccent * 1.05, vec3(1.0), 0.28);
    } else if (vMat > 1.5) {
      // Material 2: BRUSHED TITANIUM / ARCTIC ALUMINUM TRIM
      vec3 base = uTheme > 1.5 ? vec3(0.76, 0.75, 0.72) : (uTheme > 0.5 ? vec3(0.24, 0.38, 0.56) : vec3(0.22, 0.28, 0.36));
      float specKey = pow(max(dot(N, Hkey), 0.0), 56.0);
      float specRim = pow(max(dot(N, Hrim), 0.0), 28.0);
      vec3 keyCol = uTheme > 1.5 ? vec3(1.0, 0.98, 0.94) : vec3(0.84, 0.92, 1.0);
      col = base * (0.28 + 0.72 * diffKey + 0.25 * diffFill) * heightAO;
      col += keyCol * specKey * 0.95;
      col += mix(uAccent, vec3(0.82, 0.94, 1.0), 0.55) * (specRim * 0.55 + fresnel * 0.55 * activeLift);
    } else if (vMat > 0.5) {
      // Material 1: FROSTED ARCTIC CRYSTAL / SMOKED GLASS MONOLITH (Igloo signature material!)
      vec3 base = uTheme > 1.5
        ? vec3(0.92, 0.91, 0.88)
        : (uTheme > 0.5 ? vec3(0.08, 0.19, 0.34) : vec3(0.06, 0.10, 0.16));
      float specKey = pow(max(dot(N, Hkey), 0.0), 72.0);
      float specRim = pow(max(dot(N, Hrim), 0.0), 22.0);
      vec3 skyRefl = uTheme > 1.5 ? vec3(0.98, 0.97, 0.95) : vec3(0.45, 0.68, 0.88);
      vec3 rimCol = mix(uAccent, vec3(0.85, 0.96, 1.0), 0.45);
      col = base * (0.34 + 0.68 * diffKey + 0.32 * diffFill) * heightAO;
      // Internal ice-subsurface scatter from monolith's accent core
      float innerScatter = pow(max(0.0, 1.0 - abs(N.y)), 1.6) * (0.14 + uActive * 0.18 + uRunning * 0.08);
      col += uAccent * innerScatter;
      // Specular glass reflection + chilling Fresnel rim
      col += skyRefl * specKey * (uTheme > 1.5 ? 0.55 : 1.15);
      col += rimCol * (specRim * 0.42 + fresnel * (uTheme > 1.5 ? 0.28 : 0.72) * activeLift);
      col += vec3(0.95, 0.99, 1.0) * sharpFresnel * (uTheme > 1.5 ? 0.20 : 0.58);
      alpha = uTheme > 1.5 ? 0.94 : 0.88;
    } else {
      // Material 0: MATTE BRUTALIST OBSIDIAN / ARCHITECTURAL PLINTH & TERRACE
      vec3 base = uTheme > 1.5
        ? vec3(0.86, 0.84, 0.79)
        : (uTheme > 0.5 ? vec3(0.06, 0.13, 0.24) : vec3(0.055, 0.075, 0.105));
      float specKey = pow(max(dot(N, Hkey), 0.0), 22.0);
      col = base * (0.38 + 0.64 * diffKey + 0.24 * diffFill + 0.12 * diffRim) * heightAO;
      col += vec3(0.75, 0.86, 0.98) * specKey * (uTheme > 1.5 ? 0.18 : 0.32);
      col += uAccent * fresnel * (0.16 + uActive * 0.32);
    }

    // Distance atmospheric depth fog
    float camDist = length(uCamPos - vWorldPos);
    float fog = 1.0 - exp(-pow(max(0.0, camDist - 15.0) * 0.036, 1.8));
    col = mix(col, uFogColor, clamp(fog * 0.72, 0.0, 0.80));
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
    // Slight depth bias toward camera so architectural edges stay razor-clean without z-fighting
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
    vec3 silver = uTheme > 1.5 ? vec3(0.24, 0.30, 0.38) : vec3(0.72, 0.84, 0.96);
    vec3 col = vMat > 0.5 ? mix(silver, uAccent, 0.55 + uActive * 0.35) : mix(silver, uAccent, 0.28 + uActive * 0.45);
    if (vMat > 2.5) col = mix(uAccent, vec3(1.0), 0.6);
    float camDist = length(uCamPos - vWorldPos);
    float fade = clamp(1.15 - camDist * 0.022, 0.25, 1.0);
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
    float vFade = smoothstep(0.0, 0.14, vLocalY) * pow(max(0.0, 1.0 - vLocalY), 1.65);
    float a = edge * vFade * uStrength;
    if (a < 0.002) discard;
    fragColor = vec4(uAccent * (0.9 + 0.35 * edge), a);
  }`;

  const STAR_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aCol;
  layout(location=2) in float aSize;
  layout(location=3) in float aAlpha;
  uniform mat4 uViewProj;
  uniform float uDpr;
  out vec3 vCol;
  out float vAlpha;
  void main() {
    vec4 clip = uViewProj * vec4(aPos, 1.0);
    gl_Position = clip;
    float pSize = aSize * uDpr * clamp(28.0 / max(8.0, clip.w), 0.65, 2.2);
    gl_PointSize = pSize;
    vCol = aCol;
    vAlpha = aAlpha;
  }`;

  const STAR_FS = `#version 300 es
  precision highp float;
  in vec3 vCol;
  in float vAlpha;
  out vec4 fragColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 5.2);
    float halo = exp(-r * r * 1.9) * 0.35;
    fragColor = vec4(vCol, (core + halo) * vAlpha);
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
  uniform float uTheme; // 0=dark, 1=blueprint, 2=light
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

    // Subtle optical chromatic edge dispersion (Igloo / Active Theory cinema lens feel!)
    float ca = (uTheme > 1.5 ? 0.0004 : 0.0011) * r2;
    vec3 scene;
    scene.r = texture(uScene, vUv + centered * ca).r;
    scene.g = texture(uScene, vUv).g;
    scene.b = texture(uScene, vUv - centered * ca).b;

    vec3 bloom = texture(uBloom, vUv).rgb;
    vec3 col = scene + bloom * uBloomStrength;

    if (uTheme < 1.5) {
      // ACES Filmic Tone Mapping for dark / blueprint cinema depth
      col = aces(col * 1.06);
      // Soft cinema optical vignette
      float vig = 1.0 - r2 * 0.62;
      col *= clamp(vig, 0.55, 1.0);
    } else {
      // Clean studio paper/alabaster curve for light maquette
      col = clamp(col, 0.0, 1.0);
      float vig = 1.0 - r2 * 0.14;
      col *= clamp(vig, 0.88, 1.0);
    }

    // Subtle 1.4% cinematic film grain (breaks 8-bit banding and adds tangible material texture!)
    float grain = (hash12(gl_FragCoord.xy + fract(uTime * 11.3)) - 0.5) * (uTheme > 1.5 ? 0.012 : 0.020);
    col = clamp(col + grain, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
  }`;

  // ---- Shader / FBO Helpers ----
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
      const clean = info.name.replace(/\[0\]$/, '');
      locs[clean] = gl.getUniformLocation(p, info.name);
    }
    return { p, u: locs };
  }

  function createFBO(gl, w, h, withDepth, useFloat) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const internalFmt = useFloat ? gl.RGBA16F : gl.RGBA8;
    const type = useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFmt, w, h, 0, gl.RGBA, type, null);
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

  // ---- Build the 8 Iconic Igloo-Style Sculptural 3D Architectural Monoliths ----
  function buildWorldGeometries(gl) {
    const g = {};

    // Static Architectural Base Campus (4 chamfered obsidian wing terraces + suspended bridge spans + central deck)
    const campus = new MeshBuilder();
    // 4 Sovereign Wing Terraces (extruded architectural plinth slabs y = 0 .. 0.10)
    campus.addChamferedTerrace(-5.65, -0.50, 2.02, 3.78, 0.42, 0.0, 0.09, 0);
    campus.addChamferedTerrace( 5.65, -0.50, 2.02, 3.78, 0.42, 0.0, 0.09, 0);
    campus.addChamferedTerrace(-3.35,  5.35, 1.72, 1.08, 0.34, 0.0, 0.09, 0);
    campus.addChamferedTerrace( 3.35,  5.35, 1.72, 1.08, 0.34, 0.0, 0.09, 0);
    // Suspended Central Verification Octagonal Deck (2 stepped tiers)
    campus.addPrism(0, 0.0, -0.45, 1.78, 1.62, 0.14, 8, 0, Math.PI / 8);
    campus.addPrism(0, 0.14, -0.45, 1.48, 1.42, 0.10, 8, 2, Math.PI / 8);
    // Twin Extruded Structural Bridge Spans joining Wings <-> Central Verification Core
    campus.addBox(-2.58, 0.14, -0.45, 2.25, 0.07, 0.72, 0);
    campus.addBox( 2.58, 0.14, -0.45, 2.25, 0.07, 0.72, 0);
    // Bridge structural side-rails
    campus.addBox(-2.58, 0.20, -0.82, 2.25, 0.04, 0.05, 2);
    campus.addBox(-2.58, 0.20, -0.08, 2.25, 0.04, 0.05, 2);
    campus.addBox( 2.58, 0.20, -0.82, 2.25, 0.04, 0.05, 2);
    campus.addBox( 2.58, 0.20, -0.08, 2.25, 0.04, 0.05, 2);
    // South Bridge structural walkways accurately connecting Central Verification Deck -> Books (-3.35, 5.35) & Studio (+3.35, 5.35)
    campus.addBox(-1.68, 0.08, 2.45, 0.36, 0.055, 4.45, 0,  0.524);
    campus.addBox( 1.68, 0.08, 2.45, 0.36, 0.055, 4.45, 0, -0.524);
    g.campus = campus.build(gl, 20);

    // Pedestal Hex Plinth (reusable under grounded monoliths)
    const plinth = new MeshBuilder();
    plinth.addPrism(0, 0.0, 0, 0.92, 0.80, 0.10, 6, 0, Math.PI / 6);
    plinth.addPrism(0, 0.10, 0, 0.70, 0.66, 0.06, 6, 2, Math.PI / 6);
    g.plinth = plinth.build(gl, 20);

    // 00 // VERIFICATION — Stepped Crystalline Octagonal Spire + Luminous Inner Core + Twin Containment Rings
    const verBase = new MeshBuilder();
    verBase.addPrism(0, 0.0, 0, 0.76, 0.62, 0.46, 8, 1, Math.PI / 8);
    verBase.addPrism(0, 0.50, 0, 0.58, 0.44, 0.52, 8, 1, Math.PI / 8);
    verBase.addPrism(0, 1.06, 0, 0.40, 0.02, 0.62, 8, 1, Math.PI / 8);
    // Inner glowing crystalline obelisk core
    verBase.addPrism(0, 0.12, 0, 0.24, 0.18, 1.18, 6, 3, 0);
    // 4 vertical titanium buttress fins
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      verBase.addBox(Math.cos(a) * 0.72, 0.56, Math.sin(a) * 0.72, 0.07, 1.06, 0.22, 2, -a);
    }
    g.verification = verBase.build(gl, 18);

    const verRing = new MeshBuilder();
    verRing.addTorusRing(0, 0, 0, 1.02, 0.032, 32, 6, 0.36, 0.15, 2);
    verRing.addTorusRing(0, 0, 0, 0.86, 0.022, 28, 6, -0.44, -0.22, 1);
    g.verRing = verRing.build(gl, 28);

    // 01 // RESEARCH — Igloo Signature Fractured Crystal Icosahedron Monolith + Glowing Inner Core!
    const resCore = new MeshBuilder();
    resCore.addOctahedron(0, 0, 0, 0.28, 0.36, 0.28, 3);
    g.resCore = resCore.build(gl, 15);

    const resShell = new MeshBuilder();
    resShell.addIcosahedron(0, 0, 0, 0.66, 1, 0.085); // fractured hovering obsidian-crystal shards!
    g.resShell = resShell.build(gl, 18);

    // 02 // REVIEW — Twin Counter-Poised Brutalist Obsidian-Glass Monolith Slabs + Fulcrum Core
    const revBase = new MeshBuilder();
    revBase.addBox(0, 0.58, 0, 0.08, 1.06, 0.08, 2);
    revBase.addOctahedron(0, 1.24, 0, 0.14, 0.20, 0.14, 3);
    g.revBase = revBase.build(gl, 18);

    const revSlab = new MeshBuilder();
    revSlab.addBox(0, 0, 0, 0.44, 0.86, 0.18, 1, 0.22);
    revSlab.addBox(0, 0.46, 0, 0.46, 0.04, 0.20, 2, 0.22);
    g.revSlab = revSlab.build(gl, 18);

    // 03 // BOOKS — Stratified Floating Glass Archive Monolith (5 bevelled crystal strata!)
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

    // 05 // OUTREACH — Sculpted Faceted Deep-Space Parabolic Dish Monolith + Emitter Spire
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
    // 12 precision structural titanium edge beams forming a hollow brutalist foundry frame cube
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

    // A0 // DIRECTION (ARCHITECT / 监管之眼) — Suspended Obsidian Diamond Monolith + Twin Titanium Gimbal Rings!
    const dirCore = new MeshBuilder();
    dirCore.addOctahedron(0, 0, 0, 0.56, 0.78, 0.56, 1, Math.PI / 4);
    dirCore.addOctahedron(0, 0, 0, 0.28, 0.30, 0.28, 3, 0);
    g.dirCore = dirCore.build(gl, 16);

    const dirRing = new MeshBuilder();
    dirRing.addTorusRing(0, 0, 0, 1.08, 0.036, 36, 6, 0.32, 0.18, 2);
    dirRing.addTorusRing(0, 0, 0, 0.84, 0.024, 32, 6, -0.58, -0.35, 2);
    g.dirRing = dirRing.build(gl, 28);

    // Volumetric Light Cylinder (open cylinder height 0..1, radius 1)
    const volVerts = [];
    const segs = 24;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      // 2 triangles per quad: [pos3, norm3]
      volVerts.push(
        c0, 0, s0, c0, 0, s0,  c1, 0, s1, c1, 0, s1,  c1, 1, s1, c1, 0, s1,
        c0, 0, s0, c0, 0, s0,  c1, 1, s1, c1, 0, s1,  c0, 1, s0, c0, 0, s0
      );
    }
    const volVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, volVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(volVerts), gl.STATIC_DRAW);
    g.vol = { vbo: volVbo, count: volVerts.length / 6 };

    // Infinite Floor Quad (-42..42)
    const fl = 44;
    const floorVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -fl, -0.02, -fl,  fl, -0.02, -fl,  fl, -0.02,  fl,
      -fl, -0.02, -fl,  fl, -0.02,  fl, -fl, -0.02,  fl
    ]), gl.STATIC_DRAW);
    g.floor = { vbo: floorVbo, count: 6 };

    // Full-screen Post Quad
    const quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    g.quad = { vbo: quadVbo, count: 6 };

    // Dynamic Starfield VBO (populated once Truth DAG nebula loads)
    g.starVbo = gl.createBuffer();
    g.starCount = 0;

    return g;
  }

  // ---- Main TrureGL Class ----
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

      this.floorProg = createProgram(gl, FLOOR_VS, FLOOR_FS);
      this.pbrProg = createProgram(gl, PBR_VS, PBR_FS);
      this.edgeProg = createProgram(gl, EDGE_VS, EDGE_FS);
      this.volProg = createProgram(gl, VOL_VS, VOL_FS);
      this.starProg = createProgram(gl, STAR_VS, STAR_FS);
      this.brightProg = createProgram(gl, QUAD_VS, BRIGHT_FS);
      this.blurProg = createProgram(gl, QUAD_VS, BLUR_FS);
      this.compProg = createProgram(gl, QUAD_VS, COMPOSITE_FS);

      this.geo = buildWorldGeometries(gl);
      this.projMat = M4.create();
      this.viewMat = M4.create();
      this.viewProj = M4.create();
      this.modelMat = M4.create();
      this.camPos = [0, 12, 15];
      this.fovY = (37 * Math.PI) / 180;
      this.cssW = 1280;
      this.cssH = 720;
      this.dpr = 1;

      this.sceneFBO = null;
      this.bloomA = null;
      this.bloomB = null;
      this.fboW = 0;
      this.fboH = 0;
      this.starHash = '';
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

    // Update true right-handed perspective camera (matches exact project() coordinates!)
    setCamera(yaw, pitch, dist, targetX, targetY, targetZ) {
      const aspect = this.cssW / this.cssH;
      // Slightly wider FOV on portrait/narrow displays so whole plateau stays cleanly framed
      this.fovY = (aspect < 1.2 ? 44 : 36.5) * (Math.PI / 180);
      M4.perspective(this.projMat, this.fovY, aspect, 0.35, 140.0);

      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      this.camPos[0] = targetX + dist * cp * sy;
      this.camPos[1] = targetY + dist * sp;
      this.camPos[2] = targetZ + dist * cp * cy;

      M4.lookAt(this.viewMat, this.camPos, [targetX, targetY, targetZ], [0, 1, 0]);
      M4.mul(this.viewProj, this.projMat, this.viewMat);
    }

    // Sub-pixel accurate 3D -> 2D CSS screen projection (shared by app.mjs cards, hit-testing & HUD!)
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

    // Upload real 1,160 Truth DAG stars + subtle ambient cosmic dust into a 3D far-sky point cloud
    syncStars(stars, nebPalette, recentByCluster, isLight) {
      const key = `${stars?.length || 0}:${recentByCluster?.size || 0}:${isLight ? 1 : 0}`;
      if (key === this.starHash) return;
      this.starHash = key;
      const data = [];
      // 1. Subtle deep-space ambient field (distant, quiet, pure astronomical depth)
      let seed = 7331;
      const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < 260; i++) {
        const theta = rand() * Math.PI * 2;
        const elev = 0.04 + rand() * 0.72;
        const rad = 34 + rand() * 22;
        const x = Math.cos(theta) * Math.cos(elev) * rad;
        const y = Math.sin(elev) * rad - 2.0;
        const z = Math.sin(theta) * Math.cos(elev) * rad - 4.0;
        const tone = isLight ? [0.22, 0.34, 0.42] : [0.68, 0.80, 0.94];
        data.push(x, y, z, tone[0], tone[1], tone[2], 1.2 + rand() * 1.4, isLight ? 0.20 : (0.16 + rand() * 0.34));
      }
      // 2. Real Truth DAG stars arranged on a grand astronomical outer dome FAR behind the plateau
      if (stars && stars.length) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const nx = s[0] / 1000, ny = s[1] / 1000, nz = s[2] / 1000;
          const hasG = Boolean(recentByCluster?.get(s[3])?.count);
          const col = (nebPalette && nebPalette[s[3] % nebPalette.length]) || [128, 198, 232];
          // Map into vast deep-space background vault well outside the architectural plateau
          const wx = nx * 24.5;
          const wy = 4.6 + ny * 11.5;
          const wz = -14.5 + nz * 12.0 - Math.hypot(nx, ny) * 4.5;
          const deg = s[5] || 1;
          const sz = (deg >= 7 ? 3.2 : 2.0) * (hasG ? 1.22 : 0.95);
          const al = (hasG ? 0.58 : 0.26) * (isLight ? 0.72 : 1.0);
          data.push(wx, wy, wz, col[0] / 255, col[1] / 255, col[2] / 255, sz, al);
        }
      }
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.starVbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      this.geo.starCount = data.length / 8;
    }

    drawMesh(mesh, modelMat, accent, active, running, themeIdx, t, edgeAlpha) {
      const gl = this.gl;
      // 1. Shaded PBR Solid Faces
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

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.vertCount);

      // 2. Razor-Sharp Hard-Edge Crease Lines (EdgesGeometry-equivalent!)
      if (mesh.edgeCount > 0 && edgeAlpha > 0.01) {
        const ep = this.edgeProg;
        gl.useProgram(ep.p);
        gl.uniformMatrix4fv(ep.u.uViewProj, false, this.viewProj);
        gl.uniformMatrix4fv(ep.u.uModel, false, modelMat);
        gl.uniform3fv(ep.u.uCamPos, this.camPos);
        gl.uniform3fv(ep.u.uAccent, accent);
        gl.uniform1f(ep.u.uAlpha, edgeAlpha);
        gl.uniform1f(ep.u.uActive, active);
        gl.uniform1f(ep.u.uTheme, themeIdx);

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.ebo);
        gl.disableVertexAttribArray(2);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
        gl.drawArrays(gl.LINES, 0, mesh.edgeCount);
      }
    }

    drawVolumetricPillar(x, y, z, radius, height, accent, strength) {
      const gl = this.gl;
      const vp = this.volProg;
      gl.useProgram(vp.p);
      M4.compose(this.modelMat, x, y, z, 0, 0, 0, radius, height, radius);
      gl.uniformMatrix4fv(vp.u.uViewProj, false, this.viewProj);
      gl.uniformMatrix4fv(vp.u.uModel, false, this.modelMat);
      gl.uniform3fv(vp.u.uCamPos, this.camPos);
      gl.uniform3fv(vp.u.uAccent, accent);
      gl.uniform1f(vp.u.uStrength, strength);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.vol.vbo);
      gl.disableVertexAttribArray(2);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, this.geo.vol.count);
    }

    render(params) {
      const {
        t, themeIdx, entities, activeId, focusedId, bootAge, quiet
      } = params;
      const gl = this.gl;
      const tAnim = quiet ? 4.2 : t;
      const isLight = themeIdx > 1.5;
      const isBlueprint = themeIdx > 0.5 && themeIdx < 1.5;

      // Theme atmospheric palette (Igloo Arctic Obsidian / Deep Cobalt Blueprint / Alabaster Maquette)
      this.fogColor = isLight
        ? [0.918, 0.902, 0.866]
        : isBlueprint
          ? [0.032, 0.074, 0.142]
          : [0.018, 0.028, 0.048];
      const floorCol = isLight
        ? [0.945, 0.933, 0.902]
        : isBlueprint
          ? [0.036, 0.088, 0.168]
          : [0.024, 0.036, 0.056];
      const gridCol = isLight
        ? [0.56, 0.54, 0.50]
        : isBlueprint
          ? [0.46, 0.72, 0.96]
          : [0.42, 0.62, 0.80];

      // ---- PASS 1: RENDER 3D SCENE INTO HDR OFFSCREEN FBO ----
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fbo);
      gl.viewport(0, 0, this.fboW, this.fboH);
      gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // 1A. Deep-Space 3D Truth DAG Starfield (far sky vault)
      if (this.geo.starCount > 0) {
        gl.depthMask(false);
        const sp = this.starProg;
        gl.useProgram(sp.p);
        gl.uniformMatrix4fv(sp.u.uViewProj, false, this.viewProj);
        gl.uniform1f(sp.u.uDpr, this.dpr);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.starVbo);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 24);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 28);
        gl.drawArrays(gl.POINTS, 0, this.geo.starCount);
        gl.disableVertexAttribArray(3);
        gl.depthMask(true);
      }

      // Pack 8 dynamic point lights (1 per monolith) for floor reflection bounce!
      const lPos = new Float32Array(24);
      const lCol = new Float32Array(24);
      const lPow = new Float32Array(8);
      for (let i = 0; i < Math.min(8, entities.length); i++) {
        const e = entities[i];
        lPos[i * 3] = e.x;
        lPos[i * 3 + 1] = (e.y || 0) + (e.eye ? 1.8 : 0.85);
        lPos[i * 3 + 2] = e.z;
        lCol[i * 3] = e.rgb[0] / 255;
        lCol[i * 3 + 1] = e.rgb[1] / 255;
        lCol[i * 3 + 2] = e.rgb[2] / 255;
        lPow[i] = e.eye ? 0.45 : (e.isSel ? 2.4 : e.running ? 1.35 : 0.65);
      }

      // 1B. Infinite Reflective Obsidian / Maquette Floor Plane + fwidth() CAD Grid
      {
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
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.floor.vbo);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.drawArrays(gl.TRIANGLES, 0, this.geo.floor.count);
      }

      // 1C. Extruded 3D Architectural Campus Plinths & Suspended Bridge Spans
      M4.identity(this.modelMat);
      const campusAccent = isLight ? [0.16, 0.48, 0.48] : isBlueprint ? [0.56, 0.82, 1.0] : [0.46, 0.84, 0.94];
      this.drawMesh(this.geo.campus, this.modelMat, campusAccent, activeId === 'verification' ? 0.5 : 0.0, 0.3, themeIdx, tAnim, isLight ? 0.28 : 0.34);

      // 1D. Render all 8 Sculptural Igloo-Style 3D Architectural Monoliths!
      for (const e of entities) {
        const rawBoot = Math.max(0.08, Math.min(1, (bootAge - e.order * 0.025) / 0.32));
        const bootK = 1 - Math.pow(1 - rawBoot, 3);

        const accent = [e.rgb[0] / 255, e.rgb[1] / 255, e.rgb[2] / 255];
        const act = e.isSel ? 1.0 : (focusedId === e.id ? 1.0 : 0.0);
        const run = e.running ? 1.0 : 0.0;
        const edgeA = isLight ? 0.38 : (0.34 + act * 0.32);
        const y0 = e.y || 0;

        // Grounded hex architectural plinth (all except central verification deck & floating direction monolith)
        if (!e.eye && e.id !== 'verification') {
          M4.compose(this.modelMat, e.x, y0 + 0.08, e.z, 0, 0, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.plinth, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.72);
        }

        if (e.id === 'verification') {
          // 00 // CENTRAL CRYSTALLINE OCTAGONAL SPIRE
          const scH = (0.95 + (e.hEntity - 1.44) * 0.25) * bootK;
          M4.compose(this.modelMat, e.x, y0 + 0.04, e.z, 0, tAnim * 0.06, 0, bootK, scH, bootK);
          this.drawMesh(this.geo.verification, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15);
          M4.compose(this.modelMat, e.x, y0 + 0.82 * scH, e.z, Math.sin(tAnim * 0.32) * 0.14, -tAnim * 0.28, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.verRing, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.9);
        } else if (e.id === 'research') {
          // 01 // SUSPENDED FRACTURED OBSIDIAN-CRYSTAL ICOSAHEDRON MONOLITH (Igloo signature!)
          const fy = y0 + 0.98 * bootK + Math.sin(tAnim * 0.9) * 0.05;
          M4.compose(this.modelMat, e.x, fy, e.z, tAnim * 0.14, tAnim * 0.24, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.resShell, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15);
          M4.compose(this.modelMat, e.x, fy, e.z, -tAnim * 0.22, -tAnim * 0.32, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.resCore, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA);
        } else if (e.id === 'review') {
          // 02 // TWIN COUNTER-POISED BRUTALIST MONOLITH SLABS
          M4.compose(this.modelMat, e.x, y0 + 0.18, e.z, 0, 0, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.revBase, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA);
          const sway = Math.sin(tAnim * 0.85) * 0.10;
          M4.compose(this.modelMat, e.x - 0.42 * bootK, y0 + (0.74 + sway) * bootK, e.z, 0, 0.28, 0.06, bootK, bootK, bootK);
          this.drawMesh(this.geo.revSlab, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA);
          M4.compose(this.modelMat, e.x + 0.42 * bootK, y0 + (0.74 - sway) * bootK, e.z, 0, -0.28, -0.06, bootK, bootK, bootK);
          this.drawMesh(this.geo.revSlab, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA);
        } else if (e.id === 'books') {
          // 03 // FLOATING STRATIFIED CRYSTAL ARCHIVE MONOLITH (5 floating archive strata!)
          M4.compose(this.modelMat, e.x, y0 + 0.18, e.z, 0, tAnim * 0.16, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.bookCore, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA);
          for (let lv = 0; lv < 5; lv++) {
            const ly = y0 + (0.34 + lv * 0.185 + Math.sin(tAnim * 1.1 + lv * 0.65) * 0.028) * bootK;
            const sc = (1.0 - lv * 0.07) * bootK;
            M4.compose(this.modelMat, e.x, ly, e.z, 0, lv * 0.12 + Math.sin(tAnim * 0.35 + lv) * 0.08, 0, sc, bootK, sc);
            this.drawMesh(this.geo.bookSlab, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.95);
          }
        } else if (e.id === 'publication') {
          // 04 // TRI-OBELISK STEPPED CRYSTALLINE CLUSTER
          M4.compose(this.modelMat, e.x, y0 + 0.18, e.z, 0, 0.25 + Math.sin(tAnim * 0.2) * 0.08, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.publication, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.05);
        } else if (e.id === 'outreach') {
          // 05 // SCULPTED DEEP-SPACE PARABOLIC RECEIVER MONOLITH
          M4.compose(this.modelMat, e.x, y0 + 0.18, e.z, 0, 0, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.outBase, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA);
          M4.compose(this.modelMat, e.x, y0 + 0.72 * bootK, e.z, 0, tAnim * 0.18, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.outDish, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.05);
        } else if (e.id === 'studio') {
          // 06 // NESTED PRECISION BRUTALIST FOUNDRY CUBE MONOLITH
          const cy3 = y0 + 0.82 * bootK;
          M4.compose(this.modelMat, e.x, cy3, e.z, tAnim * 0.14, tAnim * 0.22, 0.18, bootK, bootK, bootK);
          this.drawMesh(this.geo.stuOuter, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.0);
          M4.compose(this.modelMat, e.x, cy3, e.z, -tAnim * 0.26, -tAnim * 0.34, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.stuInner, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15);
        } else if (e.id === 'direction') {
          // A0 // FLOATING OBSIDIAN DIAMOND ARCHITECT MONOLITH + TWIN TITANIUM GIMBAL RINGS
          const fy = y0 + Math.sin(tAnim * 0.85) * 0.08;
          M4.compose(this.modelMat, e.x, fy, e.z, 0, tAnim * 0.20, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.dirCore, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 1.15);
          M4.compose(this.modelMat, e.x, fy, e.z, Math.sin(tAnim * 0.28) * 0.18, -tAnim * 0.26, 0, bootK, bootK, bootK);
          this.drawMesh(this.geo.dirRing, this.modelMat, accent, act, run, themeIdx, tAnim, edgeA * 0.95);
        }
      }

      // 1E. Subtle Volumetric Atmospheric Light Shafts (Additive soft glass columns — ZERO harsh cones!)
      if (!isLight) {
        gl.depthMask(false);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        const ver = entities.find(e => e.id === 'verification');
        if (ver) {
          this.drawVolumetricPillar(ver.x, (ver.y || 0) + 0.15, ver.z, 0.92, 4.4, [ver.rgb[0] / 255, ver.rgb[1] / 255, ver.rgb[2] / 255], 0.13);
        }
        for (const e of entities) {
          if (e.isSel && !e.eye && e.id !== 'verification') {
            this.drawVolumetricPillar(e.x, (e.y || 0) + 0.12, e.z, 0.78, 3.2, [e.rgb[0] / 255, e.rgb[1] / 255, e.rgb[2] / 255], 0.16);
          }
        }
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(true);
      }

      // ---- PASS 2: SELECTIVE BRIGHT-PASS EXTRACTION (UnrealBloomPass-equivalent!) ----
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      const drawFullQuad = () => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo.quad.vbo);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
      gl.useProgram(this.brightProg.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
      gl.uniform1i(this.brightProg.u.uTex, 0);
      gl.uniform1f(this.brightProg.u.uThreshold, isLight ? 0.95 : 0.42);
      drawFullQuad();

      // ---- PASS 3 & 4: DUAL-PASS SEPARABLE GAUSSIAN BLOOM (H + V × 2 iterations) ----
      gl.useProgram(this.blurProg.p);
      gl.uniform1i(this.blurProg.u.uTex, 0);
      for (let pass = 0; pass < 2; pass++) {
        const spread = pass === 0 ? 1.25 : 2.35;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
        gl.uniform2f(this.blurProg.u.uDir, spread / this.bloomA.w, 0);
        drawFullQuad();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
        gl.uniform2f(this.blurProg.u.uDir, 0, spread / this.bloomA.h);
        drawFullQuad();
      }

      // ---- PASS 5: FINAL CINEMA COMPOSITE (ACES Filmic + Bloom + Subtle CA + Vignette + Film Grain) ----
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
      gl.uniform1f(this.compProg.u.uBloomStrength, isLight ? 0.14 : (isBlueprint ? 0.56 : 0.62));
      drawFullQuad();
    }
  }

  window.TrureGL = TrureGL;
})();
