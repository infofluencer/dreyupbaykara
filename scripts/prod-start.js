#!/usr/bin/env node
/**
 * Production başlatıcı — Dokploy/Traefik ile uyumlu.
 * PORT yoksa 3000 (Dokploy Domains varsayılanı).
 */
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || "3000";
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

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

console.log(`[prod-start] ${server} → ${HOSTNAME}:${PORT}`);

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
