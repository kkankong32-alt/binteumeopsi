const naturalAlbedo = new WeakMap<object, HTMLCanvasElement>();
function normalizedGrain(source: CanvasImageSource) {
  const cached = naturalAlbedo.get(source as object);
  if (cached) return cached;
  const c = document.createElement("canvas");
  const image = source as HTMLImageElement;
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, c.width, c.height),
    a = pixels.data;
  let mean = 0;
  for (let i = 0; i < a.length; i += 4)
    mean += 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
  mean /= a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    const l = 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
    const v = Math.max(60, Math.min(255, 218 + (l - mean) * 3.4));
    a[i] = a[i + 1] = a[i + 2] = v;
  }
  ctx.putImageData(pixels, 0, 0);
  naturalAlbedo.set(source as object, c);
  return c;
}
/** Deterministic, self-authored surface albedo. Shared by WebGL and 2.5D.
 * Physical reflection/roughness remain independent material properties. */
export function surfaceAlbedo(
  pattern: HTMLCanvasElement,
  material: string,
  natural?: CanvasImageSource,
) {
  if (!["wood", "stone", "metal", "ceramic"].includes(material)) return pattern;
  const c = document.createElement("canvas");
  c.width = pattern.width;
  c.height = pattern.height;
  const x = c.getContext("2d")!;
  x.drawImage(pattern, 0, 0);
  if (natural && (material === "wood" || material === "stone")) {
    x.save();
    x.globalCompositeOperation = "multiply";
    x.globalAlpha = material === "stone" ? 0.58 : 0.65;
    const grain = normalizedGrain(natural);
    const columns = material === "wood" ? 3 : 2;
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < 2; j++) {
        const w = c.width / columns,
          h = c.height / 2;
        x.save();
        x.translate(i * w, j * h);
        if (material === "stone") {
          x.translate(i % 2 ? w : 0, j % 2 ? h : 0);
          x.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
        }
        x.drawImage(grain, 0, 0, w, h);
        x.restore();
      }
    x.restore();
    return c;
  }
  x.save();
  x.scale(c.width / 2048, c.height / 1152);
  let seed = 518;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  if (material === "wood") {
    x.globalCompositeOperation = "multiply";
    for (let i = 0; i < 2048; i += 3) {
      x.beginPath();
      x.strokeStyle = i % 15 === 0 ? "#5b3c1d52" : "#74542a30";
      x.lineWidth = i % 15 === 0 ? 1.5 : 0.8;
      for (let y = 0; y <= 1152; y += 6) {
        const xx =
          i + Math.sin(y * 0.012 + i * 0.009) * 7 + Math.sin(y * 0.038) * 1.5;
        y ? x.lineTo(xx, y) : x.moveTo(xx, y);
      }
      x.stroke();
    }
  } else if (material === "stone") {
    // Broad aggregate remains legible on a tablet; fine grit below supplies
    // the close-up surface. These are inclusions, not a global color filter.
    for (let i = 0; i < 1600; i++) {
      const a = rand() * 2048,
        b = rand() * 1152;
      const r = 2 + rand() * 5;
      x.fillStyle = i % 3 === 0 ? "#fbf6e796" : "#29382f55";
      x.beginPath();
      x.moveTo(a - r, b);
      x.lineTo(a - r * 0.3, b - r * 0.7);
      x.lineTo(a + r, b - r * 0.2);
      x.lineTo(a + r * 0.45, b + r * 0.75);
      x.closePath();
      x.fill();
    }
    for (let i = 0; i < 25000; i++) {
      const a = rand() * 2048,
        b = rand() * 1152,
        r = 0.4 + rand() * 1.7;
      x.fillStyle = i % 4 === 0 ? "#fbf6e74a" : "#292d2a27";
      x.beginPath();
      x.ellipse(a, b, r, r * (0.45 + rand()), rand() * 3, 0, Math.PI * 2);
      x.fill();
    }
  } else if (material === "metal") {
    x.globalCompositeOperation = "multiply";
    x.strokeStyle = "#28313225";
    x.lineWidth = 0.55;
    for (let y = 0; y < 1152; y += 1.8) {
      x.beginPath();
      x.moveTo(rand() * 130, y);
      x.lineTo(1900 + rand() * 148, y);
      x.stroke();
    }
  } else {
    for (let i = 0; i < 7000; i++) {
      x.fillStyle = i % 2 ? "#ffffff18" : "#263e3510";
      x.fillRect(rand() * 2048, rand() * 1152, 0.9, 0.9);
    }
  }
  x.restore();
  return c;
}
