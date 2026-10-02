# Changelog

## 2.0.0 (unreleased)

- Add the house CLI, generated from the MCP server's real tools/list, and a vendored Claude Desktop .mcpb build.
- Upgrade to TypeScript and the current MCP SDK. Publishable package name is @thenavidm/firefly-mcp-cli with firefly-mcp and firefly-cli binaries.
- Cover all ten media operations in the official Adobe OpenAPI snapshot reviewed October 2, 2026: Image 5 generation/editing, video, precise/adaptive composites and upscaling join the existing image operations.
- Fix fill to /v3/images/fill-async and normalize legacy n to numVariations. Keep all seven legacy tool names; add seven tools for a total of 14.
- Poll both statusUrl and links.result.href; handle result.outputs and failed/cancelled jobs. Do not automatically retry paid submissions.
- Apply the existing Midjourney spending guard to paid media tools: confirm=true or --confirm is required, and FIREFLY_ALLOW_SPENDING=0 blocks spending.
- Add schema validation before API calls, read-only tool filtering, audit decisions without private payloads, credential redaction and safe authenticated job URLs.
- Keep optional media downloads with unique filenames. Downloads now default off; use download=true or --download explicitly. download cannot be combined with wait=false.
- Add doctor, login instructions, an agent skill, detailed client installation, comparison notes and automated packaging checks.

### Breaking changes

Firefly Services API access is required. This package does not automate the consumer Firefly website.

Image 5 is a separate generate_image5 tool with the v4 payload and x-model-version=image5. Consult schema generate-image5, rather than passing older generate_image fields.

Use the documented image/mask/background/object source structures. The old generate_object_composite object's extra objectUrl argument was not supported by Adobe's object-composite schema; use precise_composite or adaptive_composite for a supplied background and object.

Source images can use uploadId or a supported presigned URL. n, width/height, imageUrl and maskUrl remain compatibility aliases where the corresponding Adobe fields exist. Unknown arguments are refused instead of ignored.

Node 22 or newer is required. The existing AGPL-3.0-or-later license is retained.

## 1.0.0

Initial MCP-only implementation with seven image and credential tools.
