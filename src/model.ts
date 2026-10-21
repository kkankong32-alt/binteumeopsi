import {
  regular,
  escher,
  valid,
  coverage,
  bounds,
  type Poly,
  type V,
  union,
  move,
  transform,
} from "./geometry";
import { newQuestSolutions, questNotes } from "./quests";
export const palettes = [
  ["#224F47", "#80A99C", "#E6B78A", "#F3E9D8"],
  ["#4344A1", "#9894DA", "#E7B8C4", "#F3EAF5"],
  ["#173D64", "#65A4BB", "#E7BF66", "#F0E5CC"],
  ["#8D4638", "#D78D67", "#EBC5A2", "#F5ECE1"],
  ["#202B35", "#667E8B", "#BCCCD3", "#EDF1EF"],
  ["#634D77", "#AA8195", "#DBB6A2", "#F4E5D7"],
  ["#165B65", "#3F9298", "#B7D9C2", "#EDF4DB"],
  ["#68533B", "#A49872", "#D9D3B8", "#F5F0E3"],
];
export const paletteNames = [
  "숲과 모래",
  "라일락 정원",
  "바닷가 오후",
  "테라코타",
  "도시의 아침",
  "장밋빛 노을",
  "물빛 산책",
  "종이와 나무",
];
export const shapes: Record<string, { label: string; p: Poly; kind: string }> =
  {
    quad: {
      label: "자유 사각형",
      p: [
        [-65, -55],
        [55, -65],
        [75, 50],
        [-55, 65],
      ],
      kind: "quad",
    },
    square: {
      label: "정사각형",
      p: [
        [-60, -60],
        [60, -60],
        [60, 60],
        [-60, 60],
      ],
      kind: "quad",
    },
    rectangle: {
      label: "직사각형",
      p: [
        [-80, -45],
        [80, -45],
        [80, 45],
        [-80, 45],
      ],
      kind: "quad",
    },
    parallelogram: {
      label: "평행사변형",
      p: [
        [-40, -55],
        [80, -55],
        [40, 55],
        [-80, 55],
      ],
      kind: "quad",
    },
    rhombus: {
      label: "마름모",
      p: [
        [0, -75],
        [50, 0],
        [0, 75],
        [-50, 0],
      ],
      kind: "quad",
    },
    trapezoid: {
      label: "사다리꼴",
      p: [
        [-40, -50],
        [40, -50],
        [80, 50],
        [-80, 50],
      ],
      kind: "quad",
    },
    triangle: { label: "정삼각형", p: regular(3), kind: "triangle" },
    hex: { label: "정육각형", p: regular(6), kind: "hex" },
    pentagon: { label: "정오각형", p: regular(5), kind: "regular" },
    heptagon: { label: "정칠각형", p: regular(7), kind: "regular" },
    octagon: { label: "정팔각형", p: regular(8), kind: "regular" },
    mixed8: { label: "사각 + 팔각", p: regular(8), kind: "mixed8" },
    mixed6: { label: "삼각 + 육각", p: regular(6), kind: "mixed6" },
  };
