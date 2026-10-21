import { describe, it, expect } from "vitest";
import {
  regular,
  tilePattern,
  coverage,
  multi,
  boxPoly,
  valid,
  area,
  isRegular,
  diagonals,
  transform,
  escher,
  move,
  snap,
  type Poly,
} from "../src/geometry";
import {
  fresh,
  parseProject,
  serialize,
  modelHash,
  levels,
  shapes,
} from "../src/model";
const box = { x: -220, y: -220, w: 440, h: 440 };
function check(p: Poly, kind = "quad") {
  const tiles = tilePattern(p, kind, box);
  const c = coverage(
    tiles.map((t) => t.p),
    multi(boxPoly(box)),
  );
  expect(c.gapArea).toBeLessThanOrEqual(c.tol);
  expect(c.overlapArea).toBeLessThanOrEqual(c.tol);
  return c;
}
describe("exact tiling", () => {
  for (const k of [
    "quad",
    "square",
    "rectangle",
    "rhombus",
    "trapezoid",
    "triangle",
    "hex",
  ])
    it(k, () => check(shapes[k].p, shapes[k].kind));
  for (const [i, p] of (
    [
      [
        [0, 0],
        [140, 0],
        [25, 25],
        [0, 100],
      ],
      [
        [0, 0],
        [150, 10],
        [110, 25],
        [10, 20],
      ],
      [
        [0, 0],
        [100, 0],
        [40, 120],
      ],
      [
        [0, 0],
        [80, 0],
        [-40, 30],
      ],
    ] as Poly[]
  ).entries())
    it("concave/skew/triangle " + i, () =>
      check(p, p.length === 3 ? "triangle" : "quad"),
    );
  let seed = 12345;
  const rand = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const generated: Poly[] = [];
  for (let i = 0; i < 100; i++) {
    const p: Poly = [
      [0, 0],
      [80 + rand() * 90, rand() * 10],
      [70 + rand() * 70, 80 + rand() * 70],
      [rand() * 20, 60 + rand() * 70],
    ];
    if (i % 3 === 0) p[2] = [25 + rand() * 15, 25 + rand() * 15];
    generated.push(p);
  }
  generated.forEach((p, i) =>
    it("seed 12345 quad " + i, () => {
      expect(valid(p)).toBe(true);
      check(p);
    }),
  );
  for (const n of [5, 7, 8])
    it("reject regular " + n, () => {
      const c = coverage(
        tilePattern(regular(n), "regular", box).map((t) => t.p),
        multi(boxPoly(box)),
      );
      expect(c.ok).toBe(false);
    });
  for (let i = 0; i < 12; i++)
    it("escher paired boundary " + i, () => {
      const p = escher(
        [
          [40, Math.sin(i) * 18],
          [80, Math.cos(i) * 15],
        ],
        [
          [Math.cos(i) * 14, 40],
          [Math.sin(i) * 17, 80],
        ],
      );
      check(p, "escher");
    });
});
describe("geometry and snap", () => {
  it("degenerate and crossing rejected", () => {
    expect(
      valid([
        [0, 0],
        [100, 100],
        [0, 100],
        [100, 0],
      ]),
    ).toBe(false);
    expect(
      valid([
        [0, 0],
        [0, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(
      valid([
        [0, 0],
        [Infinity, 1],
        [1, 1],
      ]),
    ).toBe(false);
  });
  it("both regular conditions", () => {
    expect(isRegular(shapes.rhombus.p)).toBe(false);
    expect(isRegular(shapes.rectangle.p)).toBe(false);
    expect(isRegular(shapes.square.p)).toBe(true);
  });
  it("diagonals", () =>
    expect([3, 4, 5, 6, 7, 8].map((n) => diagonals(n).length)).toEqual([
      0, 2, 5, 9, 14, 20,
    ]));
  it("transform area", () => {
    const p = regular(6);
    expect(area(transform(p, 37, 2, true))).toBeCloseTo(area(p) * 4, 6);
    expect(isRegular(transform(p, 37, 2, true))).toBe(true);
  });
  it("shared edge, one unit gap and overlap", () => {
    const a = boxPoly({ x: 0, y: 0, w: 100, h: 100 }),
      b = move(a, [100, 0]),
      w = multi(boxPoly({ x: 0, y: 0, w: 200, h: 100 }));
    expect(coverage([a, b], w).ok).toBe(true);
    expect(coverage([a, move(b, [1, 0])], w).gapArea).toBeCloseTo(100);
    expect(coverage([a, move(b, [-1, 0])], w).overlapArea).toBeCloseTo(100);
  });
  it("edge snap rejects unequal and overlap", () => {
    const a = boxPoly({ x: 0, y: 0, w: 100, h: 100 }),
      b = move(a, [103, 2]);
    const r = snap([b], [a], 14);
    expect(r.snapped).toBe(true);
    expect(r.polys[0][0]).toEqual([100, 0]);
    expect(snap([transform(b, 0, 0.8)], [a], 14).snapped).toBe(false);
    expect(snap([move(a, [3, 3])], [a], 14).snapped).toBe(false);
  });
});
describe("18 puzzles", () => {
  levels.forEach((l, i) => {
    it("solution " + i, () => {
      const r = coverage(l.solution, l.target);
      expect(r.ok).toBe(true);
      expect(r.outsideArea).toBeLessThanOrEqual(r.tol);
    });
    it("missing/outside " + i, () => {
      expect(coverage(l.solution.slice(1), l.target).ok).toBe(false);
      expect(
        coverage(
          l.solution.map((p) => move(p, [1000, 0])),
          l.target,
        ).outsideArea,
      ).toBeGreaterThan(0);
    });
  });
  it("alternative piece permutation accepted", () =>
    expect(
      coverage([...levels[0].solution].reverse(), levels[0].target).ok,
    ).toBe(true));
});
describe("project", () => {
  it("complete model exact roundtrip", () => {
    let p = fresh();
    p.showroom = {
      scene: "floor",
      material: "glass",
      scale: 1.5,
      rotation: 30,
      x: 0.5,
      y: -0.4,
      camera: 2,
    };
    p.style.decoration = "stripe";
    p.style.colors["0:0:0"] = "#ff0000";
    expect(modelHash(parseProject(serialize(p)))).toEqual(modelHash(p));
  });
  it("migration", () => {
    const p = { ...fresh(), schemaVersion: 0 };
    expect(parseProject(JSON.stringify(p)).schemaVersion).toBe(1);
  });
  for (const data of ["", "{}", '{"format":"bad"}', "x".repeat(2000001)])
    it("malformed " + data.length, () =>
      expect(() => parseProject(data)).toThrow(),
    );
  it("bad coords rejected", () => {
    const p = fresh();
    p.vertices = [
      [0, 0],
      [10, 10],
      [0, 10],
      [10, 0],
    ];
    expect(() => parseProject(serialize(p))).toThrow();
  });
  it("camera bounds", () => {
    const p = fresh();
    p.camera.zoom = 1e12;
    expect(() => parseProject(serialize(p))).toThrow();
  });
});
it("mixed squares octagons", () => check(shapes.mixed8.p, "mixed8"));
it("mixed triangles hexagons", () => check(shapes.mixed6.p, "mixed6"));
it("snap two pieces as one rigid group", () => {
  const a = boxPoly({ x: 0, y: 0, w: 100, h: 100 });
  const fixed = move(a, [0, 100]);
  const r = snap([move(a, [2, 3]), move(a, [102, 3])], [fixed], 14);
  expect(r.snapped).toBe(true);
  expect(r.polys[0]).toEqual(a);
  expect(r.polys[1]).toEqual(move(a, [100, 0]));
});
it("reflected quad tiling remains covered", () =>
  check(transform(shapes.quad.p, 27, 1.3, true)));
it("invalid period rejected", () => {
  const p = fresh();
  p.style.period = 1.5;
  expect(() => parseProject(serialize(p))).toThrow();
});
it("project type color and corner preserved", () => {
  const p = fresh();
  p.style.typeColors["4"] = "#123456";
  p.style.join = "bevel";
  expect(modelHash(parseProject(serialize(p)))).toEqual(modelHash(p));
});
it("teacher mission proof accepted, unsolved proof rejected", async () => {
  const { parseMission } = await import("../src/model");
  const m = { format: "binteumeopsi-mission", schemaVersion: 1, ...levels[7] };
  expect(parseMission(JSON.stringify(m)).solution).toEqual(m.solution);
  expect(() =>
    parseMission(JSON.stringify({ ...m, solution: m.solution.slice(1) })),
  ).toThrow();
});
it("custom mission survives project roundtrip", () => {
  const p = fresh();
  p.puzzle.custom = { ...levels[7], difficulty: "직접 만든 미션" };
  expect(modelHash(parseProject(serialize(p)))).toEqual(modelHash(p));
});
for (let i = 0; i < 12; i++)
  it("paired curved Escher " + i, () => {
    check(
      escher(
        [
          [40, Math.sin(i) * 20],
          [80, Math.cos(i) * 16],
        ],
        [
          [Math.cos(i) * 18, 40],
          [Math.sin(i) * 15, 80],
        ],
        120,
        true,
      ),
      "escher",
    );
  });
it("curved project and vector decoration roundtrip", () => {
  const p = fresh();
  p.kind = "escher";
  p.escher.curved = true;
  p.vertices = escher(p.escher.top, p.escher.left, 120, true);
  p.decorations = [
    {
      id: "eye",
      type: "eye",
      x: 60,
      y: 60,
      size: 10,
      rotation: 0,
      color: "#123456",
    },
  ];
  expect(modelHash(parseProject(serialize(p)))).toEqual(modelHash(p));
});
it("hidden decoration layer survives import", () => {
  const p = fresh();
  p.layers = ["pattern"];
  expect(parseProject(serialize(p)).layers).toEqual(["pattern"]);
});
it("reflected curved Escher exact coverage", () => {
  const p = fresh();
  const top = p.escher.top
      .slice()
      .reverse()
      .map((v) => [120 - v[0], v[1]] as [number, number]),
    left = p.escher.left.map((v) => [-v[0], v[1]] as [number, number]);
  check(escher(top, left, 120, true), "escher");
});
it("genuinely alternative rhombus solution accepted", () => {
  const l = levels[8];
  const alternative = l.solution.map((p) =>
    transform(p, 60, 1, false, [-40, -20]),
  );
  const r = coverage(alternative, l.target);
  expect(r.ok).toBe(true);
  expect(r.outsideArea).toBeLessThanOrEqual(r.tol);
});
it("workspace mode and room quality preserved", () => {
  const p = fresh();
  p.mode = "showroom";
  p.showroom.quality = "2d";
  p.showroom.lighting = 0.7;
  expect(modelHash(parseProject(serialize(p)))).toEqual(modelHash(p));
});
it("original parallelogram preset exact coverage", () =>
  check(shapes.parallelogram.p, "quad"));
