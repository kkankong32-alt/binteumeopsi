import pc from "polygon-clipping";
export type V = [number, number];
export type Poly = V[];
export type Multi = pc.MultiPolygon;
export type Tile = { id: string; p: Poly; kind: number };
export type Box = { x: number; y: number; w: number; h: number };
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const cross = (a: V, b: V) => a[0] * b[1] - a[1] * b[0];
export const signed = (p: Poly) =>
  p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0) / 2;
export const area = (p: Poly) => Math.abs(signed(p));
export const center = (p: Poly): V => [
  p.reduce((s, v) => s + v[0], 0) / p.length,
  p.reduce((s, v) => s + v[1], 0) / p.length,
];
export const move = (p: Poly, t: V) => p.map((v) => add(v, t));
export function transform(
  p: Poly,
  angle = 0,
  scale = 1,
  flip = false,
  c = center(p),
): Poly {
  const a = (angle * Math.PI) / 180;
  return p.map((v) => {
    let x = (v[0] - c[0]) * scale * (flip ? -1 : 1),
      y = (v[1] - c[1]) * scale;
    return [
      c[0] + x * Math.cos(a) - y * Math.sin(a),
      c[1] + x * Math.sin(a) + y * Math.cos(a),
    ];
  });
}
export const boxPoly = (b: Box): Poly => [
  [b.x, b.y],
  [b.x + b.w, b.y],
  [b.x + b.w, b.y + b.h],
  [b.x, b.y + b.h],
];
export function bounds(p: Poly): Box {
  let xs = p.map((v) => v[0]),
    ys = p.map((v) => v[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
function on(a: V, b: V, p: V) {
  return (
    Math.abs(cross(sub(b, a), sub(p, a))) < 1e-8 &&
    p[0] >= Math.min(a[0], b[0]) - 1e-8 &&
    p[0] <= Math.max(a[0], b[0]) + 1e-8 &&
    p[1] >= Math.min(a[1], b[1]) - 1e-8 &&
    p[1] <= Math.max(a[1], b[1]) + 1e-8
  );
}
function intersects(a: V, b: V, c: V, d: V) {
  let x = cross(sub(b, a), sub(c, a)),
    y = cross(sub(b, a), sub(d, a)),
    z = cross(sub(d, c), sub(a, c)),
    w = cross(sub(d, c), sub(b, c));
  return (
    (x * y < 0 && z * w < 0) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
export function valid(p: Poly): boolean {
  if (
    !Array.isArray(p) ||
    p.length < 3 ||
    p.length > 512 ||
    p.some(
      (v) =>
        !Array.isArray(v) ||
        v.length !== 2 ||
        v.some((n) => !Number.isFinite(n) || Math.abs(n) > 100000),
    )
  )
    return false;
  if (area(p) < 1 || p.some((v, i) => dist(v, p[(i + 1) % p.length]) < 0.05))
    return false;
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      if (intersects(p[i], p[(i + 1) % p.length], p[j], p[(j + 1) % p.length]))
        return false;
    }
  return true;
}
export function regular(n: number, r = 74, c: V = [0, 0], rot = -90): Poly {
  return Array.from({ length: n }, (_, i) => [
    c[0] + r * Math.cos(((rot + (i * 360) / n) * Math.PI) / 180),
    c[1] + r * Math.sin(((rot + (i * 360) / n) * Math.PI) / 180),
  ]);
}
export function angles(p: Poly) {
  const sign = Math.sign(signed(p));
  return p.map((b, i) => {
    const a = sub(p[(i + p.length - 1) % p.length], b),
      c = sub(p[(i + 1) % p.length], b);
    const base =
      (Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            (a[0] * c[0] + a[1] * c[1]) / (Math.hypot(...a) * Math.hypot(...c)),
          ),
        ),
      ) *
        180) /
      Math.PI;
    return cross(a, c) * sign > 0 ? 360 - base : base;
  });
}
export function isRegular(p: Poly) {
  if (!valid(p)) return false;
  const l = p.map((v, i) => dist(v, p[(i + 1) % p.length])),
    a = angles(p);
  return (
    Math.max(...l) - Math.min(...l) < Math.max(...l) * 1e-6 &&
    Math.max(...a) - Math.min(...a) < 1e-5
  );
}
export function diagonals(n: number) {
  let r: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++)
      if (!(i === 0 && j === n - 1)) r.push([i, j]);
  return r;
}
export function inside(v: V, p: Poly) {
  let yes = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    let a = p[i],
      b = p[j];
    if (
      a[1] > v[1] !== b[1] > v[1] &&
      v[0] < ((b[0] - a[0]) * (v[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
export const multiArea = (m: Multi) =>
  m.reduce(
    (s, p) =>
      s + p.reduce((t, r, i) => t + (i === 0 ? 1 : -1) * area(r as Poly), 0),
    0,
  );
export const multi = (p: Poly): Multi => [
  [
    [...p, p[0]].map((v) => [
      Math.round(v[0] * 1e7) / 1e7,
      Math.round(v[1] * 1e7) / 1e7,
    ]),
  ],
];
export function coverage(polys: Poly[], target: Multi) {
  const total = multiArea(target),
    tol = Math.max(1e-6, total * 1e-8);
  let sum = 0,
    out = 0,
    U: Multi = [],
    over: Multi = [];
  for (const p of polys) {
    if (!valid(p)) throw Error("올바르지 않은 도형입니다.");
    const c = pc.intersection(multi(p), target);
    sum += multiArea(c);
    out += Math.max(0, area(p) - multiArea(c));
    if (c.length) {
      const o = U.length ? pc.intersection(U, c) : [];
      if (o.length) over = over.length ? pc.union(over, o) : o;
      U = U.length ? pc.union(U, c) : c;
    }
  }
  const gap = pc.difference(target, U),
    gapArea = multiArea(gap),
    overlapArea = Math.max(0, sum - multiArea(U));
  return {
    gap,
    over,
    gapArea,
    overlapArea,
    outsideArea: out,
    coverage: multiArea(U) / total,
    tol,
    ok: gapArea <= tol && overlapArea <= tol,
  };
}
export function union(polys: Poly[]): Multi {
  return pc.union(...(polys.map(multi) as [Multi, ...Multi[]]));
}
type Quadratic = { start: V; control: V; end: V };
export function quadraticSegments(points: V[], start: V, end: V): Quadratic[] {
  if (!points.length)
    return [
      {
        start,
        control: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
        end,
      },
    ];
  let at = start;
  return points.map((control, i) => {
    const finish: V =
      i === points.length - 1
        ? end
        : [
            (control[0] + points[i + 1][0]) / 2,
            (control[1] + points[i + 1][1]) / 2,
          ];
    const segment = { start: at, control, end: finish };
    at = finish;
    return segment;
  });
}
// The control polygon bounds the quadratic. Recursively subdivide until its
// distance from the chord is <= 0.05 world units; translated sides reuse points.
function flattenQuadratics(segments: Quadratic[]): V[] {
  const out: V[] = [];
  const midpoint = (a: V, b: V): V => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const visit = (
    { start: a, control: c, end: b }: Quadratic,
    depth: number,
  ) => {
    const chord = sub(b, a),
      length = Math.hypot(...chord);
    const t =
      length > 1e-12
        ? Math.max(
            0,
            Math.min(
              1,
              ((c[0] - a[0]) * chord[0] + (c[1] - a[1]) * chord[1]) /
                (length * length),
            ),
          )
        : 0;
    const error = dist(c, [a[0] + t * chord[0], a[1] + t * chord[1]]);
    if (error <= 0.05) {
      out.push(b);
      return;
    }
    if (depth >= 12) throw Error("곡선의 굽힘이 너무 큽니다.");
    const ac = midpoint(a, c),
      cb = midpoint(c, b),
      mid = midpoint(ac, cb);
    visit({ start: a, control: ac, end: mid }, depth + 1);
    visit({ start: mid, control: cb, end: b }, depth + 1);
  };
  segments.forEach((s) => visit(s, 0));
  return out.slice(0, -1);
}
export function escherCurvePath(top: V[], left: V[], size = 120): string {
  const t = quadraticSegments(top, [0, 0], [size, 0]);
  const l = quadraticSegments(left, [0, 0], [0, size]);
  const command = (s: Quadratic, offset: V, reverse = false) =>
    `Q${add(s.control, offset)} ${add(reverse ? s.start : s.end, offset)}`;
  return `M0,0${t.map((s) => command(s, [0, 0])).join("")}${l.map((s) => command(s, [size, 0])).join("")}${t
    .slice()
    .reverse()
    .map((s) => command(s, [0, size], true))
    .join("")}${l
    .slice()
    .reverse()
    .map((s) => command(s, [0, 0], true))
    .join("")}Z`;
}
export function escher(top: V[], left: V[], size = 120, curved = false): Poly {
  if (curved) {
    top = flattenQuadratics(quadraticSegments(top, [0, 0], [size, 0]));
    left = flattenQuadratics(quadraticSegments(left, [0, 0], [0, size]));
  }
  return [
    [0, 0],
    ...top,
    [size, 0],
    ...left.map((v) => add(v, [size, 0])),
    [size, size],
    ...top
      .slice()
      .reverse()
      .map((v) => add(v, [0, size])),
    [0, size],
    ...left.slice().reverse(),
  ];
}
export function tilePattern(p: Poly, kind: string, b: Box, cap = 2500): Tile[] {
  if (!valid(p)) throw Error("꼭짓점이 교차하거나 너무 납작합니다.");
  let u: V,
    v: V,
    bases: Poly[] = [p];
  if (kind === "mixed8") {
    const L = 160,
      a = L / (2 + Math.SQRT2),
      h = L / 2;
    u = [L, 0];
    v = [0, L];
    bases = [
      [
        [-h + a, -h],
        [h - a, -h],
        [h, -h + a],
        [h, h - a],
        [h - a, h],
        [-h + a, h],
        [-h, h - a],
        [-h, -h + a],
      ],
      [
        [h, h - a],
        [h + a, h],
        [h, h + a],
        [h - a, h],
      ],
    ];
  } else if (kind === "mixed6") {
    const s = 65,
      h = (Math.sqrt(3) * s) / 2;
    u = [2 * s, 0];
    v = [s, 2 * h];
    bases = [
      regular(6, s, [0, 0], 0),
      [
        [s, 0],
        [1.5 * s, h],
        [0.5 * s, h],
      ],
      [
        [1.5 * s, h],
        [2.5 * s, h],
        [2 * s, 2 * h],
      ],
    ];
  } else if (kind === "escher") {
    u = [120, 0];
    v = [0, 120];
  } else if (kind === "hex" && isRegular(p)) {
    u = sub(p[2], p[0]);
    v = sub(p[3], p[1]);
  } else if (p.length === 4) {
    u = sub(p[2], p[0]);
    v = sub(p[3], p[1]);
    bases = [p, p.map((q) => sub(add(p[0], p[1]), q))];
  } else if (p.length === 3) {
    u = sub(p[1], p[0]);
    v = sub(p[2], p[0]);
    bases = [p, p.map((q) => sub(add(p[1], p[2]), q))];
  } else {
    const bb = bounds(p);
    u = [bb.w + 12, 0];
    v = [0, bb.h + 12];
  }
  const det = cross(u, v);
  if (Math.abs(det) < 1) throw Error("반복 단위가 너무 좁습니다.");
  const bb = bounds(bases.flat()),
    corners = boxPoly({
      x: b.x - bb.x - bb.w,
      y: b.y - bb.y - bb.h,
      w: b.w + bb.w * 2,
      h: b.h + bb.h * 2,
    });
  const ij = corners.map((q) => [cross(q, v) / det, cross(u, q) / det]);
  let imin = Math.floor(Math.min(...ij.map((q) => q[0]))) - 1,
    imax = Math.ceil(Math.max(...ij.map((q) => q[0]))) + 1,
    jmin = Math.floor(Math.min(...ij.map((q) => q[1]))) - 1,
    jmax = Math.ceil(Math.max(...ij.map((q) => q[1]))) + 1;
  if ((imax - imin) * (jmax - jmin) * bases.length > cap * 8)
    throw Error("너무 많은 타일입니다. 화면을 확대해 주세요.");
  const result: Tile[] = [];
  for (let i = imin; i <= imax; i++)
    for (let j = jmin; j <= jmax; j++)
      for (let k = 0; k < bases.length; k++) {
        let q = move(bases[k], [i * u[0] + j * v[0], i * u[1] + j * v[1]]),
          r = bounds(q);
        if (
          r.x + r.w < b.x ||
          r.x > b.x + b.w ||
          r.y + r.h < b.y ||
          r.y > b.y + b.h
        )
          continue;
        result.push({
          id: `${i}:${j}:${k}`,
          p: q,
          kind: (((i + j + k) % 4) + 4) % 4,
        });
        if (result.length > cap)
          throw Error("타일 수 제한입니다. 확대해 주세요.");
      }
  return result;
}
export function snap(
  moving: Poly[],
  fixed: Poly[],
  radius: number,
): { polys: Poly[]; snapped: boolean } {
  let best: Poly[] | null = null,
    score = Infinity;
  for (const p of moving)
    for (let i = 0; i < p.length; i++)
      for (const q of fixed)
        for (let j = 0; j < q.length; j++) {
          const a = p[i],
            b = p[(i + 1) % p.length],
            c = q[(j + 1) % q.length],
            d = q[j];
          if (
            Math.abs(dist(a, b) - dist(c, d)) >
            Math.max(1e-6, dist(a, b) * 1e-6)
          )
            continue;
          let s = Math.max(dist(a, c), dist(b, d));
          if (s > radius || s >= score) continue;
          const ang =
            ((Math.atan2(d[1] - c[1], d[0] - c[0]) -
              Math.atan2(b[1] - a[1], b[0] - a[0])) *
              180) /
            Math.PI;
          const next = moving.map((poly) =>
            move(transform(poly, ang, 1, false, a), sub(c, a)),
          );
          if (
            next.some((poly) =>
              fixed.some(
                (f) => multiArea(pc.intersection(multi(poly), multi(f))) > 1e-5,
              ),
            )
          )
            continue;
          best = next;
          score = s;
        }
  return { polys: best || moving, snapped: !!best };
}