export type Piece = { id: string; p: Poly; group?: string; color?: string };
export type Decoration = {
  id: string;
  type: "eye" | "diamond" | "dot" | "wing";
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
};
export type Project = {
  format: "binteumeopsi-project";
  schemaVersion: 1;
  id: string;
  title: string;
  created: string;
  modified: string;
  kind: string;
  mode: "studio" | "puzzle" | "showroom" | "learn";
  vertices: Poly;
  locked: boolean;
  escher: { top: V[]; left: V[]; curved: boolean };
  decorations: Decoration[];
  repeat: boolean;
  pieces: Piece[];
  style: {
    palette: string[];
    background: string;
    decoration: string;
    stroke: string;
    line: number;
    join: string;
    grout: number;
    period: number;
    scale: number;
    rotation: number;
    colors: Record<string, string>;
    typeColors: Record<string, string>;
    recent: string[];
  };
  camera: { x: number; y: number; zoom: number };
  artboard: { width: number; height: number };
  showroom: {
    scene: string;
    material: string;
    scale: number;
    rotation: number;
    x: number;
    y: number;
    camera: number;
    lighting?: number;
    quality?: "auto" | "2d";
  };
  puzzle: {
    catalog?: "v2";
    level: number;
    pieces: Piece[];
    completed: number[];
    custom: Level | null;
  };
  layers: string[];
};
export const fresh = (): Project => ({
  format: "binteumeopsi-project",
  schemaVersion: 1,
  id: crypto.randomUUID(),
  title: "숲빛의 조각들",
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  kind: "quad",
  mode: "studio",
  vertices: structuredClone(shapes.quad.p),
  locked: false,
  escher: {
    curved: false,
    top: [
      [40, -16],
      [80, 16],
    ],
    left: [
      [16, 40],
      [-16, 80],
    ],
  },
  decorations: [],
  repeat: true,
  pieces: [],
  style: {
    palette: [...palettes[0]],
    background: "#f3e9d8",
    decoration: "solid",
    stroke: "#ffffff",
    line: 0.7,
    join: "round",
    grout: 1,
    period: 4,
    scale: 1,
    rotation: 0,
    colors: {},
    typeColors: {},
    recent: [],
  },
  camera: { x: 0, y: 0, zoom: 1 },
  artboard: { width: 1920, height: 1080 },
  showroom: {
    scene: "wall",
    material: "ceramic",
    scale: 1,
    rotation: 0,
    x: 0,
    y: 0,
    camera: 0,
    lighting: 1,
    quality: "auto",
  },
  puzzle: { catalog: "v2", level: 0, pieces: [], completed: [], custom: null },
  layers: ["pattern", "decoration"],
});
const enums = (v: unknown, values: string[]) =>
  typeof v === "string" && values.includes(v);
