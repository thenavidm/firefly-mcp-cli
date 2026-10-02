# Install Adobe Firefly MCP Server & CLI

One npm package, `@thenavidm/firefly-mcp-cli`, includes both programs and all 14 tools.

| Program | Purpose | Who runs it |
| --- | --- | --- |
| `firefly-mcp` | Local stdio MCP server | Your AI client |
| `firefly-cli` | Shell commands with the same schemas and handlers | You or an AI agent with a terminal |
| `firefly-2.0.0.mcpb` | Bundled MCP server with private settings | Claude Desktop |

Choose your route below. You can install the package before configuring Adobe; discovery and local schemas work without credentials. Operations require Firefly Services API access. A consumer Firefly subscription does not establish API entitlement.

## Contents

| Section | What you will set up |
| --- | --- |
| [Requirements](#requirements) | Runtime and account |
| [CLI](#cli) | macOS, Linux and Windows terminal |
| [Adobe credentials](#adobe-credentials) | Private local configuration |
| [Claude Code](#claude-code) | User-scoped MCP registration |
| [Codex](#codex) | MCP or CLI |
| [Claude Desktop](#claude-desktop) | Extension or manual config |
| [Cursor](#cursor) | Private user config |
| [VS Code and Copilot](#vs-code-and-copilot) | Secure prompted inputs |
| [Windsurf](#windsurf) | Cascade config |
| [Zed](#zed) | Context server |
| [Gemini CLI](#gemini-cli) | User MCP settings |
| [Docker](#docker) | Local container |
| [Verify](#verify) | Discovery, auth and read-only |
| [Multiple accounts](#multiple-accounts) | Separate named instances |
| [Updates and removal](#updates-and-removal) | Version history and uninstall |
| [Troubleshooting](#troubleshooting) | PATH, env, JSON, auth and credits |
| [Development](#development) | Source build and checks |

## Requirements

| Requirement | Details |
| --- | --- |
| Node.js | 22 or newer, including npm, for CLI and manual MCP installs |
| AI client | Local stdio MCP support, or shell access for the CLI |
| Adobe account | A provisioned Firefly Services API project with OAuth Server-to-Server credentials |
| Credits | Generation, edits, composites and upscaling consume Adobe credits |
| Desktop extension | A Claude Desktop build that accepts custom .mcpb extensions; organization policies may restrict them |

Install Node from [nodejs.org](https://nodejs.org/en/download), then open a new terminal and run `node --version` and `npm --version`. The desktop archive bundles JavaScript dependencies; its manifest requires a compatible Node runtime supplied by the host.

## CLI

On macOS or Linux, use Terminal. On Windows, use PowerShell or Command Prompt:

~~~bash
npm install -g @thenavidm/firefly-mcp-cli@latest
firefly-cli --version
firefly-cli
firefly-cli generate-image5 --help
firefly-cli schema generate-image5
~~~

The bare command lists 14 tools when read-only is disabled. It does not generate anything. For a one-off invocation without a global install:

~~~bash
npx -y --package @thenavidm/firefly-mcp-cli@latest firefly-cli tools
~~~

If PowerShell blocks `npm.ps1`, use `npm.cmd` or Command Prompt in accordance with your machine's policy. If a global binary is missing, inspect `npm prefix -g` and add that installation's executable directory to PATH. Open a new terminal afterwards. Avoid installing with sudo just to resolve a PATH error.

### Give an agent the CLI skill

The package includes [SKILL.md](./SKILL.md). With a global install, it is at `<npm root -g>/@thenavidm/firefly-mcp-cli/SKILL.md`. Place a copy in your client's supported skills location, or ask it to read that file. Skill registration is client-specific; installing npm does not automatically register a skill. The skill checks installation, discovers flags, uses compact JSON and protects paid operations.

## Adobe credentials

1. Confirm [Firefly Services API access](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/) with your organization administrator or Adobe representative.
2. Open [Adobe Developer Console](https://developer.adobe.com/console) and the provisioned project.
3. Locate the Firefly API's OAuth Server-to-Server credential.
4. Copy the client ID and client secret into your private local environment or client settings.
5. Run `firefly-cli doctor`, then `firefly-cli doctor --network`. The first checks configuration. The second exchanges OAuth credentials, or validates an existing access token with a custom-model API read. Neither generates media.

Never paste real credentials into an AI conversation, repository, issue, screenshot or shared config. The placeholders in this document are not working credentials. `login` explains setup; it does not sign into Adobe or save tokens. The package does not automatically load .env files.

For the CLI, set `FIREFLY_CLIENT_ID` and `FIREFLY_CLIENT_SECRET` using your shell's private environment or secret manager. GUI apps often do not inherit a terminal's environment. Configure their private MCP environment separately. An existing `FIREFLY_ACCESS_TOKEN` can replace the client secret, but you must manage its expiry yourself. See the [complete settings reference](./README.md#15-environment-variables) for aliases, scope, timeouts, output and safety settings.

### Agent-guided setup

Paste this instruction, without any credential values:

> Help me install Adobe Firefly MCP Server & CLI using its INSTALL.md. Check Node and the binary, let me configure the Adobe credentials privately, then run discovery and doctor --network. Do not generate, upload files or spend credits during setup.

## Claude Code

For a user-scoped connection, after privately configuring credentials:

~~~bash
claude mcp add --scope user firefly -- npx -y @thenavidm/firefly-mcp-cli@latest
claude mcp list
~~~

Use the client's private local environment settings for both variables if they are not inherited. Claude's `-e NAME=value` registration option writes values into its config; only use it locally through your secret manager, with no shared command transcript. Never place credentials in a project .mcp.json. Reconnect and ask Claude to verify credentials.

Alternatively install the CLI, make SKILL.md available to Claude, and use shell commands. Registering both surfaces is optional.

## Codex

~~~bash
codex mcp add firefly -- npx -y @thenavidm/firefly-mcp-cli@latest
codex mcp list
~~~

Credentials must reach the server through private environment settings. `codex mcp add --env NAME=value` stores values in your local config, so never commit that config or put secrets in a shared command. In TOML, the equivalent server is:

~~~toml
[mcp_servers.firefly]
command = "npx"
args = ["-y", "@thenavidm/firefly-mcp-cli@latest"]
env_vars = ["FIREFLY_CLIENT_ID", "FIREFLY_CLIENT_SECRET"]
~~~

`env_vars` forwards those names from the environment available to Codex. If that environment does not contain them, configure private env settings locally. Codex can also call the CLI directly with SKILL.md and `--agent` output.

## Claude Desktop

### Install the .mcpb extension

1. Download `firefly-2.0.0.mcpb` from [GitHub Releases](https://github.com/thenavidm/firefly-mcp-cli/releases/latest).
2. Open Claude Desktop, then **Settings > Extensions > Advanced settings > Install Extension…** and select the file. Supported hosts may also associate a double-click with installation.
3. Enter the client ID and secret in the extension settings. The secret field is marked sensitive.
4. Choose read-only if you want only authentication, existing job status and custom-model reads.
5. Enable or reconnect the extension and ask Claude to verify credentials.

The archive includes production dependencies and no credentials. It is a local extension, not a hosted Adobe service. Keep a manually installed bundle up to date by installing the new release; this repository does not claim automatic extension updates or an official directory listing. If your organization blocks custom extensions, consult its administrator.

### Manual config

Open **Settings > Developer > Edit Config**, or use your platform's config file:

| OS | Typical config path |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json`; confirm the location through Edit Config in your installed build |

~~~json
{
  "mcpServers": {
    "firefly": {
      "command": "npx",
      "args": ["-y", "@thenavidm/firefly-mcp-cli@latest"],
      "env": {
        "FIREFLY_CLIENT_ID": "YOUR_FIREFLY_SERVICES_CLIENT_ID",
        "FIREFLY_CLIENT_SECRET": "YOUR_FIREFLY_SERVICES_CLIENT_SECRET"
      }
    }
  }
}
~~~

Replace the placeholders only in your private file. Merge the server entry into an existing mcpServers object instead of replacing other integrations. Fully quit and reopen Claude Desktop. Do not enable an extension and a manual entry with the same name; choose one route.

If a Windows launcher cannot execute npx directly, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@thenavidm/firefly-mcp-cli@latest"]`. An absolute node executable and installed `dist/index.js` path also avoids launcher/PATH problems.

## Cursor

Use private user settings at `~/.cursor/mcp.json`, or **Settings > Tools & MCP**. [Cursor documents environment interpolation and envFile support](https://cursor.com/docs/mcp).

~~~json
{
  "mcpServers": {
    "firefly": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@thenavidm/firefly-mcp-cli@latest"],
      "env": {
        "FIREFLY_CLIENT_ID": "${env:FIREFLY_CLIENT_ID}",
        "FIREFLY_CLIENT_SECRET": "${env:FIREFLY_CLIENT_SECRET}"
      }
    }
  }
}
~~~

The environment values must exist for the Cursor process. If you use envFile, keep that file private and outside version control. A project's .cursor/mcp.json must not contain actual credentials. Reconnect the server after saving.

## VS Code and Copilot

Use **MCP: Open User Configuration**. [VS Code uses servers and secure inputs](https://code.visualstudio.com/docs/agent-customization/mcp-servers), rather than a mcpServers root:

~~~json
{
  "inputs": [
    {"type": "promptString", "id": "firefly-client-id", "description": "Firefly Services client ID"},
    {"type": "promptString", "id": "firefly-client-secret", "description": "Firefly Services client secret", "password": true}
  ],
  "servers": {
    "firefly": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@thenavidm/firefly-mcp-cli@latest"],
      "env": {
        "FIREFLY_CLIENT_ID": "${input:firefly-client-id}",
        "FIREFLY_CLIENT_SECRET": "${input:firefly-client-secret}"
      }
    }
  }
}
~~~

Start Firefly through the MCP controls, approve trust if prompted, and enter credentials in the private input prompts. Workspace .vscode/mcp.json may contain this placeholder-only structure, but never resolved secret values. Remote development runs the server in the selected remote environment, so local file paths refer to that environment.

## Windsurf

Open Cascade's MCP settings or edit the private user file `~/.codeium/windsurf/mcp_config.json`. Use the Claude Desktop manual mcpServers block above with your locally configured env values. See [Windsurf's current MCP documentation](https://docs.devin.ai/desktop/cascade/mcp). Restart or reconnect Firefly in Cascade; project files must not contain secrets.

## Zed

Open **Settings > AI > MCP Servers > Add Server > Add Local Server**, or your user settings file. [Zed uses context_servers](https://zed.dev/docs/ai/mcp):

~~~json
{
  "context_servers": {
    "firefly": {
      "command": "npx",
      "args": ["-y", "@thenavidm/firefly-mcp-cli@latest"],
      "env": {
        "FIREFLY_CLIENT_ID": "YOUR_FIREFLY_SERVICES_CLIENT_ID",
        "FIREFLY_CLIENT_SECRET": "YOUR_FIREFLY_SERVICES_CLIENT_SECRET"
      }
    }
  }
}
~~~

Enter actual values only in private user settings. Check the active-server indicator before prompting. Do not wrap command and args inside a nested command object from older Zed examples.

## Gemini CLI

Merge the Claude Desktop manual mcpServers block into your private `~/.gemini/settings.json`. Configure the two env values locally, then restart Gemini CLI and inspect `/mcp`. See [Gemini CLI's MCP configuration](https://geminicli.com/docs/tools/mcp-server/). Its project settings must not contain real credentials. You can instead use the CLI from an agent shell.

Other local stdio clients use the same command and arguments, adapted to their config format. A client that only accepts a remote MCP URL cannot connect directly: this package does not ship a public HTTP listener. ChatGPT's remote connector setup is not a substitute for local stdio installation.

## Docker

Build the local image from a source checkout:

~~~bash
docker build -t firefly-mcp-cli .
docker run --rm -i --env FIREFLY_CLIENT_ID --env FIREFLY_CLIENT_SECRET firefly-mcp-cli
~~~

`--env NAME` forwards an existing local value. Keep stdin open with `-i` and omit `-t` for MCP. Never bake secrets into the image. No Docker registry image is published by this repository.

For local reference uploads, mount only the required folder read-only and pass the path inside the container. For downloads, mount a dedicated writable output folder and set FIREFLY_OUTPUT_DIR to its container path. A path on the desktop host is not automatically available inside a container.

## Verify

~~~bash
firefly-cli --version
firefly-cli tools
firefly-cli doctor
firefly-cli doctor --network
firefly-cli verify-credentials --agent
firefly-cli list-custom-models --limit 1 --agent
~~~

Expected version: 2.0.0. Discovery exposes 14 tools. `doctor` checks local settings; `doctor --network` makes an authentication request. OAuth success alone does not prove generation entitlement. An existing access token is checked against the custom-model endpoint, so an endpoint entitlement failure may appear there before generation.

On macOS/Linux, `FIREFLY_READ_ONLY=1 firefly-cli tools` shows three tools. In PowerShell, set `$env:FIREFLY_READ_ONLY='1'`, run `firefly-cli tools`, then remove that variable when you intend to enable writes. Read-only hides uploads and all generation. It cannot be overridden with --confirm.

Test a paid generation only when the user requests it and Adobe access is provisioned. Local tests and an MCP handshake do not establish account-specific API access or a successful installation in every desktop client.

## Multiple accounts

Use separate named server entries, such as firefly-work and firefly-personal, each with its own private env settings. For CLI scripts, launch separate processes with the intended account's environment. Tokens are cached only in process memory; there is no profile database. Use separate output folders and audit logs where separation matters.

## Updates and removal

Global CLI update:

~~~bash
npm install -g @thenavidm/firefly-mcp-cli@latest
firefly-cli --version
~~~

MCP configs above use @latest. Restart the MCP process to resolve a newer package; it does not hot-update while running. Pinned versions stay pinned. If npx keeps an unexpected version, inspect the client command and npm cache. Manually installed .mcpb archives need a new release downloaded and installed. Read [CHANGELOG.md](./CHANGELOG.md) before upgrading from legacy 1.x.

To remove the global package:

~~~bash
npm uninstall -g @thenavidm/firefly-mcp-cli
~~~

Remove the named MCP entry from each client too. Claude Code: `claude mcp remove --scope user firefly`. Codex: `codex mcp remove firefly`. In Claude Desktop, remove the extension through its settings or remove the manual entry, then restart. Remove a copied SKILL.md from your client's skills directory if you registered one.

Uninstallation does not remove generated images, audit logs or private credential settings in other clients. Review those locally. Rotate a secret in Adobe Developer Console if it was disclosed; removing a package does not revoke it.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Command not found | Node installation, npm prefix and PATH; reopen the terminal |
| Works in Terminal, fails in desktop | GUI environment and absolute executable path |
| Exit 10 | Missing client ID and either secret or access token |
| OAuth succeeds, generation returns 403 | Firefly endpoint entitlement and organization provisioning |
| Repeated 429 | Wait; read retries are bounded and paid submissions are never auto-retried |
| Generation times out | Poll the original job; do not blindly submit another paid request |
| JSON argument rejected | Run schema and quote one object per repeated array flag |
| Local image not found | Path on the server's machine or container, not your browser |
| Only three tools | FIREFLY_READ_ONLY is enabled |
| No extension install option | Update Claude Desktop or check organization restrictions |
| Remote connector refuses setup | Use a local stdio client or CLI shell |

Unix shells accept single-quoted JSON objects. Current PowerShell has native argument passing modes that differ from older Windows PowerShell. Start with a prompt-only command; if nested JSON loses its quotes, use PowerShell 7's supported native argument handling or run the example in WSL. Do not solve quoting errors by printing a credential-bearing environment.

~~~bash
firefly-cli generate-image5 --prompt "Warmer light" --referenceBlobs '{"source":{"uploadId":"UPLOAD_ID"},"usage":"general"}' --agent --confirm
~~~

The command consumes credits. Each --referenceBlobs flag is one object, not an array. See [README troubleshooting](./README.md#17-troubleshooting) and [issues](https://github.com/thenavidm/firefly-mcp-cli/issues). Share redacted errors and versions, never credentials or private signed media URLs.

## Development

~~~bash
git clone https://github.com/thenavidm/firefly-mcp-cli.git
cd firefly-mcp-cli
npm ci
npm run build
npm run typecheck
npm test
npm run check:counts
npm run build:mcpb
~~~

For a local source MCP connection, replace npx with node and the absolute dist/index.js path. Windows JSON paths need escaped backslashes or forward slashes. `npm link` exposes both source binaries globally; run `npm unlink -g @thenavidm/firefly-mcp-cli` when you return to the published package.

Review changes from `npm run sync:api` before committing an upstream schema update. Paid live tests require a separately configured Adobe account. The published runtime and desktop bundle omit development dependencies.
