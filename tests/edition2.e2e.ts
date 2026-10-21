import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
async function setup(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("binteumeopsi-guide", "1"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(page.locator(".certified")).toBeVisible();
}
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function savePNG(page: Page, file: string, width: number) {
  await page
    .getByLabel("쇼룸 이미지 크기", { exact: true })
    .selectOption(String(width));
  const d = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "쇼룸 PNG 저장", exact: true })
    .click();
  await (await d).saveAs("qa/" + file);
  const bytes = await fs.readFile("qa/" + file);
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  expect(bytes.readUInt32BE(16)).toBe(width);
  expect(bytes.readUInt32BE(20)).toBe((width * 9) / 16);
}
test("renderer and environment survive continuous controls and quality switches", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    const seen = new WeakSet<HTMLCanvasElement>();
    (window as any).webglQA = { created: 0, lost: 0 };
    HTMLCanvasElement.prototype.getContext = function (...args: any[]) {
      const result = (original as any).apply(this, args);
      if (result && String(args[0]).startsWith("webgl") && !seen.has(this)) {
        seen.add(this);
        (window as any).webglQA.created++;
        this.addEventListener("webglcontextlost", () => {
          (window as any).webglQA.lost++;
        });
      }
      return result;
    } as any;
  });
  await setup(page);
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "쇼룸 PNG 저장" }),
  ).toBeEnabled();
  const canvas = await page.locator(".webgl-host canvas").elementHandle();
  const id = await page.locator(".webgl-host").getAttribute("data-renderer-id");
  for (let i = 0; i < 18; i++) {
    await page
      .getByLabel("쇼룸 조명", { exact: true })
      .fill(String(Number((0.5 + (i % 10) / 10).toFixed(1))));
    await page
      .getByLabel("쇼룸 scale", { exact: true })
      .fill(String(Number((0.6 + (i % 15) / 10).toFixed(1))));
    await page
      .getByLabel("쇼룸 rotation", { exact: true })
      .fill(String((i % 12) * 15));
    await page
      .getByLabel("쇼룸 x", { exact: true })
      .fill(String(Number((-1 + (i % 15) / 10).toFixed(1))));
  }
  await page.getByLabel("화면 품질", { exact: true }).selectOption("2d");
  await expect(page.locator(".fallback-room img")).toBeVisible();
  await page.getByLabel("화면 품질", { exact: true }).selectOption("auto");
  await settle(page);
  expect(
    await canvas!.evaluate(
      (el) => el === document.querySelector(".webgl-host canvas"),
    ),
  ).toBe(true);
  expect(
    await page.locator(".webgl-host").getAttribute("data-renderer-id"),
  ).toBe(id);
  const metrics = await page.evaluate(() => (window as any).webglQA);
  expect(metrics).toEqual({ created: 1, lost: 0 });
  await fs.writeFile(
    "qa/renderer-lifecycle.json",
    JSON.stringify(
      { metrics, continuousChanges: 72, qualitySwitches: 2 },
      null,
      2,
    ),
  );
});
test("three art-directed scenes by six materials and FHD 4K output", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await setup(page);
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "쇼룸 PNG 저장" }),
  ).toBeEnabled();
  const records: any[] = [];
  for (const scene of ["wall", "floor", "facade"]) {
    await page.getByLabel("공간", { exact: true }).selectOption(scene);
    for (const material of [
      "ceramic",
      "gloss",
      "stone",
      "wood",
      "metal",
      "glass",
    ]) {
      await page.getByLabel("재질", { exact: true }).selectOption(material);
      await settle(page);
      const shot = await page
        .locator(".showroom-view")
        .screenshot({ path: `qa/v2-${scene}-${material}.png` });
      const pixels = await page
        .locator(".webgl-host canvas")
        .evaluate((c: HTMLCanvasElement) => c.toDataURL());
      records.push({
        scene,
        material,
        sha256: createHash("sha256").update(pixels).digest("hex"),
        screenshotSHA256: createHash("sha256").update(shot).digest("hex"),
      });
    }
  }
  expect(new Set(records.map((r) => r.sha256)).size).toBe(18);
  await page.getByLabel("공간", { exact: true }).selectOption("wall");
  await page.getByLabel("재질", { exact: true }).selectOption("gloss");
  await savePNG(page, "showroom-fhd.png", 1920);
  await savePNG(page, "showroom-4k.png", 3840);
  await expect(page.locator(".webgl-host")).toHaveAttribute(
    "data-texture-size",
    "2048x1152",
  );
  await page.getByLabel("화면 품질", { exact: true }).selectOption("2d");
  await savePNG(page, "showroom-2d-4k.png", 3840);
  await fs.writeFile(
    "qa/material-comparison.json",
    JSON.stringify(records, null, 2),
  );
});
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [820, 1180],
  [1024, 768],
  [1366, 768],
  [1920, 1080],
]) {
  test(`focus editing preserves composition and 44px targets ${width}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height });
    await setup(page);
    const overview = await page.locator(".artboard").getAttribute("viewBox");
    await page
      .getByRole("button", { name: "한 조각 집중 편집", exact: true })
      .click();
    const circle = page.getByRole("button", {
      name: "꼭짓점 1 · 방향키로 이동",
      exact: true,
    });
    const target = page.locator(".touch-target").first();
    const box = await target.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(43.9);
    expect(box!.height).toBeGreaterThanOrEqual(43.9);
    const before = await circle.getAttribute("cx"),
      b = await circle.boundingBox();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    });
    const x = b!.x + b!.width / 2,
      y = b!.y + b!.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 16, y: y + 8, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(circle).not.toHaveAttribute("cx", before!);
    await expect(page.locator(".certified")).toBeVisible();
    await circle.focus();
    await page.keyboard.press("ArrowRight");
    await page.getByTitle("되돌리기", { exact: true }).click();
    await page.getByTitle("다시 하기", { exact: true }).click();
    await page.screenshot({ path: `qa/focus-${width}.png` });
    const focusBeforePinch = await page.locator(".artboard").getAttribute("viewBox");
    const canvas = await page.locator(".artboard").boundingBox();
    const midX = canvas!.x + canvas!.width / 2;
    const midY = canvas!.y + canvas!.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: midX - 30, y: midY, id: 1 }, { x: midX + 30, y: midY, id: 2 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: midX - 50, y: midY + 12, id: 1 }, { x: midX + 50, y: midY + 12, id: 2 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator(".artboard")).not.toHaveAttribute("viewBox", focusBeforePinch!);
    await page.screenshot({ path: `qa/focus-pinch-${width}.png` });
    await page
      .getByRole("button", { name: "전체 16:9 구도로 돌아가기", exact: true })
      .click();
    await expect(page.locator(".artboard")).toHaveAttribute(
      "viewBox",
      overview!,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `qa/overview-${width}.png` });
  });
}
test("new quests, learning links and legacy unfinished puzzle are preserved", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await setup(page);
  await page.getByRole("button", { name: "수학 탐구", exact: true }).click();
  await page.locator(".card-tabs button").nth(3).click();
  await page
    .getByRole("button", { name: "관련 퍼즐로 도전하기 →", exact: true })
    .click();
  await expect(page.getByLabel("퍼즐 단계")).toHaveValue("3");
  for (let i = 0; i < 18; i++) {
    await page.getByLabel("퍼즐 단계").selectOption(String(i));
    await page.screenshot({
      path: `qa/quest-${String(i + 1).padStart(2, "0")}.png`,
    });
  }
  const legacy = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const p = m.fresh();
    delete p.puzzle.catalog;
    p.puzzle.level = 7;
    p.mode = "puzzle";
    p.puzzle.pieces = m.legacyLevels[7].solution.map((p: any, i: number) => ({
      id: String(i),
      p,
    }));
    return JSON.stringify(p);
  });
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles({
      name: "legacy.json",
      mimeType: "application/json",
      buffer: Buffer.from(legacy),
    });
  await page.getByRole("button", { name: "선택한 프로젝트 불러오기" }).click();
  await expect(page.locator(".canvas-top")).toContainText("육각형 속 삼각형");
  await page
    .getByRole("button", { name: "빈틈 확인하기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "✓ 빈틈없이 완성!" }),
  ).toBeVisible();
});
test("edited colors and pattern roundtrip into showroom FHD and 4K", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await setup(page);
  await page.getByTitle("테라코타", { exact: true }).click();
  await page.getByLabel("타일 속 무늬", { exact: true }).selectOption("decal");
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await page.getByLabel("재질", { exact: true }).selectOption("metal");
  await page.getByLabel("공간", { exact: true }).selectOption("floor");
  await page.getByLabel("쇼룸 scale", { exact: true }).fill("1.5");
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  let d = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "편집 가능한 프로젝트 파일 저장",
      exact: true,
    })
    .click();
  await (await d).saveAs("qa/v2-roundtrip.json");
  await page.getByTitle("닫기", { exact: true }).click();
  await page.getByLabel("재질", { exact: true }).selectOption("ceramic");
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles("qa/v2-roundtrip.json");
  await page.getByRole("button", { name: "선택한 프로젝트 불러오기" }).click();
  await expect(page.getByLabel("재질", { exact: true })).toHaveValue("metal");
  await expect(page.getByLabel("공간", { exact: true })).toHaveValue("floor");
  await expect(page.getByLabel("쇼룸 scale", { exact: true })).toHaveValue(
    "1.5",
  );
  await savePNG(page, "roundtrip-room-fhd.png", 1920);
  await savePNG(page, "roundtrip-room-4k.png", 3840);
  await page.getByRole("button", { name: "패턴 작업실", exact: true }).click();
  await expect(page.getByLabel("타일 속 무늬", { exact: true })).toHaveValue(
    "decal",
  );
  await page.getByTitle("전자칠판 모드", { exact: true }).click();
  await expect(page.locator(".app")).toHaveClass(/whiteboard/);
  await page.screenshot({ path: "qa/whiteboard.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".app")).not.toHaveClass(/whiteboard/);
});
test("first visit is an action-led journey and mobile title input works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: "qa/first-visit-home.png", fullPage: true });
  const start = Date.now();
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(page.locator(".modal")).toHaveCount(0);
  await page
    .getByRole("button", { name: "1 점 움직이기", exact: true })
    .click();
  const handle = page.getByRole("button", {
    name: "꼭짓점 1 · 방향키로 이동",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page
    .getByRole("button", { name: "2 패턴 펼치기", exact: true })
    .click();
  await page.getByRole("button", { name: "3 색과 무늬", exact: true }).click();
  await page.getByTitle("줄무늬 무늬 적용", { exact: true }).click();
  await page
    .getByRole("button", { name: "4 공간에 적용", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "쇼룸 PNG 저장", exact: true }),
  ).toBeEnabled();
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(30000);
  await page
    .getByRole("button", { name: "작품 이름 바꾸기", exact: true })
    .click();
  await page
    .getByLabel("새 작품 이름", { exact: true })
    .fill("우리 반의 첫 패턴");
  await page.getByRole("button", { name: "이름 저장", exact: true }).click();
  await expect(page.locator(".modal")).toHaveCount(0);
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const d = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "편집 가능한 프로젝트 파일 저장",
      exact: true,
    })
    .click();
  await (await d).saveAs("qa/mobile-titled.json");
  expect(
    JSON.parse(await fs.readFile("qa/mobile-titled.json", "utf8")).title,
  ).toBe("우리 반의 첫 패턴");
  await fs.writeFile(
    "qa/journey-timing.json",
    JSON.stringify(
      { automatedJourneyMS: elapsed, humanStudentStudy: "NOT RUN" },
      null,
      2,
    ),
  );
});
