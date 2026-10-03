# Adobe Firefly MCP Server & CLI changelog

## Unreleased

Use the native terminal capture at 1040 source pixels with lossless GIF optimization, displayed at 520 pixels, matching the Bluesky/Substack reference. Original assets remain available.

| Component | Version | Last updated |
| --- | --- | --- |
| firefly-mcp-cli | 2.0.0 | 2026-10-02 |
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
