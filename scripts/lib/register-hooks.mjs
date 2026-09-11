import { registerHooks } from "node:module";
import { resolve } from "./node-resolve-hooks.mjs";

registerHooks({ resolve });
