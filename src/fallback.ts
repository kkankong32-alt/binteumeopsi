import type { Project } from "./model";
import { surfaceAlbedo } from "./surface";
type P = [number, number];
function polygon(ctx: CanvasRenderingContext2D, points: P[], fill: string) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function warp(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  corners: P[],
) {
  const [p0, p1, p2, p3] = corners,
    dx1 = p1[0] - p2[0],
    dx2 = p3[0] - p2[0],
    dx3 = p0[0] - p1[0] + p2[0] - p3[0],
    dy1 = p1[1] - p2[1],
    dy2 = p3[1] - p2[1],
    dy3 = p0[1] - p1[1] + p2[1] - p3[1],
    den = dx1 * dy2 - dx2 * dy1,
    g = (dx3 * dy2 - dx2 * dy3) / den,
    h = (dx1 * dy3 - dx3 * dy1) / den;
  const project = (u: number, v: number): P => [
    ((p1[0] - p0[0] + g * p1[0]) * u +
      (p3[0] - p0[0] + h * p3[0]) * v +
      p0[0]) /
      (g * u + h * v + 1),
    ((p1[1] - p0[1] + g * p1[1]) * u +
      (p3[1] - p0[1] + h * p3[1]) * v +
      p0[1]) /
      (g * u + h * v + 1),
  ];
  function tri(src: P[], dst: P[]) {
    const [a, b, c] = src,
      [A, B, C] = dst,
      det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    const xx =
        ((B[0] - A[0]) * (c[1] - a[1]) - (C[0] - A[0]) * (b[1] - a[1])) / det,
      xy =
        ((C[0] - A[0]) * (b[0] - a[0]) - (B[0] - A[0]) * (c[0] - a[0])) / det,
      yx =
        ((B[1] - A[1]) * (c[1] - a[1]) - (C[1] - A[1]) * (b[1] - a[1])) / det,
      yy =
        ((C[1] - A[1]) * (b[0] - a[0]) - (B[1] - A[1]) * (c[0] - a[0])) / det;
    ctx.save();
    ctx.beginPath();
    dst.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.transform(
      xx,
      yx,
      xy,
      yy,
      A[0] - xx * a[0] - xy * a[1],
      A[1] - yx * a[0] - yy * a[1],
    );
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
  const n = 16;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const uv: P[] = [
        [x / n, y / n],
        [(x + 1) / n, y / n],
        [(x + 1) / n, (y + 1) / n],
        [x / n, (y + 1) / n],
      ];
      for (const ids of [
        [0, 1, 2],
        [0, 2, 3],
      ])
        tri(
          ids.map((i) => [uv[i][0] * img.width, uv[i][1] * img.height]),
          ids.map((i) => project(...uv[i])),
        );
    }
}
export function fallbackScene(
  p: Project,
  pattern: HTMLCanvasElement,
  width = 1280,
) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = (width * 9) / 16;
  const x = c.getContext("2d")!;
  x.scale(width / 1280, width / 1280);
  x.fillStyle = "#e8e6dc";
  x.fillRect(0, 0, 1280, 720);
  polygon(
    x,
    [
      [0, 520],
      [1280, 450],
      [1280, 720],
      [0, 720],
    ],
    "#cbc6b8",
  );
  polygon(
    x,
    [
      [70, 50],
      [280, 115],
      [280, 520],
      [70, 620],
    ],
    "#d8d3c7",
  );
  let tilt = p.showroom.camera === 0 ? 45 : p.showroom.camera === 2 ? -45 : 0;
  const points: P[] =
    p.showroom.scene === "floor"
      ? [
          [280, 400],
          [1010, 400 + tilt],
          [1240, 700],
          [40, 700 - tilt],
        ]
      : [
          [280, 90 + tilt],
          [1170, 80 - tilt],
          [1170, 530 - tilt],
          [280, 520 + tilt],
        ];
  x.save();
  if (p.showroom.material === "glass") x.globalAlpha = 0.65;
  warp(x, surfaceAlbedo(pattern, p.showroom.material), points);
  x.restore();
  x.save();
  x.beginPath();
  points.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath();
  x.clip();
  if (["gloss", "metal", "glass"].includes(p.showroom.material)) {
    const g = x.createLinearGradient(280, 50, 1170, 600);
    g.addColorStop(0, "#ffffff00");
    g.addColorStop(0.45, "#ffffff66");
    g.addColorStop(0.55, "#ffffff08");
    g.addColorStop(1, "#00000022");
    x.fillStyle = g;
    x.fillRect(0, 0, 1280, 720);
  }
  x.restore();
  if (p.showroom.scene === "facade") {
    for (const left of [390, 650, 910]) {
      x.fillStyle = "#31484b";
      x.fillRect(left, 200, 135, 230);
      x.fillStyle = "#d9d9cd";
      x.fillRect(left + 65, 200, 5, 230);
    }
  } else {
    polygon(
      x,
      [
        [180, 510],
        [550, 490],
        [650, 550],
        [280, 580],
      ],
      "#b3966c",
    );
    polygon(
      x,
      [
        [280, 580],
        [650, 550],
        [650, 565],
        [280, 595],
      ],
      "#8e7452",
    );
    x.fillStyle = "#3f4940";
    x.fillRect(305, 591, 16, 95);
    x.fillRect(585, 570, 16, 95);
    x.fillStyle = "#b9ad92";
    x.fillRect(1030, 510, 70, 100);
    x.fillStyle = "#496c4b";
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.ellipse(
        1065 + Math.sin(i * 2) * 30,
        490 - i * 10,
        17,
        55,
        Math.sin(i),
        0,
        Math.PI * 2,
      );
      x.fill();
    }
  }
  const light = p.showroom.lighting ?? 1;
  x.fillStyle =
    light < 1
      ? `rgba(0,0,0,${(1 - light) * 0.25})`
      : `rgba(255,255,255,${(light - 1) * 0.12})`;
  x.fillRect(0, 0, 1280, 720);
  return c;
}
