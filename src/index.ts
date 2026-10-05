#!/usr/bin/env node
/**
 * Both binaries. `firefly-mcp` with no arguments serves MCP over stdio,
 * `--http` serves it over HTTP, and any command runs one tool from the shell.
 *
 * Node's compile cache goes on before the app loads, so every launch after the
 * first skips compiling it again. NODE_DISABLE_COMPILE_CACHE=1 turns it off.
 */

import * as nodeModule from "node:module";

nodeModule.enableCompileCache?.();
// 2.x's spending switch keeps working under its own name: FIREFLY_ALLOW_SPENDING=0 is FIREFLY_ALLOW_DESTRUCTIVE=0.
if (process.env.FIREFLY_ALLOW_SPENDING !== undefined && process.env.FIREFLY_ALLOW_DESTRUCTIVE === undefined) {
  process.env.FIREFLY_ALLOW_DESTRUCTIVE = process.env.FIREFLY_ALLOW_SPENDING;
}
const { app } = await import("./app.js");
await app.main();
