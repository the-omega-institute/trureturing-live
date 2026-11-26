// Local, y-up geometry shared by the station's WebGL and Canvas renderers.
'use strict';
const StationModels = (() => {
  const { sin, cos, PI } = Math;
  const turn = 2 * PI;
  const colors = { cyan: [79, 193, 205], violet: [150, 127, 208], amber: [249, 181, 92] };

  // Crystal and titanium use the original finishes. Material 4 is an inlaid light.
  function finish(tint, material, rgb) {
    const shades = Array.from({ length: 12 }, (_, i) => {
      const light = material === 4 ? 1 : 0.46 + i / 14;
      return 'rgb(' + rgb.map(v => Math.round(v * light)).join(',') + ')';
    });
    return { tint, material, shades };
  }
  const alloy = finish('cyan', 2, [111, 148, 169]);
  const teal = finish('cyan', 1, [42, 113, 125]);
  const violet = finish('violet', 1, [91, 79, 135]);
  const ice = finish('cyan', 4, [108, 229, 227]);
  const iris = finish('violet', 4, [177, 161, 241]);
  const gold = finish('amber', 4, colors.amber);
  const bronze = finish('amber', 2, [171, 134, 85]);
  const paperFolds = [
    finish('cyan', 5, [60, 132, 151]), alloy,
    finish('violet', 5, [93, 99, 151]), alloy
  ];

  function rotate([x, y, z], pitch, roll) {
    const h = y * cos(pitch) - z * sin(pitch);
    return [x * cos(roll) - h * sin(roll), x * sin(roll) + h * cos(roll), y * sin(pitch) + z * cos(pitch)];
  }

  // Share section vertices, including the closing seam. Each Canvas vertex then
  // needs just one projection per frame, however many panels meet at that point.
  function mesh() {
    return { vertices: [], faces: [] };
  }
  function vertex(model, point) {
    return model.vertices.push(point) - 1;
  }
  function panel(model, indices, finish) {
    model.faces.push({ indices, finish });
  }
  function band(model, segments, section, finishes) {
    const rings = Array.from({ length: segments }, (_, i) =>
      section(turn * i / segments).map(p => vertex(model, p)));
    for (let i = 0; i < segments; i++) {
      const current = rings[i], next = rings[(i + 1) % segments];
      for (let j = 0; j < current.length; j++) {
        const k = (j + 1) % current.length;
        panel(model, [current[j], current[k], next[k], next[j]], finishes[j]);
      }
    }
  }

  // Three fibres above equally spaced longitudes on S², stereographically
  // projected from S³. Offset the fibre parameters to give each band a bevel.
  function hopfStation(coarse) {
    const model = mesh();
    const profile = coarse
      ? [[-1, -.04], [.74, -.055], [1, .025], [-1, .04]]
      : [[-1, -.012], [-.78, -.060], [.72, -.060], [1, -.028], [1, .044], [-1, .044]];
    for (let i = 0; i < 3; i++) {
      const longitude = .28 + i * turn / 3;
      const skin = i === 1 ? violet : teal;
      const rim = i === 1 ? iris : ice;
      const finishes = coarse ? [skin, rim, alloy, skin] : [alloy, skin, rim, alloy, skin, alloy];
      band(model, coarse ? 16 : 36, phase => profile.map(([offset, wall]) => {
        const latitude = .96 + wall;
        const radius = .74 / (1 - cos(latitude) * sin(phase));
        const azimuth = phase + longitude + .24 * offset;
        return rotate([radius * sin(latitude) * cos(azimuth), radius * cos(latitude) * cos(phase),
          -radius * sin(latitude) * sin(azimuth)], -.16, -.10);
      }), finishes);
    }

    return model;
  }

  // The caps' axes are 68 degrees apart. Boundary points of the lens satisfy
  // both cap inequalities, with equality on one or both of their small circles.
  function consensusLens(coarse) {
    const model = mesh();
    const tilt = 34 * PI / 180, aperture = 58 * PI / 180;
    const mount = p => rotate(p.map(x => 1.06 * x), .70, -.18);
    const profile = coarse
      ? [[-.24, 1], [-.04, 1.09], [0, 1], [-.24, .97]]
      : [[-.25, 1], [-.21, 1.08], [-.045, 1.09], [0, 1.02], [0, .97], [-.25, .97]];
    for (const sign of [-1, 1]) {
      const skin = sign < 0 ? teal : violet;
      const rim = sign < 0 ? ice : iris;
      const finishes = coarse ? [skin, rim, alloy, skin] : [alloy, skin, rim, alloy, skin, alloy];
      band(model, coarse ? 16 : 32, phase => profile.map(([offset, radius]) => {
        const angle = aperture + offset;
        const along = cos(angle), across = sin(angle) * cos(phase);
        return mount([radius * (sign * sin(tilt) * along + cos(tilt) * across),
          radius * (cos(tilt) * along - sign * sin(tilt) * across), radius * sin(angle) * sin(phase)]);
      }), finishes);
    }
    const end = Math.acos(cos(aperture) / cos(tilt));
    const slices = coarse ? 6 : 14;
    const ribs = [-1, -.10, .10, 1];
    const start = vertex(model, mount([0, cos(end), -sin(end)]));
    const tip = vertex(model, mount([0, cos(end), sin(end)]));
    let previous = null;
    for (let i = 1; i < slices; i++) {
      const latitude = (2 * i / slices - 1) * end;
      const w = cos(latitude), span = Math.acos(cos(aperture) / w) - tilt;
      const row = ribs.map(v => vertex(model, mount([w * sin(v * span), w * cos(v * span), sin(latitude)])));
      for (let j = 0; j < ribs.length - 1; j++) {
        const paint = [violet, gold, teal][j];
        panel(model, previous ? [previous[j], row[j], row[j + 1], previous[j + 1]] : [start, row[j], row[j + 1]], paint);
        if (i === slices - 1) panel(model, [row[j], tip, row[j + 1]], paint);
      }
      previous = row;
    }
    return model;
  }

  // The angular basis of noumRadius in the book's noumenon-breath preset.
  // Directions are y-up here. Cache the spatial terms for the Canvas path.
  function breathingSurface(coarse) {
    const model = mesh();
    const sectors = coarse ? 12 : 30;
    const latitudes = coarse ? 7 : 15;
    const north = vertex(model, [0, 1, 0]);
    const rows = [];
    for (let i = 1; i < latitudes; i++) {
      const theta = PI * i / latitudes;
      rows.push(Array.from({ length: sectors }, (_, j) => {
        const az = turn * j / sectors;
        return vertex(model, [sin(theta) * cos(az), cos(theta), sin(theta) * sin(az)]);
      }));
    }
    const south = vertex(model, [0, -1, 0]);
    for (let j = 0; j < sectors; j++) {
      const k = (j + 1) % sectors;
      panel(model, [north, rows[0][k], rows[0][j]], alloy);
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        const az = turn * (j + .5) / sectors;
        const value = .50 + .25 * sin(PI * i / latitudes) * cos(3 * (az - PI / 6)) - .45 * cos(PI * i / latitudes);
        const paint = value > .72 ? bronze : value < .28 ? violet : teal;
        panel(model, [a[j], a[k], b[k], b[j]], paint);
      }
      panel(model, [rows.at(-1)[j], rows.at(-1)[k], south], bronze);
    }
    if (coarse) {
      model.breathBasis = model.vertices.map(([x, y, z]) => [
        .18 * z * (3 * x * x - z * z),
        -.18 * x * (x * x - 3 * z * z),
        .18 * y * Math.hypot(x, z)
      ]);
    }
    return model;
  }

  // Triangulate a folded page as a disk. Oppositely directed internal edges
  // cancel; only the actual boundary receives the gold binding.
  function foldedPage() {
    const model = mesh();
    const lengths = [1.35, .99, 1.71, 1.20, 1.97, 1.36, 1.91, 1.14, 1.51];
    const root = vertex(model, [-.22, 0, .20]);
    const rows = [.42, .74, 1].map(u => lengths.map((length, j) => {
      const angle = -.99 + j * .228;
      const radius = u * length;
      return vertex(model, [-.22 + radius * (sin(angle) + .16 * u),
        radius * cos(angle) * .91,
        .20 + u * (j % 2 ? -.39 : .27) - .44 * u * u + .18 * u * sin(angle)]);
    }));
    const boundary = new Map();
    function facet(a, b, c, paint) {
      panel(model, [a, b, c], paint);
      for (const [from, to] of [[a, b], [b, c], [c, a]]) {
        const reverse = to + '/' + from;
        if (!boundary.delete(reverse)) boundary.set(from + '/' + to, [from, to]);
      }
    }
    for (let j = 0; j < lengths.length - 1; j++) {
      const k = j + 1;
      const paint = paperFolds[j % paperFolds.length];
      facet(root, rows[0][j], rows[0][k], paint);
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        facet(a[j], b[j], b[k], paint);
        facet(a[j], b[k], a[k], paint);
      }
    }
    const front = model.faces.slice();
    const back = model.vertices.map(([x, y, z]) => vertex(model, [x, y, z - .085]));
    for (const face of front) panel(model, face.indices.map(i => back[i]).reverse(), face.finish);
    for (const [a, b] of boundary.values()) panel(model, [b, a, back[a], back[b]], gold);
    return model;
  }

  // On the astrolabe, the two ends of a Bloch measurement axis are antipodes.
  const dialAngle = PI / 6;
  const dialPoles = [dialAngle, dialAngle + PI];

  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const icoVertices = [
    [-1,goldenRatio,0], [1,goldenRatio,0], [-1,-goldenRatio,0], [1,-goldenRatio,0],
    [0,-1,goldenRatio], [0,1,goldenRatio], [0,-1,-goldenRatio], [0,1,-goldenRatio],
    [goldenRatio,0,-1], [goldenRatio,0,1], [-goldenRatio,0,-1], [-goldenRatio,0,1]
  ].map(p => p.map(x => x / Math.hypot(1, goldenRatio)));
  const icoFaces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
  ];
  const icosahedron = { vertices: icoVertices, faces: icoFaces };

  // A page carries the Taylor polynomial for exp(x) in Q[x]/(x^(n+1)).
  const jetPages = Array.from({ length: 5 }, (_, order) => {
    const trace = Array.from({ length: 13 }, (_, i) => {
      const x = i / 6 - 1;
      let term = 1, sum = 1;
      for (let k = 1; k <= order; k++) {
        term *= x / k;
        sum += term;
      }
      return [x, sum];
    });
    return { order, trace };
  });

  // Multiplying a Cl(3,0) basis blade by a generator toggles one mask bit.
  // The reflected Gray cycle picks a closed route through all eight masks.
  const bladeCorners = Array.from({ length: 8 }, (_, mask) =>
    [1, 2, 4].map(bit => (mask & bit) ? 1 : -1));
  const grayOrder = Array.from({ length: 8 }, (_, n) => n ^ (n >> 1));
  const bladeEdges = [];
  for (const [mask, from] of bladeCorners.entries()) {
    for (const [axis, bit] of [1, 2, 4].entries()) {
      if (mask & bit) continue;
      const toMask = mask ^ bit;
      const distance = Math.abs(grayOrder.indexOf(mask) - grayOrder.indexOf(toMask));
      bladeEdges.push({ mask, toMask, from, to: bladeCorners[toMask], axis, lit: distance === 1 || distance === 7 });
    }
  }
  const stations = {
    verification: { build: hopfStation, lift: .79, speed: -.20 },
    outreach: { build: consensusLens, lift: 1.07, speed: .09 },
    publication: { build: foldedPage, lift: .27, speed: .07 },
    review: { build: breathingSurface, lift: 1.05, speed: 0 }
  };
  const ids = Object.keys(stations);
  const cache = new Map();
  function get(id, coarse = false) {
    const key = id + (coarse ? '-canvas' : '-gl');
    if (!cache.has(key)) {
      const { build, lift, speed } = stations[id];
      const model = build(coarse);
      if (coarse) {
        for (const face of model.faces) {
          const [a, b, c] = face.indices.map(index => model.vertices[index]);
          const [ux, uy, uz] = b.map((v, i) => v - a[i]);
          const [vx, vy, vz] = c.map((v, i) => v - a[i]);
          const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
          const length = Math.hypot(...n);
          face.normal = n.map(v => v / length);
        }
      }
      cache.set(key, { ...model, lift, speed });
    }
    return cache.get(key);
  }
  return { colors, ids, get, dialPoles, icosahedron, jetPages, bladeCorners, bladeEdges };
})();
