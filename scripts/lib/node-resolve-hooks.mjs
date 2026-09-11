/**
 * Node resolve hook — test/simülasyon scriptlerinin Next.js kaynaklarını
 * doğrudan import edebilmesi için:
 *   - "@/x"        → <repo>/src/x   (tsconfig paths)
 *   - "server-only"/"client-only" → boş modül (Next bunları kendi alias'lar)
 */
import { pathToFileURL } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";

const SRC = path.resolve(import.meta.dirname, "../../src");
const EMPTY = "data:text/javascript,export{}";
const EXTENSIONS = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.js"];

export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: EMPTY, shortCircuit: true, format: "module" };
  }

  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    for (const ext of EXTENSIONS) {
      const candidate = base + ext;
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
