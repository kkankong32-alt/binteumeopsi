import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("E mobile touch pinch pan palette save restore and showroom", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("binteumeopsi-guide", "1"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await page
    .getByRole("button", { name: "한 조각 집중 편집", exact: true })
    .click();
  const point = page.getByRole("button", {
    name: "꼭짓점 1 · 방향키로 이동",
    exact: true,
  });
  const before = await point.getAttribute("cx");
  let box = (await point.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const touch = async (type: string, points: any[]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await touch("touchStart", [{ x, y, id: 1 }]);
  await touch("touchMove", [{ x: x + 18, y: y + 9, id: 1 }]);
  await touch("touchEnd", []);
  await expect(point).not.toHaveAttribute("cx", before!);
  const art = page.locator(".artboard"),
    v = await art.getAttribute("viewBox");
  box = (await art.boundingBox())!;
  const mx = box.x + box.width / 2,
    my = box.y + box.height / 2;
  await touch("touchStart", [
    { x: mx - 30, y: my, id: 1 },
    { x: mx + 30, y: my, id: 2 },
  ]);
  await touch("touchMove", [
    { x: mx - 45, y: my + 15, id: 1 },
    { x: mx + 55, y: my + 15, id: 2 },
  ]);
  await touch("touchEnd", []);
  await expect(art).not.toHaveAttribute("viewBox", v!);
  await page.screenshot({
    path: "qa/approval/journey-E-touch.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "전체 16:9 구도로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "색 / 재질", exact: true }).click();
  await page.getByTitle("물빛 산책", { exact: true }).click();
  await page.getByLabel("타일 속 무늬", { exact: true }).selectOption("dot");
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  let d = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "편집 가능한 프로젝트 파일 저장",
      exact: true,
    })
    .click();
  await (await d).saveAs("qa/approval/journey-E.json");
  d = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG 저장", exact: true }).click();
  await (await d).saveAs("qa/approval/journey-E-pattern.png");
  await page.getByTitle("닫기", { exact: true }).click();
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await expect(page.locator(".webgl-host")).toHaveAttribute(
    "data-asset-state",
    "ready",
  );
  await page.getByLabel("재질", { exact: true }).selectOption("glass");
  await page
    .getByLabel("쇼룸 이미지 크기", { exact: true })
    .selectOption("1920");
  d = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "쇼룸 PNG 저장", exact: true })
    .click();
  await (await d).saveAs("qa/approval/journey-E-room.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "qa/approval/journey-E-showroom.png",
    fullPage: true,
  });
  const bytes = await fs.readFile("qa/approval/journey-E-room.png");
  expect(bytes.readUInt32BE(16)).toBe(1920);
  expect(bytes.readUInt32BE(20)).toBe(1080);
});
test("repeated showroom entry releases contexts and initial 2D loads no external assets", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    localStorage.setItem("binteumeopsi-guide", "1");
    const get = HTMLCanvasElement.prototype.getContext,
      seen = new WeakSet();
    (window as any).contextsQA = { created: 0, lost: 0 };
    HTMLCanvasElement.prototype.getContext = function (...args: any[]) {
      const r = (get as any).apply(this, args);
      if (r && String(args[0]).startsWith("webgl") && !seen.has(this)) {
        seen.add(this);
        (window as any).contextsQA.created++;
        this.addEventListener("webglcontextlost", () => {
          (window as any).contextsQA.lost++;
        });
      }
      return r;
    } as any;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ids = [];
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", { name: "디자인 쇼룸", exact: true })
      .click();
    await expect(page.locator(".webgl-host")).toHaveAttribute(
      "data-asset-state",
      "ready",
    );
    ids.push(
      await page.locator(".webgl-host").getAttribute("data-renderer-id"),
    );
    await page
      .getByLabel("재질", { exact: true })
      .selectOption(i % 2 ? "wood" : "stone");
    await page
      .getByRole("button", { name: "패턴 작업실", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => (window as any).contextsQA.lost))
      .toBe(i + 1);
  }
  expect(new Set(ids).size).toBe(4);
  expect(errors).toEqual([]);
  const metrics = await page.evaluate(() => (window as any).contextsQA);
  expect(metrics).toEqual({ created: 4, lost: 4 });
  await fs.writeFile(
    "qa/approval/repeated-contexts.json",
    JSON.stringify(
      {
        metrics,
        ids,
        driverMemoryLeakProof:
          "NOT RUN; context disposal is observable, driver allocation is not",
      },
      null,
      2,
    ),
  );
  const p = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const p = m.fresh();
    p.mode = "showroom";
    p.showroom.quality = "2d";
    return p;
  });
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/assets/showroom/")) requests.push(r.url());
  });
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles({
      name: "2d.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  const confirm = page.getByRole("button", {
    name: "선택한 프로젝트 불러오기",
  });
  await confirm.waitFor({ timeout: 1200 }).catch(() => {});
  if (await confirm.isVisible()) await confirm.click();
  await expect(page.locator(".fallback-room img")).toBeVisible();
  expect(requests).toEqual([]);
  await page.screenshot({ path: "qa/approval/initial-2d.png", fullPage: true });
});
test("legacy progress is not mislabeled as new quests and duplicated color survives", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("binteumeopsi-guide", "1"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  const legacy = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const p = m.fresh();
    delete p.puzzle.catalog;
    p.puzzle.completed = [0, 1, 2];
    p.mode = "puzzle";
    return p;
  });
  async function load(p: any) {
    await page
      .getByLabel("프로젝트 파일", { exact: true })
      .setInputFiles({
        name: "regression.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(p)),
      });
    const c = page.getByRole("button", { name: "선택한 프로젝트 불러오기" });
    await c.waitFor({ timeout: 1200 }).catch(() => {});
    if (await c.isVisible()) await c.click();
  }
  async function exported() {
    await page.getByRole("button", { name: "내보내기", exact: true }).click();
    const d = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "편집 가능한 프로젝트 파일 저장",
        exact: true,
      })
      .click();
    const file = await d;
    const stream = await file.createReadStream();
    const bytes = [];
    for await (const c of stream!) bytes.push(c);
    await page.getByTitle("닫기", { exact: true }).click();
    return JSON.parse(Buffer.concat(bytes).toString());
  }
  await load(legacy);
  await page.getByLabel("퍼즐 단계", { exact: true }).selectOption("4");
  expect((await exported()).puzzle.completed).toEqual([]);
  const p = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const p = m.fresh();
    p.repeat = false;
    p.pieces = [{ id: "colored", p: p.vertices }];
    p.style.colors.colored = "#782c71";
    return p;
  });
  await load(p);
  const b = (await page.locator(".artboard").boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.getByRole("button", { name: "복제", exact: true }).click();
  const q = await exported();
  expect(q.pieces).toHaveLength(2);
  expect(q.style.colors[q.pieces[1].id]).toBe("#782c71");
});
