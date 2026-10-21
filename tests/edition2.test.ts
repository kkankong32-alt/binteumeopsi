import { describe, it, expect } from "vitest";
import {
  fresh,
  parseProject,
  serialize,
  modelHash,
  levels,
  legacyLevels,
  projectLevel,
  scatter,
} from "../src/model";
import { coverage, valid, multiArea, multi, boxPoly } from "../src/geometry";
import { uniqueTargetKey, questNotes } from "../src/quests";
import { materialProfiles } from "../src/roomEngine";
import { svgArt, sceneTiles, viewBox } from "../src/render";
import { readFileSync } from "node:fs";

describe("edition 2 content and compatibility", () => {
  it("18 genuinely distinct target outlines, not renamed copies", () => {
    expect(levels).toHaveLength(18);
    expect(new Set(levels.map((l) => uniqueTargetKey(l.target))).size).toBe(18);
    expect(new Set(questNotes.map((n) => n[0])).size).toBe(18);
  });
  levels.forEach((l, i) =>
    it(`quest ${i + 1} exact non-overlapping dissection`, () => {
      expect(l.solution.length).toBeLessThanOrEqual(12);
      expect(l.solution.every(valid)).toBe(true);
      const r = coverage(l.solution, l.target);
      expect(r.gapArea).toBeLessThanOrEqual(r.tol);
      expect(r.overlapArea).toBeLessThanOrEqual(r.tol);
      expect(r.outsideArea).toBeLessThanOrEqual(r.tol);
      expect(multiArea(l.target)).toBeGreaterThan(0);
    }),
  );
  levels.forEach((_, i) =>
    it(`quest ${i + 1} tray fits without overlapping pieces`, () => {
      const pieces = scatter(i).map((s) => s.p);
      const proof = coverage(
        pieces,
        multi(boxPoly({ x: 200, y: -220, w: 510, h: 520 })),
      );
      expect(proof.overlapArea).toBeLessThanOrEqual(proof.tol);
      expect(proof.outsideArea).toBeLessThanOrEqual(proof.tol);
    }),
  );
  it("old puzzle saves retain their old target and unfinished positions", () => {
    const p = fresh();
    delete p.puzzle.catalog;
    p.puzzle.level = 7;
    p.puzzle.pieces = legacyLevels[7].solution.map((p, i) => ({
      id: String(i),
      p,
    }));
    const restored = parseProject(serialize(p));
    expect(projectLevel(restored)).toEqual(legacyLevels[7]);
    expect(restored.puzzle.pieces).toEqual(p.puzzle.pieces);
    expect(
      coverage(
        restored.puzzle.pieces.map((s) => s.p),
        projectLevel(restored).target,
      ).ok,
    ).toBe(true);
  });
  it("edition 2 puzzle catalog and full project roundtrip", () => {
    const p = fresh();
    p.puzzle.level = 16;
    expect(modelHash(parseProject(serialize(p)))).toEqual(modelHash(p));
    expect(projectLevel(p)).toEqual(levels[16]);
  });
  it("first delivery file remains editable", () => {
    const old = readFileSync("qa/before/strict-original.json", "utf8");
    const p = parseProject(old);
    expect(parseProject(serialize(p)).vertices).toEqual(p.vertices);
    expect(parseProject(serialize(p)).style).toEqual(p.style);
  });
  it("artboard has documented fixed 16:9 canonical size", () => {
    const p = fresh();
    p.artboard = { width: 300, height: 500 };
    expect(parseProject(serialize(p)).artboard).toEqual({
      width: 1920,
      height: 1080,
    });
  });
  it("six profiles differ physically beyond color", () => {
    expect(
      new Set(Object.values(materialProfiles).map((p) => JSON.stringify(p)))
        .size,
    ).toBe(6);
    expect(materialProfiles.glass.transmission).toBeGreaterThan(0.5);
    expect(materialProfiles.metal.metalness).toBeGreaterThan(0.8);
    expect(materialProfiles.metal.anisotropy).toBeGreaterThan(0.5);
    expect(materialProfiles.stone.bumpScale).toBeGreaterThan(
      materialProfiles.ceramic.bumpScale * 3,
    );
    expect(materialProfiles.gloss.clearcoat).toBe(1);
  });
  it("reusing prepared tiles is exactly equivalent to the export path", () => {
    const p = fresh(),
      b = viewBox(p);
    expect(svgArt(p, 1920, 1080, false, true, b, sceneTiles(p, b))).toBe(
      svgArt(p),
    );
  });
});
