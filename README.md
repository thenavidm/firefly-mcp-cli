# Firefly MCP

MCP server for the [Adobe Firefly](https://www.adobe.com/products/firefly.html) API. Generate images from text, fill regions, expand images, create composites, and more from Claude Code, Claude Desktop, Cursor, Windsurf, or any MCP-compatible client.

## What you can do

- Generate images from text prompts (text-to-image)
- Fill or replace regions of an image with AI (generative fill)
- Expand images beyond their borders (generative expand / outpainting)
- Generate images similar to a reference image
- Composite objects into scenes with AI-matched lighting
- Upload images for use as references, masks, or sources

## Prerequisites

- Node.js 18+
- Adobe Developer Console account
- OAuth Server-to-Server credentials with Firefly API access

## Getting credentials

1. Go to [Adobe Developer Console](https://developer.adobe.com/console)
2. Create a new project
3. Add the "Firefly - Firefly Services" API
4. Select "OAuth Server-to-Server" credential type
5. Copy your Client ID and Client Secret

## Installation

```bash
git clone <repo-url>
cd firefly-mcp
npm install
```

## Configuration

### Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "firefly": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/firefly-mcp/index.mjs"],
      "env": {
        "FIREFLY_CLIENT_ID": "<your-client-id>",
        "FIREFLY_CLIENT_SECRET": "<your-client-secret>",
        "FIREFLY_OUTPUT_DIR": "/path/to/image/output"
      }
    }
  }
}
```

### Claude Desktop (macOS)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "firefly": {
      "command": "node",
      "args": ["/path/to/firefly-mcp/index.mjs"],
      "env": {
        "FIREFLY_CLIENT_ID": "<your-client-id>",
        "FIREFLY_CLIENT_SECRET": "<your-client-secret>",
        "FIREFLY_OUTPUT_DIR": "/path/to/image/output"
      }
    }
  }
}
```

### Claude Desktop (Windows)

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "firefly": {
      "command": "node",
      "args": ["C:\\path\\to\\firefly-mcp\\index.mjs"],
      "env": {
        "FIREFLY_CLIENT_ID": "<your-client-id>",
        "FIREFLY_CLIENT_SECRET": "<your-client-secret>",
        "FIREFLY_OUTPUT_DIR": "C:\\path\\to\\image\\output"
      }
    }
  }
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREFLY_CLIENT_ID` | Yes | OAuth Client ID from Adobe Developer Console |
| `FIREFLY_CLIENT_SECRET` | Yes | OAuth Client Secret from Adobe Developer Console |
| `FIREFLY_OUTPUT_DIR` | No | Directory for downloaded images (default: `~/outputs/images/`) |

## Tools

7 tools:

| Tool | Description |
|------|-------------|
| `generate_image` | Generate images from a text prompt |
| `generative_fill` | Fill or replace a region of an image using AI |
| `generative_expand` | Expand an image beyond its borders (outpainting) |
| `generate_similar` | Generate images similar to a reference image |
| `generate_object_composite` | Place an object into a scene with AI blending |
| `upload_image` | Upload a local image for use in other operations |
| `verify_credentials` | Verify your API credentials are valid |

## Things to know

- **Authentication**: OAuth 2.0 Server-to-Server (client credentials). Tokens are cached and auto-refreshed
- **Async operations**: Image generation uses async endpoints with automatic polling
- **Image sizes**: Width and height must be 512-2048 and divisible by 16
- **Variations**: Generate up to 4 variations per request
- **Content classes**: Use `photo` for photorealistic or `art` for artistic styles
- **Upload formats**: JPEG, PNG, and WebP supported
- **Rate limits**: 4 requests per minute, 9,000 per day (default)
- **Downloaded images**: Saved with `firefly-` prefix and timestamp in the output directory
- **API scope**: Image generation only (no video editing via API)

## Pricing

Firefly API uses generative credits. Pricing varies by plan and volume. See [Adobe Firefly pricing](https://www.adobe.com/products/firefly/pricing.html) for details.

## License

AGPL-3.0 - Copyright (C) 2026 [Navid Moazzez](https://navid.me) | [CreatorSchool.ai](https://creatorschool.ai)
