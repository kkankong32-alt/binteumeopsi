import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
async function setup(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("binteumeopsi-guide", "1"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
}
async function saved(page: Page) {
  return page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const rows = await m.listLocal();
    return rows[0]?.project;
  });
}
async function download(page: Page, name: string, file: string) {
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const d = await promise;
  await d.saveAs("qa/" + file);
  return "qa/" + file;
}
for (const [w, h] of [
  [1920, 1080],
  [1366, 768],
  [1024, 768],
  [820, 1180],
  [390, 844],
  [360, 800],
])
  test(`layout and core flow ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem("binteumeopsi-guide", "1"),
    );
    await page.goto("/");
    await page.screenshot({ path: `qa/home-${w}.png`, fullPage: true });
    await page
      .getByRole("button", { name: "패턴 만들기", exact: true })
      .click();
    await expect(page.locator(".certified")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const circle = page.locator(".artboard g circle").first();
    const pt = await circle.boundingBox();
    expect(pt).not.toBeNull();
    await page.mouse.move(pt!.x + pt!.width / 2, pt!.y + pt!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      pt!.x + pt!.width / 2 + 15,
      pt!.y + pt!.height / 2 - 8,
      { steps: 8 },
    );
    await page.mouse.up();
    await expect(page.locator(".certified")).toBeVisible();
    await page.screenshot({ path: `qa/studio-${w}.png`, fullPage: true });
    await page.getByRole("button", { name: "내보내기", exact: true }).click();
    await download(page, "편집 가능한 프로젝트 파일 저장", `project-${w}.json`);
    await page.getByTitle("닫기", { exact: true }).click();
    await page
      .getByLabel("프로젝트 파일", { exact: true })
      .setInputFiles(`qa/project-${w}.json`);
    if (
      await page
        .getByRole("button", { name: "선택한 프로젝트 불러오기" })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "선택한 프로젝트 불러오기" })
        .click();
    await expect(page.locator(".certified")).toBeVisible();
    await page
      .getByRole("button", { name: "디자인 쇼룸", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "쇼룸 PNG 저장" }),
    ).toBeEnabled({ timeout: 30000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `qa/showroom-${w}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
test("exports, project roundtrip, malformed input, autosave", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await page.getByLabel("타일 속 무늬").selectOption("stripe");
  await page.getByTitle("라일락 정원", { exact: true }).click();
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await page
    .getByRole("combobox", { name: "공간", exact: true })
    .selectOption("floor");
  await page
    .getByRole("combobox", { name: "재질", exact: true })
    .selectOption("metal");
  await page
    .getByRole("combobox", { name: "카메라", exact: true })
    .selectOption("2");
  await expect(page.getByRole("button", { name: "쇼룸 PNG 저장" })).toBeEnabled(
    { timeout: 30000 },
  );
  await download(page, "쇼룸 PNG 저장", "room-export.png");
  await page.getByRole("button", { name: "패턴 작업실", exact: true }).click();
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await download(page, "PNG 저장", "pattern-1920.png");
  await page.getByLabel("PNG 이미지 크기").selectOption("3840");
  await download(page, "PNG 저장", "pattern-3840.png");
  await download(page, "SVG 저장", "pattern.svg");
  await download(page, "편집 가능한 프로젝트 파일 저장", "roundtrip.json");
  const original = JSON.parse(await fs.readFile("qa/roundtrip.json", "utf8"));
  await page.getByTitle("닫기", { exact: true }).click();
  await page.getByRole("button", { name: "정삼각형", exact: true }).click();
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles("qa/roundtrip.json");
  await page.getByRole("button", { name: "선택한 프로젝트 불러오기" }).click();
  await expect(page.locator(".modal")).toHaveCount(0);
  delete original.modified;
  await expect
    .poll(async () => {
      const q = await saved(page);
      if (q) delete q.modified;
      return q;
    })
    .toEqual(original);
  const restored = await saved(page);
  delete original.modified;
  delete restored.modified;
  expect(restored).toEqual(original);
  await page.reload();
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(page.getByLabel("타일 속 무늬")).toHaveValue("stripe");
  const before = await saved(page);
  await page.getByLabel("프로젝트 파일", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"vertices":[]}'),
  });
  await expect(page.getByRole("status")).toContainText("불러오기 실패");
  expect((await saved(page)).vertices).toEqual(before.vertices);
  const xml = await fs.readFile("qa/pattern.svg", "utf8");
  const result = await page.evaluate((s) => {
    const d = new DOMParser().parseFromString(s, "image/svg+xml");
    return {
      paths: d.querySelectorAll("path").length,
      images: d.querySelectorAll("image").length,
      error: !!d.querySelector("parsererror"),
    };
  }, xml);
  expect(result.paths).toBeGreaterThan(20);
  expect(result.images).toBe(0);
  expect(result.error).toBe(false);
});
test("escher, learning cards, puzzle drag solution", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await page.getByRole("button", { name: "에셔 변 연결 만들기" }).click();
  await expect(page.locator(".certified")).toBeVisible();
  const pt = await page.locator(".artboard g circle").first().boundingBox();
  await page.mouse.move(pt!.x + pt!.width / 2, pt!.y + pt!.height / 2);
  await page.mouse.down();
  await page.mouse.move(pt!.x + pt!.width / 2 + 4, pt!.y + pt!.height / 2 - 8, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByTitle("되돌리기", { exact: true }).click();
  await page.getByTitle("다시 하기", { exact: true }).click();
  await page.getByRole("button", { name: "수학 탐구", exact: true }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator(".card-tabs button").nth(i).click();
    await expect(page.locator(".lesson svg")).toBeVisible();
    const range = page.locator(".lesson input[type=range]");
    if (await range.count())
      await range.fill(i === 9 ? "10" : i === 5 ? "20" : "6");
    const btn = page.locator(".lesson-controls button");
    if (await btn.count()) await btn.last().click();
    await expect(page.locator(".feedback")).not.toBeEmpty();
  }
  await page.screenshot({ path: "qa/learning.png", fullPage: true });
  await page.getByRole("button", { name: "틈새 챌린지", exact: true }).click();
  const rect = await page.locator(".artboard").boundingBox();
  const scale = Math.min(rect!.width / 960, rect!.height / 540),
    offX = (rect!.width - 960 * scale) / 2,
    offY = (rect!.height - 540 * scale) / 2;
  const point = (x: number, y: number) => ({
    x: rect!.x + offX + (x + 240) * scale,
    y: rect!.y + offY + (y + 230) * scale,
  });
  for (const [a, b] of [
    [
      [270, -140],
      [-85, -55],
    ],
    [
      [355, -140],
      [-15, -55],
    ],
  ]) {
    const s = point(a[0], a[1]),
      d = point(b[0], b[1]);
    await page.mouse.move(s.x, s.y);
    await page.mouse.down();
    await page.mouse.move(d.x, d.y, { steps: 12 });
    await page.mouse.up();
  }
  await page
    .getByRole("button", { name: "빈틈 확인하기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "✓ 빈틈없이 완성!" }),
  ).toBeVisible();
  await page.screenshot({ path: "qa/puzzle-complete.png", fullPage: true });
});
test("all material presets and scenes render", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  for (const material of [
    "ceramic",
    "gloss",
    "stone",
    "wood",
    "metal",
    "glass",
  ]) {
    await page
      .getByRole("combobox", { name: "재질", exact: true })
      .selectOption(material);
    await expect(
      page.getByRole("button", { name: "쇼룸 PNG 저장" }),
    ).toBeEnabled({ timeout: 30000 });
    await page.screenshot({ path: `qa/material-${material}.png` });
  }
  for (const scene of ["floor", "facade"]) {
    await page
      .getByRole("combobox", { name: "공간", exact: true })
      .selectOption(scene);
    await expect(
      page.getByRole("button", { name: "쇼룸 PNG 저장" }),
    ).toBeEnabled({ timeout: 30000 });
    await page.screenshot({ path: `qa/scene-${scene}.png` });
  }
});

