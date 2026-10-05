# Adobe Firefly MCP Server & CLI changelog

## 3.0.0, 2026-10-05

Built on [Slipway](https://github.com/thenavidm/slipway) 0.1.17. The 14 tools keep their names and arguments, and every difference below was measured against 2.0.1, the last version on npm, before release.

- **A person approves each paid operation over MCP.** All ten still need confirmation. Claude Code (2.1.246 and later) shows its own prompt, and a client that can show forms asks with an approval form whose one box starts unticked. Approvals are signed, bound to the exact call and work once. Where a client can do neither, the model's `confirm: true` still counts, and `FIREFLY_CONFIRM=model` makes it enough everywhere. The refusal and the approval form both say what 2.0 said, that the call spends Firefly Services credits from the Adobe account, and the audit log records who approved each one.
- **`FIREFLY_ALLOW_DESTRUCTIVE=0` blocks all ten paid operations**, confirmed or not, and keeps uploads and reads. `FIREFLY_ALLOW_SPENDING=0`, 2.0's name for it, still works when the new one is unset.
- **Adobe's status picks the exit code.** A request Adobe rejects (400 or 422) exits 2 instead of 5, and a removed resource (410) 3 instead of 5. 401 and 403 still exit 4, 404 3, 429 7, a server error 5, and nothing configured 10. A setting that cannot be read, such as a timeout that is not a positive whole number, exits 10 instead of 5. 1 now means an unexpected error.
- **`which <words>` finds a command**, and `agent-context` describes every command, flag and setting as JSON. In Codex 0.159.3, finding the command that generates an image with Image Model 5 and its flags took a median of 83,169 input tokens over the CLI, where 2.0.1 took 83,184 (five runs each): every 3.0.0 run asked `which`, whose answer is shorter than the command list every 2.0.1 run read, and the general help it read first is 59 tokens longer.
- **`install <client>`** adds the server to Claude Code, Codex, Claude Desktop, Cursor, VS Code or Gemini CLI in each one's own format, and **`firefly-mcp --http`** serves the same tools over Streamable HTTP, on 127.0.0.1:8787 unless told otherwise.
- **A smaller tool list.** The paid tools' repeated parts, such as a source image and its URL, are written once and referred to, so the list is 12,426 o200k tokens instead of 13,558, and Claude Code 2.1.286 spends 16,786 tokens a message on it with every tool loaded instead of 18,530. Every tool accepts and refuses the same arguments.
- **Less work to start.** Each input and body schema now compiles on its first use rather than at load, and the entry turns on Node's compile cache. The server spends 170 ms of CPU before its first answer where 2.0.1 spent 267, and answers in 120 ms of wall time instead of 158 (median of 21 runs, taking turns on one busy Mac). npx installs 10 dependencies instead of 94. A test still compiles every schema.
- **No warning about `uuid4` at each call.** Adobe's schemas give image IDs the format `uuid4`, which the MCP SDK's validator does not know, so it warned on stderr at every call that compiled one. Clients are now told `uuid`, and the server still checks Adobe's own format.
- **`doctor --network` checks the credentials only**, as 2.0's did: it generates nothing and spends no credit.
- **Docs.** README section 7 has the measured Claude Code and Codex costs, where 2.0 said they were pending, and the exit codes include 1.

### Upgrading

Over MCP, expect an approval prompt or form before any paid operation; a headless agent that should run them with `confirm: true` alone needs `FIREFLY_CONFIRM=model`. A script that read exit 5 as a rejected request should read 2, as a removed resource 3, and as an unreadable setting 10. An error is now one JSON object with `error`, Slipway's `code` (`usage`, `refused`, `auth`, `not_found`, `rate_limited`, `api`, `not_configured`) and a `hint`, plus Adobe's `status` and its own error code in `details.reason` when Adobe answered; 2.0.1 printed the tool's JSON inside the `error` string. Over MCP, an argument that fails the schema comes back as the MCP SDK's own message, "Input validation error: …", instead of JSON. With `FIREFLY_READ_ONLY=1`, a client that calls a hidden tool gets "tool not found" instead of a refusal naming `FIREFLY_READ_ONLY`, and that call is not in the audit log; the CLI still names the setting. A refusal under the spending switch names `FIREFLY_ALLOW_DESTRUCTIVE`, whichever name set it. The audit log's lines gain `confirmed_by`, and each allowed call is followed by a `done` or `failed` line. A script that pipes JSON-RPC into the server must keep stdin open until it reads the answer: the server now stops when its input ends, as the MCP stdio binding asks. `--http` refuses a page from another site unless `FIREFLY_HTTP_ALLOWED_ORIGINS` lists it. Some terminal screens grew: the general help by 59 tokens, for `which`, `install`, the flags and the exit codes it now lists; the command list by 36, for its longer legend and the lines that say where to look next; and a missing argument's error by 15, for its code and a hint. Over MCP, Codex now prints `generative_expand` with its argument comments, so a discovery task read a median of 47,879 input tokens instead of 47,569. `SKILL.md` is 50 tokens longer in Claude Code, because it says how approval works over MCP and lists every exit code.

## 2.0.1, 2026-10-04

- **`npx -y @thenavidm/firefly-mcp-cli` starts the MCP server whatever order npm keeps.** npx starts whichever binary the npm registry lists first when they share one file, and the registry does not keep the published order. For this package that happened to be the server; for 23 others it was the CLI. A third binary named after the package, on its own file, now always starts the server, and npx picks it by name.

Use the native terminal capture at 1040 source pixels with lossless GIF optimization, displayed at 520 pixels, matching the Bluesky/Substack reference. Original assets remain available.

| Component | Version | Last updated |
| --- | --- | --- |
| firefly-mcp-cli | 2.0.1 | 2026-10-04 |
| Adobe API schemas | v3 images / v4 Image 5 | 2026-10-02 |
| Claude Desktop bundle | 2.0.0 | 2026-10-02 |

## 2.0.0 (2026-10-02)

The old server had seven MCP-only tools and no installable CLI or desktop extension. This version has 14 tools exposed through the same server, command-line adapter and bundled desktop package.

### Current Firefly operation coverage

Added `generate_image5`, `generate_video`, `upscale_image`, `precise_composite`, `adaptive_composite`, `get_job_status` and `list_custom_models`. All seven existing tool names remain.

Image 5 uses the v4 request schema and `x-model-version=image5`. Video uses the documented five-second operation. The implementation follows the official OpenAPI snapshot with its source, checked date and exact hash recorded.

### Corrected request and job behavior

Generative fill now calls `/v3/images/fill-async`. The old `n` field becomes `numVariations` where supported. The client accepts both result-link response shapes, handles nested outputs and refuses failed/cancelled jobs.

Paid generation POSTs are never automatically retried. A timed-out submission can already have been accepted. Poll existing jobs instead of spending again.

Sources require exactly one upload ID or HTTPS URL. Input is validated before any API request. Requested downloads use unique names, owner-only permissions, MIME-aware extensions and a size cap.

### MCP, CLI and desktop

The package is `@thenavidm/firefly-mcp-cli`, with `firefly-mcp` and `firefly-cli`. CLI help and schemas come from the actual MCP server through the shared in-memory adapter, so tool behavior does not diverge.

Added schema discovery, JSON/compact/agent modes, field selection, stable exit codes, setup diagnosis and login guidance. The `.mcpb` carries production dependencies and sensitive private credential fields.

### Spending and private data

Ten paid media operations require `confirm: true` or `--confirm`. `FIREFLY_ALLOW_SPENDING=0` blocks those operations. `FIREFLY_READ_ONLY=1` hides and refuses all writes.

Audit records contain guard decisions without prompts, local image paths or credentials. Authenticated polling stays on Adobe's Firefly origin. Downloads do not receive authorization headers.

Supplied access tokens now undergo an API read during verification rather than being treated as verified from their presence. OAuth network failures do not echo request data.

### Complete repository and guide setup

Added the standard logo, badges, terminal scene, full tools/arguments, client and OS installation, upgrade/removal instructions, FAQs, author block, dependencies, 20 GitHub topics and npm keywords. Added current official/community comparison sources and matching CMS guide content.

CI verifies Linux and Windows with supported Node versions. Releases build the package and desktop bundle, and publishing credentials live in GitHub Actions secrets rather than repository files.

### Breaking changes from 1.0.0

- Node 22 or newer is required.
- Paid generation needs explicit confirmation.
- Downloads now default off; use `download=true` or `--download`.
- `download=true` cannot be combined with `wait=false`.
- Unknown top-level arguments are refused.
- Supply both `width` and `height`, or a `size` object, without mixing them.
- Supplied background/object compositing uses the precise/adaptive tools, not an unsupported extra `objectUrl`.
- Image 5 uses its own tool and v4 schema.
- The existing AGPL-3.0-or-later license is preserved. Adobe Apache-2.0 schema notices remain included.

### Validation and outstanding evidence

41 behavioral tests, TypeScript build/typecheck, native MCP handshakes, clean-package binary checks, bundle handshakes and source/history/artifact secret scans pass. The production dependency audit has no findings; SECURITY.md records the unpatched development-only MCPB advisory.

Live generation remains unverified without an entitled Adobe account. Fresh token benchmarking was blocked by the Claude Code weekly limit on October 2, 2026. No measured number is substituted.

## 1.0.0 (2026-03-11)

Initial MCP-only implementation with seven tools: image generation, similar images, generative fill, generative expand, object composites, image upload and credential verification.

### 2026-03-12

Added the original agent skill. No API-tool version change was recorded.
