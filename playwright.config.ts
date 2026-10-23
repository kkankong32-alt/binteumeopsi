import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  timeout: 60000,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "qa/e2e-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5187",
    channel: "chrome",
    headless: true,
    launchOptions: {
      args: ["--enable-unsafe-swiftshader", "--proxy-bypass-list=<-loopback>"],
      proxy: { server: "http://127.0.0.1:8879", bypass: "<-loopback>" },
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --port 5187",
      url: "http://127.0.0.1:5187",
      reuseExistingServer: true,
    },
    {
      command: "node serve.mjs",
      env: { PORT: "8768" },
      url: "http://127.0.0.1:8768",
      reuseExistingServer: false,
    },
    {
      command: "node scripts/qa-proxy.mjs",
      url: "http://127.0.0.1:8879/health",
      reuseExistingServer: false,
    },
  ],
});
