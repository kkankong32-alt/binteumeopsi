// Test transport only: keep the original E2E URLs and assertions byte-identical
// while another user app owns 8765. Forward real HTTP bytes to our dist server.
import http from "node:http";
import net from "node:net";
function destination(raw) {
  const url = new URL(raw);
  if (url.hostname !== "127.0.0.1" || !["5187", "8765", "8768"].includes(url.port)) throw Error("Not an allowed QA origin");
  return { url, port: url.port === "8765" ? 8768 : Number(url.port) };
}
const proxy = http.createServer((req, res) => {
  if (req.url === "/health") { res.end("binteumeopsi QA transport"); return; }
  try {
    const { url, port } = destination(req.url);
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    delete headers["proxy-connection"];
    const outgoing = http.request({ hostname: "127.0.0.1", port, path: url.pathname + url.search, method: req.method, headers }, reply => {
      res.writeHead(reply.statusCode, reply.headers);
      reply.pipe(res);
    });
    outgoing.on("error", () => { res.writeHead(502); res.end("QA upstream unavailable"); });
    req.pipe(outgoing);
  } catch { res.writeHead(403); res.end("QA origin denied"); }
});
proxy.on("upgrade", (req, socket, head) => {
  try {
    const { url, port } = destination(req.url);
    const upstream = net.connect(port, "127.0.0.1", () => {
      const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
      upstream.write(`${req.method} ${url.pathname + url.search} HTTP/1.1\r\n${headers}\r\n\r\n`);
      if (head.length) upstream.write(head);
      upstream.pipe(socket); socket.pipe(upstream);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  } catch { socket.destroy(); }
});
proxy.listen(8879, "127.0.0.1", () => console.log("QA transport: 8879, production alias 8765 -> 8768"));