test("transparent PNG, keyboard history, touch pinch and orientation", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await setup(page);
  await page.getByRole("button", { name: "조각 모드로 직접 배치" }).click();
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await page.getByLabel("바탕 투명하게").check();
  await download(page, "PNG 저장", "transparent-1920.png");
  await page.getByTitle("닫기", { exact: true }).click();
  await page.getByRole("button", { name: "무한 패턴으로 채우기" }).click();
  await page.getByRole("button", { name: "정사각형", exact: true }).click();
  const after = JSON.stringify(
    await page.locator(".artboard image").getAttribute("href"),
  );
  for (let i = 0; i < 50; i++) {
    await page.getByTitle("도형 45도 회전", { exact: true }).click();
  }
  await page.locator(".artboard").focus();
  for (let i = 0; i < 50; i++) await page.keyboard.press("Control+z");
  expect(
    JSON.stringify(await page.locator(".artboard image").getAttribute("href")),
  ).toBe(after);
  for (let i = 0; i < 50; i++) await page.keyboard.press("Control+Shift+z");
  await expect(page.locator(".certified")).toBeVisible();
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const r = await page.locator(".artboard").boundingBox();
  const x = r!.x + r!.width / 2,
    y = r!.y + r!.height / 2;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 35, y, id: 1 },
      { x: x + 35, y, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 65, y: y + 8, id: 1 },
      { x: x + 65, y: y + 8, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => {
      const q = await saved(page);
      return q?.camera.zoom;
    })
    .toBeGreaterThan(1.5);
  await page.setViewportSize({ width: 820, height: 1180 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "색 / 재질", exact: true }).click();
  await page
    .getByRole("combobox", { name: "타일 속 무늬" })
    .selectOption("dot");
  await page.getByRole("button", { name: "수학", exact: true }).last().click();
  await expect(
    page.getByRole("heading", { name: "도형 속의 수학" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("malicious inputs preserved, vector export escaped", async ({ page }) => {
  await setup(page);
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByTitle("현재 프로젝트 저장").click();
  await expect.poll(async () => !!(await saved(page))).toBe(true);
  const before = await saved(page);
  for (const update of [
    {
      vertices: [
        [0, 0],
        [100, 100],
        [0, 100],
        [100, 0],
      ],
    },
    { camera: { x: 0, y: 0, zoom: 1e99 } },
    { style: { ...before.style, palette: ["url(javascript:alert(1))"] } },
  ]) {
    await page.getByLabel("프로젝트 파일", { exact: true }).setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...before, ...update })),
    });
    await expect(page.getByRole("status")).toContainText("불러오기 실패");
    expect((await saved(page)).vertices).toEqual(before.vertices);
  }
  const unsafe = {
    ...before,
    title: "<img src=x onerror=window.HACKED=1>",
    repeat: false,
    pieces: [
      { id: '\"/><script>window.HACKED=1</script>', p: before.vertices },
    ],
  };
  await page.getByLabel("프로젝트 파일", { exact: true }).setInputFiles({
    name: "text.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(unsafe)),
  });
  if (
    await page
      .getByRole("button", { name: "선택한 프로젝트 불러오기" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "선택한 프로젝트 불러오기" })
      .click();
  expect(await page.evaluate(() => window.HACKED)).toBeUndefined();
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await download(page, "SVG 저장", "escaped.svg");
  expect(await fs.readFile("qa/escaped.svg", "utf8")).not.toContain("<script>");
});
test("400 tile interaction benchmark", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await setup(page);
  const sample = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const p = m.fresh();
    p.style.scale = 0.3;
    return p;
  });
  await page.getByLabel("프로젝트 파일", { exact: true }).setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(sample)),
  });
  if (
    await page
      .getByRole("button", { name: "선택한 프로젝트 불러오기" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "선택한 프로젝트 불러오기" })
      .click();
  await expect(page.locator(".certified")).toBeVisible();
  await page.evaluate(() => {
    window.framesQA = [];
    let last = performance.now();
    window.runQA = true;
    function tick(t: number) {
      if (window.runQA) {
        window.framesQA.push(t - last);
        last = t;
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
  const pt = await page.locator(".artboard g circle").first().boundingBox();
  await page.mouse.move(pt!.x + pt!.width / 2, pt!.y + pt!.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 50; i++)
    await page.mouse.move(
      pt!.x + pt!.width / 2 + Math.sin(i / 5) * 2,
      pt!.y + pt!.height / 2 + Math.cos(i / 5) * 2,
    );
  await page.mouse.up();
  const stats = await page.evaluate(() => {
    window.runQA = false;
    const d = window.framesQA.slice(2).sort((a, b) => a - b);
    return {
      frames: d.length,
      meanFrameMS: d.reduce((s, x) => s + x, 0) / d.length,
      p95FrameMS: d[Math.floor(d.length * 0.95)],
      userAgent: navigator.userAgent,
    };
  });
  const count = await page.locator(".canvas-footer").innerText();
  await fs.writeFile(
    "qa/performance.json",
    JSON.stringify({ ...stats, count }, null, 2),
  );
  await expect(page.locator(".certified")).toBeVisible();
});
test("2.5D fallback works without WebGL and saves scene", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await setup(page);
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await expect(
    page.getByText("2.5D 미리보기 · 이 기기는 WebGL을 지원하지 않습니다."),
  ).toBeVisible();
  await download(page, "쇼룸 PNG 저장", "fallback-scene.png");
  await page.screenshot({ path: "qa/fallback.png" });
});
test("group, exact edge snap and collision rejection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  const fixture = await page.evaluate(async () => {
    const { fresh } = await import("/src/model.ts");
    const p = fresh();
    p.repeat = false;
    p.pieces = [
      {
        id: "a",
        p: [
          [200, -50],
          [300, -50],
          [300, 50],
          [200, 50],
        ],
      },
      {
        id: "b",
        p: [
          [300, -50],
          [400, -50],
          [400, 50],
          [300, 50],
        ],
      },
      {
        id: "c",
        p: [
          [-100, 50],
          [0, 50],
          [0, 150],
          [-100, 150],
        ],
      },
    ];
    return p;
  });
  await page.getByLabel("프로젝트 파일", { exact: true }).setInputFiles({
    name: "group.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  if (
    await page
      .getByRole("button", { name: "선택한 프로젝트 불러오기" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "선택한 프로젝트 불러오기" })
      .click();
  const rect = await page.locator(".artboard").boundingBox();
  const sc = Math.min(rect!.width / 960, rect!.height / 540);
  const pt = (x: number, y: number) => ({
    x: rect!.x + rect!.width / 2 + x * sc,
    y: rect!.y + rect!.height / 2 + y * sc,
  });
  const a = pt(250, 0),
    b = pt(350, 0);
  await page.mouse.click(a.x, a.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(b.x, b.y);
  await page.keyboard.up("Shift");
  await page.getByRole("button", { name: "묶기", exact: true }).click();
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  const target = pt(-48, 2);
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("status")).toContainText("자석 정렬");
  await expect
    .poll(async () => {
      const p = await saved(page);
      return p?.pieces[0].p[0][0];
    })
    .toBe(-100);
  let p = await saved(page);
  expect(p.pieces[0].group).toBe(p.pieces[1].group);
  expect(p.pieces[0].p).toEqual([
    [-100, -50],
    [0, -50],
    [0, 50],
    [-100, 50],
  ]);
  expect(p.pieces[1].p).toEqual([
    [0, -50],
    [100, -50],
    [100, 50],
    [0, 50],
  ]);
  const start = pt(-50, 0),
    end = pt(-50, 90);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole("status")).toContainText("겹쳐서 이동을 취소");
});
test("teacher mission export import and keyboard vertex editing", async ({
  page,
}) => {
  await setup(page);
  const handle = page.getByRole("button", { name: "꼭짓점 1 · 방향키로 이동" });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByRole("button", { name: "수학 탐구", exact: true }).click();
  await page.locator(".card-tabs button").nth(2).click();
  await expect(page.locator(".feedback")).toContainText("두 조건을 모두 만족");
  await page.getByRole("button", { name: "틈새 챌린지", exact: true }).click();
  await page.getByLabel("퍼즐 단계", { exact: true }).selectOption("7");
  await download(page, "교사용 미션 파일 저장", "teacher.mission.json");
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles("qa/teacher.mission.json");
  await page.getByRole("button", { name: "선택한 프로젝트 불러오기" }).click();
  await expect(page.locator(".canvas-top")).toContainText("육각형 속 삼각형");
  await page
    .getByRole("button", { name: "빈틈 확인하기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "조금 더 맞춰 볼까요?" }),
  ).toBeVisible();
});
test("in-memory roundtrip and new tab recovery", async ({ page, context }) => {
  await setup(page);
  await page.getByRole("button", { name: "정육각형", exact: true }).click();
  await page
    .getByRole("combobox", { name: "타일 속 무늬" })
    .selectOption("decal");
  const originalArt = await page
    .locator(".artboard image")
    .getAttribute("href");
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await download(
    page,
    "편집 가능한 프로젝트 파일 저장",
    "strict-original.json",
  );
  await page.getByTitle("닫기", { exact: true }).click();
  await page.getByRole("button", { name: "정사각형", exact: true }).click();
  expect(await page.locator(".artboard image").getAttribute("href")).not.toBe(
    originalArt,
  );
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles("qa/strict-original.json");
  await page.getByRole("button", { name: "선택한 프로젝트 불러오기" }).click();
  await expect(page.locator(".artboard image")).toHaveAttribute(
    "href",
    originalArt!,
  );
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await download(
    page,
    "편집 가능한 프로젝트 파일 저장",
    "strict-restored.json",
  );
  const a = JSON.parse(await fs.readFile("qa/strict-original.json", "utf8")),
    b = JSON.parse(await fs.readFile("qa/strict-restored.json", "utf8"));
  delete a.modified;
  delete b.modified;
  expect(b).toEqual(a);
  await expect
    .poll(async () => {
      const p = await saved(page);
      return p?.kind;
    })
    .toBe("hex");
  await page.close();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(
    other.getByRole("combobox", { name: "타일 속 무늬" }),
  ).toHaveValue("decal");
  await expect(other.locator(".artboard image")).toHaveAttribute(
    "href",
    originalArt!,
  );
});
test("production build offline assets and no console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      r.url().startsWith("http") &&
      !r.url().startsWith("http://127.0.0.1:8765")
    )
      external.push(r.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem("binteumeopsi-guide", "1"),
  );
  await page.goto("http://127.0.0.1:8765");
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByRole("button", { name: "정오각형", exact: true }).click();
  await expect(page.locator(".pending")).toContainText("틈 또는 겹침");
  await page.getByRole("button", { name: "정육각형", exact: true }).click();
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "쇼룸 PNG 저장" }),
  ).toBeEnabled();
  await page.screenshot({ path: "qa/production.png" });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("curved Escher, movable vector decorations and exact restore", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await page.getByRole("button", { name: "에셔 변 연결 만들기" }).click();
  await page.getByLabel("자유 아트 · 곡선").check();
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByTitle("눈 장식", { exact: true }).click();
  await page.getByLabel("장식 크기", { exact: true }).fill("14");
  const rect = await page.locator(".artboard").boundingBox();
  const x = rect!.x + rect!.width / 2,
    y = rect!.y + rect!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y - 12, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "장식 이동" })).toBeVisible();
  await page.getByRole("button", { name: "장식 이동" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByTitle("좌우 대칭", { exact: true }).click();
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByRole("button", { name: "수학", exact: true }).first().click();
  await expect(
    page.getByText("곡선이 있는 자유 아트는 수학적 다각형이 아니에요."),
  ).toBeVisible();
  await page.screenshot({ path: "qa/escher-curved.png" });
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await download(page, "SVG 저장", "escher-curved.svg");
  await download(page, "편집 가능한 프로젝트 파일 저장", "escher-curved.json");
  const original = JSON.parse(
    await fs.readFile("qa/escher-curved.json", "utf8"),
  );
  expect(original.escher.curved).toBe(true);
  expect(original.decorations).toHaveLength(1);
  expect(original.decorations[0].x).not.toBe(60);
  const xml = await fs.readFile("qa/escher-curved.svg", "utf8");
  expect(xml).toContain("Q");
  expect(xml).toContain("<ellipse");
  expect(xml).toContain("<clipPath");
  await page.getByTitle("닫기", { exact: true }).click();
  await page.getByRole("button", { name: "정사각형", exact: true }).click();
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles("qa/escher-curved.json");
  await page.getByRole("button", { name: "선택한 프로젝트 불러오기" }).click();
  await expect(page.getByLabel("자유 아트 · 곡선")).toBeChecked();
  await expect(page.locator(".certified")).toBeVisible();
  await page.getByLabel("장식 레이어 표시").uncheck();
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await download(page, "SVG 저장", "escher-hidden.svg");
  expect(await fs.readFile("qa/escher-hidden.svg", "utf8")).not.toContain(
    "<ellipse",
  );
});
test("rapid reload restores the last committed edit", async ({ page }) => {
  await setup(page);
  await page
    .getByLabel("작품 제목", { exact: true })
    .fill("빠른 새로고침 복구");
  await page.reload();
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(page.getByLabel("작품 제목", { exact: true })).toHaveValue(
    "빠른 새로고침 복구",
  );
});
test("manual lightweight room and lighting switch back to 3D", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await page.getByLabel("화면 품질", { exact: true }).selectOption("2d");
  await expect(
    page.getByText("2.5D 미리보기 · 가볍게 보기 모드"),
  ).toBeVisible();
  const before = await page.locator(".fallback-room img").getAttribute("src");
  await page.getByLabel("쇼룸 조명", { exact: true }).fill("0.5");
  await expect(page.locator(".fallback-room img")).not.toHaveAttribute(
    "src",
    before!,
  );
  await download(page, "쇼룸 PNG 저장", "lightweight-room.png");
  await page.getByLabel("화면 품질", { exact: true }).selectOption("auto");
  await expect(page.locator(".showroom-view canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "쇼룸 PNG 저장" }),
  ).toBeEnabled();
});
