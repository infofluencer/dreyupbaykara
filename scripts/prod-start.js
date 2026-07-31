#!/usr/bin/env node
/**
 * Production başlatıcı — her koşulda 3005'e bağlanır.
 * Dışarıdan gelen PORT (Dokploy/Nixpacks) yok sayılır.
 */
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const PORT = "3005";
const HOSTNAME = "0.0.0.0";

const candidates = [
  path.join(process.cwd(), "server.js"),
  path.join(__dirname, "..", ".next", "standalone", "server.js"),
];

const server = candidates.find((file) => existsSync(file));

if (!server) {
  console.error(
    "[prod-start] standalone server.js bulunamadı — önce `npm run build` çalıştırın.",
  );
  process.exit(1);
}

const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  cwd: path.dirname(server),
  env: { ...process.env, PORT, HOSTNAME },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
