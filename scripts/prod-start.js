#!/usr/bin/env node
/**
 * Production start — always bind 3005 (Dokploy PORT override'ını ezer).
 */
process.env.PORT = "3005";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

const { spawn } = require("node:child_process");

const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "0.0.0.0",
    "--port",
    "3005",
  ],
  { stdio: "inherit", env: { ...process.env, PORT: "3005" } },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
