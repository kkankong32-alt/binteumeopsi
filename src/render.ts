import {
  tilePattern,
  boxPoly,
  bounds,
  transform,
  escherCurvePath,
  type Tile,
  type Box,
  type Poly,
} from "./geometry";
import type { Project } from "./model";
export const VIEW: Box = { x: -480, y: -270, w: 960, h: 540 };
export function viewBox(p: Project): Box {
  return {
    x: p.camera.x - 480 / p.camera.zoom,
    y: p.camera.y - 270 / p.camera.zoom,
    w: 960 / p.camera.zoom,
    h: 540 / p.camera.zoom,
  };
}
export function sceneTiles(p: Project, b: Box): Tile[] {
  if (!p.repeat)
    return p.pieces.map((s, i) => ({ id: s.id, p: s.p, kind: i % 4 }));
  const inv = bounds(
    transform(boxPoly(b), -p.style.rotation, 1 / p.style.scale, false, [0, 0]),
  );
  return tilePattern(p.vertices, p.kind, inv)
    .map((t) => ({
      ...t,
      p: transform(t.p, p.style.rotation, p.style.scale, false, [0, 0]),
    }))
    .filter((t) => {
      const r = bounds(t.p);
      return (
        r.x + r.w >= b.x &&
        r.x <= b.x + b.w &&
        r.y + r.h >= b.y &&
        r.y <= b.y + b.h
      );
    });
}
export const path = (p: Poly) =>
  "M" + p.map((v) => v.map((x) => +x.toFixed(6)).join(",")).join("L") + "Z";
export function colorFor(p: Project, t: Tile) {
  return (
    p.style.colors[t.id] ||
    p.style.typeColors?.[t.p.length] ||
    p.style.palette[t.kind % p.style.period]
  );
}
export function svgArt(
  p: Project,
  width = 1920,
  height = 1080,
  transparent = false,
  grout = true,
  b = viewBox(p),
  preparedTiles?: Tile[],
): string {
  const tiles = preparedTiles || sceneTiles(p, b),
    s = p.style;
  let defs = "";
  const curvePath =
    p.kind === "escher" && p.escher.curved && p.repeat
      ? escherCurvePath(p.escher.top, p.escher.left)
      : null;
  const content = tiles
    .map((t, i) => {
      const color = colorFor(p, t),
        id = "f" + i,
        d = curvePath ? "" : path(t.p);
      let fill = color;
      const accent = s.palette[(t.kind + 1) % 4];
      if (s.decoration !== "solid") {
        fill = `url(#${id})`;
        if (s.decoration === "gradient")
          defs += `<linearGradient id="${id}" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient>`;
        else {
          let detail =
            s.decoration === "dot"
              ? `<circle cx="8" cy="8" r="2" fill="${accent}"/>`
              : s.decoration === "checker"
                ? `<path d="M0 0H8V8H0ZM8 8H16V16H8Z" fill="${accent}"/>`
                : s.decoration === "decal"
                  ? `<path d="M8 2L14 8L8 14L2 8Z" fill="none" stroke="${accent}" stroke-width="1.2"/>`
                  : `<path d="M0 0V16M8 0V16" stroke="${accent}" stroke-width="${s.decoration === "line" ? ".6" : "3"}"/>`;
          defs += `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="16" height="16" fill="${color}"/>${detail}</pattern>`;
        }
      }
      const isEscher = p.kind === "escher" && p.repeat;
      const placement = `translate(${t.p[0]}) rotate(${s.rotation}) scale(${s.scale})`;
      const outline =
        isEscher && p.escher.curved
          ? `<path d="${curvePath}" transform="${placement}"`
          : `<path d="${d}"`;
      const tile = `${outline} fill="${fill}" stroke="${s.stroke}" stroke-width="${(s.line + (grout ? s.grout : 0)) / (isEscher && p.escher.curved ? s.scale : 1)}" stroke-linejoin="${s.join}"/>`;
      if (
        !isEscher ||
        !p.decorations.length ||
        !p.layers.includes("decoration")
      )
        return tile;
      defs += `<clipPath id="clip${i}">${outline}/></clipPath>`;
      const decoration = p.decorations
        .map((deco) => {
          const radius = deco.size;
          const shape =
            deco.type === "eye"
              ? `<ellipse rx="${radius}" ry="${radius * 0.75}" fill="white"/><circle r="${radius * 0.42}" fill="${deco.color}"/><circle cx="${radius * 0.15}" cy="${-radius * 0.12}" r="${radius * 0.12}" fill="white"/>`
              : deco.type === "dot"
                ? `<circle r="${radius}" fill="${deco.color}"/>`
                : deco.type === "wing"
                  ? `<path d="M${-radius},0 Q0,${-radius * 1.5} ${radius},0 Q0,${radius * 0.3} ${-radius},0Z" fill="${deco.color}"/>`
                  : `<path d="M0,${-radius}L${radius},0L0,${radius}L${-radius},0Z" fill="${deco.color}"/>`;
          return `<g transform="translate(${deco.x},${deco.y}) rotate(${deco.rotation})">${shape}</g>`;
        })
        .join("");
      return (
        tile +
        `<g clip-path="url(#clip${i})"><g transform="${placement}">${decoration}</g></g>`
      );
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><defs>${defs}</defs>${transparent ? "" : `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${s.background}"/>`}${content}</svg>`;
}
export async function artCanvas(
  p: Project,
  width = 1920,
  height = 1080,
  transparent = false,
  grout = true,
  b = viewBox(p),
): Promise<HTMLCanvasElement> {
  const svg = svgArt(p, width, height, transparent, grout, b);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    c.getContext("2d")!.drawImage(image, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function download(data: Blob | string, name: string) {
  const url = typeof data === "string" ? data : URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  if (typeof data !== "string")
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function png(
  p: Project,
  width: number,
  transparent: boolean,
  grout: boolean,
) {
  const c = await artCanvas(p, width, (width * 9) / 16, transparent, grout);
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(Error("이미지 생성 실패")))),
  );
  download(blob, `빈틈없이_${p.title}_${width}.png`);
}
