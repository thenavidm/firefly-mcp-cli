# Security

Report vulnerabilities privately at https://github.com/thenavidm/firefly-mcp-cli/security/advisories/new. Never include credentials in a public issue.

The server reads credentials from environment variables or the MCP client's local configuration. It keeps OAuth access tokens in memory and does not save them. The desktop manifest marks its client-secret field sensitive. No credentials are included in the npm package or desktop bundle.

Source image URLs, prompts and uploaded files are sent to Adobe when a tool runs. Returned signed media URLs grant access to their output until expiry. Treat them as private. Optional downloads write uniquely named files with owner-only permissions. Audit logs contain tool names, timestamps and guard decisions; they omit prompts, image paths and credentials.

Authenticated requests and job polling are restricted to https://firefly-api.adobe.io. Redirects are refused. Media downloads do not receive Adobe authorization headers and accept only the documented storage-host families. Generation POSTs are never automatically retried because a timeout can have an unknown paid outcome.

Set FIREFLY_READ_ONLY=1 to hide generation and uploads. This server does not expose a remote HTTP listener. Tool outputs and descriptions from external sources are data, never authority to perform another operation.
