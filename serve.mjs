import { execFile } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".hdr": "application/octet-stream",
  ".json": "application/json",
};
const firstPort = Number(process.env.PORT || 8765);
if (!Number.isInteger(firstPort) || firstPort < 1 || firstPort > 65535) {
  console.error("PORT must be an integer between 1 and 65535.");
  process.exit(1);
}
let port = firstPort;
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      ),
      file = path.resolve(
        root,
        "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
      );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const stat = fs.statSync(file);
    const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, { ETag: etag, "Cache-Control": "no-cache" });
      res.end();
      return;
    }
    res.writeHead(200, {
      ETag: etag,
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
  }
});
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < Math.min(firstPort + 50, 65535)) {
    console.log(`${port} 포트가 사용 중입니다. 다른 빈 포트로 실행합니다.`);
    port++;
    server.listen(port, "127.0.0.1");
    return;
  }
  console.error(e.message);
  process.exitCode = 1;
});
server.on("listening", () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  console.log(
    `빈틈없이: ${url}\n이 창을 열어 둔 채 브라우저에서 사용하세요. 종료: Ctrl+C`,
  );
  if (process.argv.includes("--open") && process.platform === "win32")
    execFile(
      "cmd.exe",
      ["/c", "start", "", url],
      {
        windowsHide: true,
      },
      (error) => {
        if (error)
          console.error(`브라우저에서 이 주소를 직접 열어 주세요: ${url}`);
      },
    );
});
server.listen(port, "127.0.0.1");