export function parseProject(text: string): Project {
  if (text.length > 2_000_000) throw Error("파일은 2MB 이하로 골라 주세요.");
  let p = JSON.parse(text);
  if (p?.format !== "binteumeopsi-project")
    throw Error("빈틈없이 프로젝트 파일이 아닙니다.");
  if (p.schemaVersion === 0) p = { ...fresh(), ...p, schemaVersion: 1 };
  if (p.schemaVersion !== 1) throw Error("지원하지 않는 프로젝트 버전입니다.");
  const d = fresh();
  p.mode ??= "studio";
  if (!enums(p.mode, ["studio", "puzzle", "showroom", "learn"]))
    throw Error("작업 모드 오류");
  const num = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const color = (v: unknown) =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  if (
    typeof p.title !== "string" ||
    p.title.length > 80 ||
    typeof p.id !== "string" ||
    p.id.length > 100 ||
    !valid(p.vertices) ||
    !enums(p.kind, [
      "quad",
      "triangle",
      "hex",
      "regular",
      "escher",
      "mixed8",
      "mixed6",
    ]) ||
    typeof p.repeat !== "boolean" ||
    typeof p.locked !== "boolean"
  )
    throw Error("제목 또는 도형 데이터가 올바르지 않습니다.");
  if (
    !p.style ||
    !Array.isArray(p.style.palette) ||
    p.style.palette.length !== 4 ||
    !p.style.palette.every(color) ||
    !color(p.style.background) ||
    !color(p.style.stroke) ||
    !enums(p.style.decoration, [
      "solid",
      "stripe",
      "dot",
      "checker",
      "line",
      "gradient",
      "decal",
    ]) ||
    !num(p.style.line, 0, 8) ||
    !num(p.style.grout, 0, 10) ||
    !Number.isInteger(p.style.period) ||
    !num(p.style.period, 1, 4) ||
    !num(p.style.scale, 0.3, 3) ||
    !num(p.style.rotation, -360, 360)
  )
    throw Error("색상 또는 스타일이 올바르지 않습니다.");
  if (
    !p.camera ||
    !num(p.camera.x, -10000, 10000) ||
    !num(p.camera.y, -10000, 10000) ||
    !num(p.camera.zoom, 0.3, 4)
  )
    throw Error("화면 좌표가 범위를 벗어났습니다.");
  if (
    !p.showroom ||
    !enums(p.showroom.scene, ["wall", "floor", "facade"]) ||
    !enums(p.showroom.material, [
      "ceramic",
      "gloss",
      "stone",
      "wood",
      "metal",
      "glass",
    ]) ||
    !num(p.showroom.scale, 0.3, 3) ||
    !num(p.showroom.rotation, -360, 360) ||
    !num(p.showroom.x, -2, 2) ||
    !num(p.showroom.y, -2, 2) ||
    !Number.isInteger(p.showroom.camera) ||
    !num(p.showroom.camera, 0, 2)
  )
    throw Error("쇼룸 설정이 올바르지 않습니다.");
  if (p.showroom.lighting !== undefined && !num(p.showroom.lighting, 0.4, 1.8))
    throw Error("조명 설정 오류");
  if (
    p.showroom.quality !== undefined &&
    !enums(p.showroom.quality, ["auto", "2d"])
  )
    throw Error("품질 설정 오류");
  for (const arr of [p.pieces, p.puzzle?.pieces])
    if (
      !Array.isArray(arr) ||
      arr.length > 150 ||
      arr.some(
        (s: Piece) =>
          !s ||
          typeof s.id !== "string" ||
          s.id.length > 80 ||
          !valid(s.p) ||
          (s.color && !color(s.color)) ||
          (s.group && typeof s.group !== "string"),
      )
    )
      throw Error("조각 데이터가 올바르지 않습니다.");
  if (
    !Number.isInteger(p.puzzle.level) ||
    !num(p.puzzle.level, 0, 17) ||
    !Array.isArray(p.puzzle.completed) ||
    p.puzzle.completed.length > 18 ||
    p.puzzle.completed.some(
      (n: number) => !Number.isInteger(n) || n < 0 || n > 17,
    )
  )
    throw Error("퍼즐 데이터 오류");
  if (p.puzzle.catalog !== undefined && p.puzzle.catalog !== "v2")
    throw Error("퍼즐 목록 버전 오류");
  for (const arr of [p.escher?.top, p.escher?.left])
    if (
      !Array.isArray(arr) ||
      arr.length > 20 ||
      arr.some(
        (v: V) =>
          !Array.isArray(v) ||
          v.length !== 2 ||
          v.some((n) => !num(n, -360, 360)),
      )
    )
      throw Error("에셔 제어점 오류");
  p.escher.curved ??= false;
  if (typeof p.escher.curved !== "boolean") throw Error("곡선 설정 오류");
  p.decorations ??= [];
  if (
    !Array.isArray(p.decorations) ||
    p.decorations.length > 30 ||
    p.decorations.some(
      (d: Decoration) =>
        !d ||
        typeof d.id !== "string" ||
        d.id.length > 80 ||
        !enums(d.type, ["eye", "diamond", "dot", "wing"]) ||
        !num(d.x, -120, 240) ||
        !num(d.y, -120, 240) ||
        !num(d.size, 2, 40) ||
        !num(d.rotation, -360, 360) ||
        !color(d.color),
    )
  )
    throw Error("장식 데이터 오류");
  if (
    p.kind === "escher" &&
    JSON.stringify(
      escher(p.escher.top, p.escher.left, 120, p.escher.curved),
    ) !== JSON.stringify(p.vertices)
  )
    throw Error("짝이 되는 변이 일치하지 않습니다.");
  p.style.join ??= "round";
  if (!enums(p.style.join, ["round", "miter", "bevel"]))
    throw Error("모서리 표현 오류");
  p.style.typeColors ??= {};
  if (
    Object.keys(p.style.typeColors).length > 100 ||
    Object.values(p.style.typeColors).some((v) => !color(v))
  )
    throw Error("종류별 색 오류");
  if (
    !p.style.colors ||
    Object.keys(p.style.colors).length > 3000 ||
    Object.values(p.style.colors).some((v) => !color(v))
  )
    throw Error("타일 색상 오류");
  if (
    !Array.isArray(p.style.recent) ||
    p.style.recent.length > 12 ||
    !p.style.recent.every(color)
  )
    throw Error("최근 색 오류");
  if (
    !Array.isArray(p.layers) ||
    p.layers.length > 2 ||
    p.layers.some((v: unknown) => !enums(v, ["pattern", "decoration"]))
  )
    throw Error("레이어 데이터 오류");
  p.puzzle.custom ??= null;
  if (p.puzzle.custom) p.puzzle.custom = validateMission(p.puzzle.custom);
  if (
    typeof p.created !== "string" ||
    !Number.isFinite(Date.parse(p.created)) ||
    typeof p.modified !== "string" ||
    !Number.isFinite(Date.parse(p.modified))
  )
    throw Error("날짜 형식 오류");
  return Object.fromEntries(
    Object.keys(d).map((k) => [k, k === "artboard" ? d.artboard : p[k]]),
  ) as Project;
}
export const serialize = (p: Project) => JSON.stringify(p, null, 2);
export const modelHash = (p: Project) =>
  JSON.stringify({ ...p, created: "", modified: "" });
