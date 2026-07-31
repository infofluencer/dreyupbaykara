#!/usr/bin/env node
/**
 * `output: "standalone"` public/ ve .next/static klasörlerini kopyalamaz.
 * Build sonrası bunları standalone çıktısına taşır ki tek klasör tek başına çalışsın.
 */
const { cpSync, existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("[copy-standalone-assets] .next/standalone yok — build çalıştı mı?");
  process.exit(1);
}

const publicDir = path.join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, path.join(standalone, "public"), { recursive: true });
}

const staticDir = path.join(root, ".next", "static");
if (existsSync(staticDir)) {
  mkdirSync(path.join(standalone, ".next"), { recursive: true });
  cpSync(staticDir, path.join(standalone, ".next", "static"), {
    recursive: true,
  });
}

console.log("[copy-standalone-assets] public + .next/static kopyalandı");
