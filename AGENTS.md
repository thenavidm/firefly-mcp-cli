# Firefly MCP server and CLI

Read SKILL.md for usage and INSTALL.md for setup. Follow the shared MCP/CLI skill in the AI OS.

The CLI is copied from the house bridge asset. It connects to the real server through the SDK in-memory transport. Keep schemas, handlers, annotations and safety in one registry.

The API request schemas come from Adobe's official OpenAPI snapshot. Run npm run sync:api deliberately, review the diff, then build and test. The migration article and current OpenAPI disagree about Image 5 fields: follow the actual operation's schema and examples, and record discrepancies in COMPARISON.md.

Never auto-retry paid generation POSTs. Polling and reads may retry 429; a timed-out submission must not be resubmitted automatically. Validate before acquiring credentials or sending a request. Authenticated job URLs stay on https://firefly-api.adobe.io; never send credentials to a caller-provided host.

Do not print credentials or persist access tokens. Read-only hides all generation and upload tools. Keep the existing license. Do not claim a live API run, npm release, desktop install or token measurement from passing mocked tests.

Use the configured maintainer commit identity. Run build, typecheck, tests, check:counts and build:mcpb before a release.

README, INSTALL, SKILL and CHANGELOG must follow the complete current Bluesky/Substack structure. Preserve factual accuracy rather than copying their stale package names or counts. Keep logo, badges, terminal scene, topics, author block, dependencies, upgrade/removal, full tools/arguments and release links current.