export type Level = {
  name: string;
  difficulty: string;
  solution: Poly[];
  target: ReturnType<typeof union>;
};
export const legacyLevels: Level[] = Array.from({ length: 18 }, (_, i) => {
  let solution: Poly[] = [];
  const cols = 2 + (i % 3),
    rows = i < 6 ? 1 + Math.floor(i / 3) : 2;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (i >= 12 && y === 1 && x === cols - 1) continue;
      let a: V = [x * 70 - 120, y * 70 - 90];
      if (i >= 6 && (x + y + i) % 2 === 0)
        solution.push(
          move(
            [
              [0, 0],
              [70, 0],
              [0, 70],
            ],
            a,
          ),
          move(
            [
              [70, 0],
              [70, 70],
              [0, 70],
            ],
            a,
          ),
        );
      else
        solution.push(
          move(
            [
              [0, 0],
              [70, 0],
              [70, 70],
              [0, 70],
            ],
            a,
          ),
        );
    }
  if ([7, 8, 10].includes(i)) {
    const h = regular(6, 110, [-40, -20], 0),
      o: [number, number] = [-40, -20];
    solution =
      i === 7
        ? h.map((v, k) => [o, v, h[(k + 1) % 6]])
        : i === 8
          ? [0, 2, 4].map((k) => [o, h[k], h[(k + 1) % 6], h[(k + 2) % 6]])
          : [
              [h[0], h[1], h[2], h[3]],
              [h[3], h[4], h[5], h[0]],
            ];
  }
  return {
    name: [
      "첫 두 조각",
      "작은 창문",
      "긴 복도",
      "네모 정원",
      "바둑판",
      "큰 창문",
      "반으로 나누기",
      "육각형 속 삼각형",
      "세 개의 마름모",
      "맞물린 길",
      "두 개의 사다리꼴",
      "조각 모자이크",
      "ㄱ자 마당",
      "계단 정원",
      "모퉁이 산책",
      "빈 자리 찾기",
      "접힌 편지",
      "마지막 건축",
    ][i],
    difficulty: i < 6 ? "착착" : i < 12 ? "딱딱" : "척척",
    solution,
    target: union(solution),
  };
});
export const levels: Level[] = newQuestSolutions().map((solution, i) => {
  // Preserve the introductory placement and the rotationally symmetric
  // rhombus challenge, including their verified alternative solutions.
  if (i === 0 || i === 8) solution = legacyLevels[i].solution;
  return {
    name: questNotes[i][0],
    difficulty: i < 6 ? "착착" : i < 12 ? "딱딱" : "척척",
    solution,
    target: union(solution),
  };
});
export function projectLevel(p: Project): Level {
  return (
    p.puzzle.custom ||
    (p.puzzle.catalog === "v2" ? levels : legacyLevels)[p.puzzle.level]
  );
}
export function scatter(level: number, custom: Level | null = null): Piece[] {
  const solution = (custom || levels[level]).solution;
  if (
    level === 0 &&
    (!custom || custom === levels[0] || custom === legacyLevels[0])
  )
    return solution.map((p, i) => ({
      id: "piece-" + i,
      p: move(p, [270 + i * 85 - centerX(p), -140 - centerY(p)]),
    }));
  const pieces = solution.map((p, i) => ({
    id: "piece-" + i,
    p: transform(
      p,
      level >= 6 ? 90 * (i % 4) : 0,
      1,
      level >= 12 && i % 2 === 1,
    ),
  }));
  const sorted = pieces
    .map((p, i) => ({ p, i, b: bounds(p.p) }))
    .sort((a, b) => b.b.h - a.b.h);
  let x = 210,
    y = -205,
    rowH = 0;
  for (const item of sorted) {
    if (x + item.b.w > 690) {
      x = 210;
      y += rowH + 16;
      rowH = 0;
    }
    item.p.p = move(item.p.p, [x - item.b.x, y - item.b.y]);
    x += item.b.w + 16;
    rowH = Math.max(rowH, item.b.h);
  }
  return pieces;
}

