import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
const out = "qa/approval";
async function boot(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("binteumeopsi-guide", "1"),
  );
  await page.goto("/");
}
async function studio(page: Page) {
  await boot(page);
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await expect(page.locator(".certified")).toBeVisible();
}
async function importProject(page: Page, project: any) {
  await page
    .getByLabel("프로젝트 파일", { exact: true })
    .setInputFiles({
      name: "approval.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  const confirm = page.getByRole("button", {
    name: "선택한 프로젝트 불러오기",
  });
  await confirm.waitFor({ state: "visible", timeout: 1200 }).catch(() => {});
  if (await confirm.isVisible()) await confirm.click();
  await expect(page.locator(".modal")).toHaveCount(0);
}
async function project(page: Page) {
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "편집 가능한 프로젝트 파일 저장",
      exact: true,
    })
    .click();
  const d = await event,
    stream = await d.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  await page.getByTitle("닫기", { exact: true }).click();
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
async function png(page: Page, name: string, width: number, room = false) {
  if (!room)
    await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await page
    .getByLabel(room ? "쇼룸 이미지 크기" : "PNG 이미지 크기", { exact: true })
    .selectOption(String(width));
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: room ? "쇼룸 PNG 저장" : "PNG 저장",
      exact: true,
    })
    .click();
  await (await event).saveAs(`${out}/${name}.png`);
  const bytes = await fs.readFile(`${out}/${name}.png`);
  expect(bytes.readUInt32BE(16)).toBe(width);
  expect(bytes.readUInt32BE(20)).toBe((width * 9) / 16);
  if (!room) await page.getByTitle("닫기", { exact: true }).click();
}
for (const [w, h] of [
  [1920, 1080],
  [1366, 768],
  [1024, 768],
  [820, 1180],
  [390, 844],
  [360, 800],
]) {
  test(`settled landing navigation and exact raster composition ${w}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    const assets: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/assets/showroom/")) assets.push(r.url());
    });
    await boot(page);
    const image = page.locator(".launch-poster");
    await expect(image).toHaveCSS("opacity", "1");
    expect(
      await image.evaluate(
        (e: HTMLImageElement) => e.complete && e.naturalWidth > 1000,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await snap(page, `home-${w}`);
    expect(assets).toEqual([]);
    await page
      .getByRole("button", { name: "예제 작품 보기", exact: true })
      .click();
    await expect(page.locator("#example-collection")).toBeInViewport();
    await page
      .getByRole("button", { name: "패턴 만들기", exact: true })
      .click();
    await expect(page.locator(".certified")).toBeVisible();
    await page.getByTitle("메인페이지로 돌아가기", { exact: true }).click();
    await page
      .getByRole("button", { name: "최근 작업 이어하기", exact: true })
      .click();
    await expect(page.locator(".artboard")).toBeVisible();
  });
}
test("A first student edits vertex pattern palette then exports image", async ({
  page,
}) => {
  await studio(page);
  const handle = page.getByRole("button", {
    name: "꼭짓점 1 · 방향키로 이동",
    exact: true,
  });
  const before = await project(page);
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByLabel("타일 속 무늬", { exact: true }).selectOption("stripe");
  await page.getByTitle("바닷가 오후", { exact: true }).click();
  const after = await project(page);
  expect(after.vertices).not.toEqual(before.vertices);
  expect(after.style.decoration).toBe("stripe");
  await png(page, "journey-A-fhd", 1920);
  await snap(page, "journey-A-editor");
});
test("C restore into fresh project resumes editing with clean history", async ({
  page,
}) => {
  await studio(page);
  await page.getByLabel("작품 제목", { exact: true }).fill("복원 검증 작품");
  await page.getByTitle("테라코타", { exact: true }).click();
  const before = await project(page);
  await fs.writeFile(
    `${out}/journey-C-original.json`,
    JSON.stringify(before, null, 2),
  );
  await page.getByRole("button", { name: "나의 작품", exact: true }).click();
  await page.getByRole("button", { name: "새 프로젝트", exact: true }).click();
  expect((await project(page)).id).not.toBe(before.id);
  await importProject(page, before);
  let restored = await project(page);
  expect(restored.vertices).toEqual(before.vertices);
  expect(restored.style).toEqual(before.style);
  await page
    .getByRole("button", { name: "꼭짓점 1 · 방향키로 이동", exact: true })
    .focus();
  await page.keyboard.press("ArrowDown");
  restored = await project(page);
  expect(restored.vertices).not.toEqual(before.vertices);
  await fs.writeFile(
    `${out}/journey-C-resumed.json`,
    JSON.stringify(restored, null, 2),
  );
  await snap(page, "journey-C-restored");
});
test("deleted current project cannot resurrect through autosave recovery or reload", async ({
  page,
}) => {
  await studio(page);
  await page.getByLabel("작품 제목", { exact: true }).fill("삭제 검증 작품");
  const p = await project(page);
  await page
    .getByRole("button", { name: "현재 프로젝트 저장", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 작품", exact: true }).click();
  const card = page
    .locator(".gallery-grid article")
    .filter({
      has: page.getByRole("heading", { name: "삭제 검증 작품", exact: true }),
    });
  await card.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "작품 삭제", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.waitForTimeout(1300);
  await page.reload();
  await page
    .getByRole("button", { name: "내 작품 이어하기", exact: true })
    .click();
  await expect(
    page.locator(".gallery-grid article").filter({ hasText: "삭제 검증 작품" }),
  ).toHaveCount(0);
  const state = await page.evaluate(async (id) => {
    const m = await import("/src/model.ts");
    return {
      exists: (await m.listLocal()).some((x: any) => x.id === id),
      last: localStorage.getItem("binteumeopsi-last"),
      recovery: localStorage.getItem("binteumeopsi-recovery"),
    };
  }, p.id);
  expect(state.exists).toBe(false);
  expect(state.last).not.toBe(p.id);
  expect(state.recovery || "").not.toContain(p.id);
  await snap(page, "deleted-gallery");
});
test("focus fit and importing another file preserve saved composition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await studio(page);
  const original = await project(page);
  await page
    .getByRole("button", { name: "한 조각 집중 편집", exact: true })
    .click();
  const focus = await page.locator(".artboard").getAttribute("viewBox");
  await page.getByTitle("확대", { exact: true }).click();
  await expect(page.locator(".artboard")).not.toHaveAttribute(
    "viewBox",
    focus!,
  );
  await page.getByTitle("화면 맞춤", { exact: true }).click();
  await expect(page.locator(".artboard")).toHaveAttribute("viewBox", focus!);
  expect((await project(page)).camera).toEqual(original.camera);
  await importProject(page, original);
  await expect(page.locator(".app")).not.toHaveClass(/focus-edit/);
  await snap(page, "import-overview-390");
});
test("puzzle zoom fit drag and verdict invalidate through undo and import", async ({
  page,
}) => {
  await studio(page);
  await page.getByRole("button", { name: "틈새 챌린지", exact: true }).click();
  const p = await project(page);
  const base = await page.locator(".artboard").getAttribute("viewBox");
  await page.getByTitle("확대", { exact: true }).click();
  await expect(page.locator(".artboard")).not.toHaveAttribute("viewBox", base!);
  await page.getByTitle("화면 맞춤", { exact: true }).click();
  await expect(page.locator(".artboard")).toHaveAttribute("viewBox", base!);
  expect((await project(page)).camera).toEqual(p.camera);
  const solved = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    const p = m.fresh();
    p.mode = "puzzle";
    p.puzzle.pieces = m.levels[0].solution.map((p: any, i: number) => ({
      id: String(i),
      p,
    }));
    return p;
  });
  await importProject(page, solved);
  await page
    .getByRole("button", { name: "빈틈 확인하기", exact: true })
    .click();
  await expect(page.locator(".quest-success")).toBeVisible();
  await page.getByTitle("되돌리기", { exact: true }).click();
  await expect(page.locator(".quest-success")).toHaveCount(0);
  await importProject(page, p);
  await expect(page.locator(".quest-success")).toHaveCount(0);
});
test("D all eighteen exact coordinate solutions pass UI; missing pieces fail", async ({
  page,
}) => {
  test.setTimeout(150000);
  await studio(page);
  const fixtures = await page.evaluate(async () => {
    const m = await import("/src/model.ts");
    return m.levels.map((l: any, i: number) => {
      const p = m.fresh();
      p.mode = "puzzle";
      p.puzzle.level = i;
      p.puzzle.pieces = l.solution.map((p: any, j: number) => ({
        id: String(j),
        p,
      }));
      return p;
    });
  });
  const records = [];
  for (let i = 0; i < fixtures.length; i++) {
    await importProject(page, fixtures[i]);
    await page
      .getByRole("button", { name: "빈틈 확인하기", exact: true })
      .click();
    await expect(page.locator(".quest-success")).toBeVisible();
    records.push({
      level: i + 1,
      result: await page.locator(".verification").innerText(),
    });
    await snap(page, `quest-solved-${String(i + 1).padStart(2, "0")}`);
    const bad = structuredClone(fixtures[i]);
    bad.puzzle.pieces.pop();
    await importProject(page, bad);
    await page
      .getByRole("button", { name: "빈틈 확인하기", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "조금 더 맞춰 볼까요?" }),
    ).toBeVisible();
  }
  await fs.writeFile(
    `${out}/quest-ui-verdicts.json`,
    JSON.stringify(records, null, 2),
  );
});
test("ten inquiry cards manipulate and link without overwriting original artwork", async ({
  page,
}) => {
  test.setTimeout(120000);
  await studio(page);
  await page.getByLabel("작품 제목", { exact: true }).fill("탐구 전 원본");
  const original = await project(page);
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: "수학 탐구", exact: true }).click();
    await page.locator(".card-tabs button").nth(i).click();
    const range = page.locator(".lesson input[type=range]");
    if (await range.count()) await range.fill(i === 5 || i === 9 ? "20" : "6");
    const buttons = page.locator(".lesson-controls button");
    if (await buttons.count()) await buttons.last().click();
    await expect(page.locator(".feedback")).not.toBeEmpty();
    await snap(page, `learning-${i + 1}`);
    await page
      .getByRole("button", { name: "작업실에서 직접 해 보기 →", exact: true })
      .click();
    await expect(page.locator(".artboard")).toBeVisible();
    expect((await project(page)).id).not.toBe(original.id);
    await page.getByRole("button", { name: "수학 탐구", exact: true }).click();
    await page.locator(".card-tabs button").nth(i).click();
    await page
      .getByRole("button", { name: "관련 퍼즐로 도전하기 →", exact: true })
      .click();
    await expect(page.getByLabel("퍼즐 단계", { exact: true })).toHaveValue(
      String([0, 1, 8, 3, 3, 6, 8, 8, 13, 4][i]),
    );
  }
  const saved = await page.evaluate(async (id) => {
    const m = await import("/src/model.ts");
    return (await m.listLocal()).find((x: any) => x.id === id)?.project;
  }, original.id);
  expect(saved.vertices).toEqual(original.vertices);
  expect(saved.title).toBe(original.title);
});
test("external asset failures degrade safely and hero failure preserves entry", async ({
  page,
}) => {
  await page.route("**/assets/hero/**", (route) => route.abort());
  await page.route("**/assets/showroom/**", (route) => route.abort());
  await boot(page);
  await expect(page.locator(".poster-fallback")).toBeVisible();
  await page.getByRole("button", { name: "패턴 만들기", exact: true }).click();
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  await expect(page.locator(".webgl-host")).toHaveAttribute(
    "data-asset-state",
    "degraded",
  );
  await expect(
    page.getByRole("button", { name: "쇼룸 PNG 저장", exact: true }),
  ).toBeEnabled();
  await png(page, "degraded-room-fhd", 1920, true);
  await snap(page, "degraded-room");
});
test("B authored example with physical assets scene and material exports", async ({
  page,
}) => {
  test.setTimeout(120000);
  await boot(page);
  await page.locator(".example-card").nth(0).click();
  await expect(page.locator(".artboard")).toBeVisible();
  const handle = page.getByRole("button", {
    name: "꼭짓점 1 · 방향키로 이동",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "디자인 쇼룸", exact: true }).click();
  const host = page.locator(".webgl-host");
  await expect(host).toHaveAttribute("data-asset-state", "ready");
  await expect(host).toHaveAttribute("data-model-loaded", "true");
  await expect(host).toHaveAttribute("data-plant-loaded", "true");
  const id = await host.getAttribute("data-renderer-id");
  await page.getByLabel("재질", { exact: true }).selectOption("stone");
  await page.getByLabel("공간", { exact: true }).selectOption("floor");
  await page.getByLabel("쇼룸 rotation", { exact: true }).fill("30");
  await page.getByLabel("쇼룸 scale", { exact: true }).fill("1.2");
  await png(page, "journey-B-room-4k", 3840, true);
  await expect(host).toHaveAttribute("data-renderer-id", id!);
  await expect(host).toHaveAttribute("data-environment-builds", "2");
  await snap(page, "journey-B-room");
});
