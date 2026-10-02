# Install Adobe Firefly MCP server and CLI

## Before you start

You need Node 22 or newer for the npm/source installation, an MCP-capable AI client or terminal, and Adobe Firefly Services API access. The API requires a provisioned Adobe Developer Console project with OAuth Server-to-Server credentials. A consumer Firefly subscription is not proof of API access. See [Adobe's prerequisites](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/).

2.0.0 is being verified and is not released yet. Until publication, use the source build and replace npx configs below with node plus the absolute dist/index.js path. Do not advertise a working npm install or release download before publication.

## Credential setup

1. Check Firefly Services API access with your Adobe representative or organization administrator.
2. Open [Adobe Developer Console](https://developer.adobe.com/console).
3. Open the project with the Firefly API and OAuth Server-to-Server credentials.
4. Copy the client ID and secret into your local shell or the MCP client's private environment configuration.
5. Run firefly-cli doctor --network. It checks OAuth without generating media.

Never put the secret in a repo, issue, chat or shared configuration. The examples below are placeholders. The CLI does not read .env files automatically and login only prints setup instructions. Authentication can succeed while an individual API endpoint is not entitled.

## Terminal and AI agents with a shell

After npm publication:

```bash
npm install -g @thenavidm/firefly-mcp-cli
firefly-cli --version
firefly-cli doctor
firefly-cli doctor --network
firefly-cli
firefly-cli generate-image5 --help
```

For the current source checkout:

```bash
npm ci
npm run build
npm link
firefly-cli --version
```

Set credentials through private environment settings before running the network check. To use a command without linking, run node /absolute/path/firefly-mcp-cli/dist/index.js tools or the desired command.

The agent skill ships as SKILL.md in the package. An agent should check --version, then discover commands and schemas before generating anything. --agent returns compact JSON and --select keeps needed fields. This does not remove the model's command or result token costs.

## Claude Code

After configuring the environment privately:

```bash
claude mcp add firefly -- npx -y @thenavidm/firefly-mcp-cli
claude mcp list
```

For source builds:

```bash
claude mcp add firefly -- node /absolute/path/firefly-mcp-cli/dist/index.js
```

Use the client's local environment configuration for FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET, then restart the connection. Local client settings containing secrets must never be committed. Ask Claude to list available custom models or verify credentials before requesting paid generation.

## Claude Desktop: .mcpb extension

1. Build with npm run build:mcpb, or download the .mcpb attached to a published GitHub release when available.
2. Open firefly-2.0.0.mcpb with a supported Claude Desktop version.
3. Enter the Firefly Services client ID and client secret in the extension's settings. The client-secret field is marked sensitive.
4. Enable read-only if you want only credential verification, job status and custom-model reads.
5. Restart or reconnect, then ask Claude to verify authentication.

The bundle includes production dependencies and no credentials. The runtime compatibility is Node 22 or newer. A successfully validated archive is not evidence that it has been installed in your desktop client.

## Claude Desktop: manual configuration

On macOS, the configuration is normally ~/Library/Application Support/Claude/claude_desktop_config.json. On Windows, it is normally %APPDATA%\Claude\claude_desktop_config.json. You can open the configuration location through the desktop client's developer settings.

Use this structure, replacing placeholders only in your private local file:

```json
{
  "mcpServers": {
    "firefly": {
      "command": "npx",
      "args": ["-y", "@thenavidm/firefly-mcp-cli"],
      "env": {
        "FIREFLY_CLIENT_ID": "YOUR_FIREFLY_SERVICES_CLIENT_ID",
        "FIREFLY_CLIENT_SECRET": "YOUR_FIREFLY_SERVICES_CLIENT_SECRET"
      }
    }
  }
}
```

For source builds on Windows, use node and an absolute dist/index.js path with escaped backslashes, for example C:\\tools\\firefly-mcp-cli\\dist\\index.js. Prefer an absolute node executable path when the desktop client cannot find Node. No credentials should be supplied as tool-call arguments.

## Codex

Configure credentials in private client environment settings, then register the stdio server:

```bash
codex mcp add firefly -- npx -y @thenavidm/firefly-mcp-cli
codex mcp list
```

For a source build, replace npx and its args with node and the absolute dist/index.js path. Alternatively, use firefly-cli directly from Codex's shell and the packaged skill.

## Cursor

Open Cursor's MCP settings and add a local stdio server. Its user configuration normally lives in ~/.cursor/mcp.json. Use a mcpServers block with type set to stdio, command npx and args [-y, @thenavidm/firefly-mcp-cli]. In JSON the args values are quoted strings. Set the two credential variables in its env object through private user settings. Cursor also supports envFile and environment interpolation as documented in [Cursor’s MCP setup](https://cursor.com/docs/mcp). A project .cursor/mcp.json must not contain real secrets; keep credential-bearing settings local to your user profile. Restart the MCP connection after changes.

## VS Code and GitHub Copilot

Open the MCP configuration through VS Code's MCP command. VS Code uses servers rather than mcpServers:

```json
{
  "servers": {
    "firefly": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@thenavidm/firefly-mcp-cli"]
    }
  }
}
```

Configure credentials through private local settings or secure prompted inputs supported by your client. Do not commit secrets in .vscode/mcp.json. Start the server from the MCP controls and inspect its logs if it does not appear.

## Gemini CLI and other MCP clients

Register a local stdio server with command npx and arguments -y @thenavidm/firefly-mcp-cli. The environment needs FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET. Use your client's private user configuration rather than a credential-bearing project file. The same standard mcpServers configuration works in clients that use that format.

A client that only accepts a remote HTTP MCP URL cannot connect directly to this stdio-only package. This repo does not ship a public remote listener.

## Docker

```bash
docker build -t firefly-mcp-cli .
docker run --rm -i --env FIREFLY_CLIENT_ID --env FIREFLY_CLIENT_SECRET firefly-mcp-cli
```

--env NAME forwards a local environment value without writing it into the image. Never bake credentials into a Dockerfile. No image is published by this repo.

## Shell JSON and Windows

On Bash or Zsh, quote a JSON object with single quotes:

```bash
firefly-cli generate-image5 --prompt "Warmer light" --referenceBlobs '{"source":{"uploadId":"UPLOAD_ID"},"usage":"general"}' --agent --confirm
```

In PowerShell, use single-quoted JSON and the appropriate native-argument passing mode for your PowerShell version. Start with a simple --prompt command and use --help/schema if JSON arguments are rejected. Arrays are repeatable flags; each --referenceBlobs argument is one object, not an entire array.

## Check the installation

1. --version must show 2.0.0.
2. The bare firefly-cli must list 14 commands when read-only is off.
3. doctor checks local configuration; doctor --network checks OAuth.
4. verify-credentials performs the same authentication read through the tool surface.
5. Read-only leaves three tools. Generation is intentionally hidden there.
6. Try a small generation only when your account is entitled and the user has requested it; Adobe credits apply.

See README.md for settings, workflow examples, data handling and troubleshooting. Live Adobe testing, npm publication and an actual desktop-client install are tracked separately from local build and bundle validation.
