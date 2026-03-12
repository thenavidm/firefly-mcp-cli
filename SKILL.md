---
name: firefly
description: |
  Generate images from text, fill regions, expand images, and create composites using the Adobe Firefly API. Use when the user says "Firefly", "Adobe image generation", "generative fill", "generative expand", "outpainting", "object composite", or wants AI image generation via Adobe.
---

# Adobe Firefly API

Generative AI for images. Text-to-image, fill, expand, similar, and object composite.

## Links

| Resource | URL |
|----------|-----|
| Firefly app | [firefly.adobe.com](https://firefly.adobe.com/) |
| API docs | [developer.adobe.com/firefly-services/docs/firefly-api/](https://developer.adobe.com/firefly-services/docs/firefly-api/) |
| Developer Console | [developer.adobe.com/console](https://developer.adobe.com/console) |

## License required

The Firefly API is NOT included with a Creative Cloud subscription. You need a separate Firefly Services API license from [developer.adobe.com/firefly-services](https://developer.adobe.com/firefly-services/). Without it, the API won't appear in the Developer Console. Same applies to Photoshop API and Lightroom API.

## Authentication

OAuth 2.0 Server-to-Server (client credentials). Token exchange handled automatically.

## Tools

7 tools available:

| Tool | What it does |
|------|-------------|
| `generate_image` | Generate images from a text prompt |
| `generative_fill` | Fill/replace a region using AI (needs image + mask) |
| `generative_expand` | Expand image beyond borders (outpainting) |
| `generate_similar` | Generate images similar to a reference |
| `generate_object_composite` | Place object into scene with AI blending |
| `upload_image` | Upload local image for use in operations |
| `verify_credentials` | Check if API credentials are valid |

## Parameters

| Parameter | Range | Default |
|-----------|-------|---------|
| `width` | 512-2048 (divisible by 16) | varies |
| `height` | 512-2048 (divisible by 16) | varies |
| `n` | 1-4 variations | 1 |
| `contentClass` | `photo` or `art` | auto |

## Masks

For generative fill: white = fill area, black = keep. Upload mask with `upload_image` first.

## Rate limits

4 requests per minute, 9,000 per day.

## Output

Images save to output directory with `firefly-` prefix and timestamp.

## Cost

Uses Adobe generative credits. Pricing varies by plan.