function centerX(p: Poly) {
  return p.reduce((s, v) => s + v[0], 0) / p.length;
}
function centerY(p: Poly) {
  return p.reduce((s, v) => s + v[1], 0) / p.length;
}
export async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("binteumeopsi", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("projects", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
let storageWrites: Promise<unknown> = Promise.resolve();
function enqueueStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageWrites.then(operation, operation);
  storageWrites = result.catch(() => {});
  return result;
}
export function saveLocal(p: Project, thumbnail: string) {
  return enqueueStorage(() => persistLocal(p, thumbnail));
}
async function persistLocal(p: Project, thumbnail: string) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const t = d.transaction("projects", "readwrite");
    t.objectStore("projects").put({ id: p.id, project: p, thumbnail });
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  localStorage.setItem("binteumeopsi-last", p.id);
  d.close();
}
export async function listLocal() {
  const d = await db();
  return new Promise<{ id: string; project: Project; thumbnail: string }[]>(
    (resolve, reject) => {
      const r = d.transaction("projects").objectStore("projects").getAll();
      r.onsuccess = () => {
        resolve(
          r.result.sort((a: any, b: any) =>
            b.project.modified.localeCompare(a.project.modified),
          ),
        );
        d.close();
      };
      r.onerror = () => reject(r.error);
    },
  );
}
export function deleteLocal(id: string) {
  return enqueueStorage(() => removeLocal(id));
}
async function removeLocal(id: string) {
  const d = await db();
  await new Promise<void>((res, rej) => {
    const t = d.transaction("projects", "readwrite");
    t.objectStore("projects").delete(id);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  d.close();
  if (localStorage.getItem("binteumeopsi-last") === id)
    localStorage.removeItem("binteumeopsi-last");
  try {
    if (
      JSON.parse(localStorage.getItem("binteumeopsi-recovery") || "null")
        ?.id === id
    )
      localStorage.removeItem("binteumeopsi-recovery");
  } catch {}
}

export function validateMission(m: any): Level {
  if (
    !m ||
    typeof m.name !== "string" ||
    m.name.length > 80 ||
    !Array.isArray(m.solution) ||
    m.solution.length < 1 ||
    m.solution.length > 12 ||
    !m.solution.every(valid) ||
    !Array.isArray(m.target) ||
    m.target.length > 30 ||
    m.target.length < 1
  )
    throw Error(
      "미션 이름과 조각 데이터를 확인해 주세요. 조각은 1~12개까지 사용할 수 있어요.",
    );
  let vertices = 0;
  for (const poly of m.target) {
    if (!Array.isArray(poly) || poly.length < 1 || poly.length > 10)
      throw Error("목표 영역 오류");
    for (const ring of poly) {
      if (!Array.isArray(ring)) throw Error("목표 영역 오류");
      vertices += ring.length;
      if (vertices > 2000) throw Error("목표 영역이 너무 복잡해요.");
      const clean =
        ring.length > 1 &&
        JSON.stringify(ring[0]) === JSON.stringify(ring[ring.length - 1])
          ? ring.slice(0, -1)
          : ring;
      if (!valid(clean)) throw Error("목표 영역의 선이 교차해요.");
    }
  }
  const r = coverage(m.solution, m.target);
  if (!r.ok || r.outsideArea > r.tol)
    throw Error("동봉된 풀이로 목표를 빈틈없이 채울 수 없어요.");
  let solution = m.solution,
    target = m.target;
  const b = bounds(solution.flat());
  if (b.x < -210 || b.x + b.w > 170 || b.y < -180 || b.y + b.h > 180) {
    const scale = Math.min(280 / b.w, 280 / b.h, 1);
    const fit = (v: V): V => [
      (v[0] - b.x - b.w / 2) * scale - 40,
      (v[1] - b.y - b.h / 2) * scale,
    ];
    solution = solution.map((poly: Poly) => poly.map(fit));
    target = target.map((poly: Poly[]) => poly.map((ring) => ring.map(fit)));
    if (!solution.every(valid))
      throw Error("크기 차이가 너무 큰 조각은 한 미션에 담을 수 없어요.");
  }
  return { name: m.name, difficulty: "직접 만든 미션", solution, target };
}
export function parseMission(text: string): Level {
  if (text.length > 2000000) throw Error("미션은 2MB 이하로 골라 주세요.");
  const m = JSON.parse(text);
  if (m.format !== "binteumeopsi-mission" || m.schemaVersion !== 1)
    throw Error("지원하지 않는 미션 파일이에요.");
  return validateMission(m);
}
