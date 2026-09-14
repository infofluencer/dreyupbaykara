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

/*
  public/ dışında tutulan, sunucunun fs ile okuduğu varlıklar (WhatsApp ilk
  mesaj görseli). outputFileTracingIncludes bunları zaten kopyalar; burada da
  kopyalayarak tracing'e bağımlı kalmıyoruz.
*/
const assetsDir = path.join(root, "assets");
if (existsSync(assetsDir)) {
  cpSync(assetsDir, path.join(standalone, "assets"), { recursive: true });
}

const staticDir = path.join(root, ".next", "static");
if (existsSync(staticDir)) {
  mkdirSync(path.join(standalone, ".next"), { recursive: true });
  cpSync(staticDir, path.join(standalone, ".next", "static"), {
    recursive: true,
  });
}

console.log("[copy-standalone-assets] public + assets + .next/static kopyalandı");
