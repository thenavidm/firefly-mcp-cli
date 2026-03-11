import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const CLIENT_ID = process.env.FIREFLY_CLIENT_ID;
const CLIENT_SECRET = process.env.FIREFLY_CLIENT_SECRET;
const OUTPUT_DIR = process.env.FIREFLY_OUTPUT_DIR || join(homedir(), "outputs", "images");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET environment variables are required");
  process.exit(1);
}

const BASE_URL = "https://firefly-api.adobe.io";
const AUTH_URL = "https://ims-na1.adobelogin.com/ims/token/v3";

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "openid,AdobeID,firefly_api,ff_apis",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth failed ${response.status}: ${text}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return accessToken;
}

async function apiRequest(method, path, { body, contentType } = {}) {
  const token = await getAccessToken();
  const url = `${BASE_URL}${path}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": CLIENT_ID,
    Accept: "application/json",
  };

  const options = { method, headers };

  if (body && contentType === "image") {
    // Binary upload
    headers["Content-Type"] = contentType;
    options.body = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Firefly API error ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { result: text };
  }
}

async function downloadImage(url, prefix) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${prefix}-${timestamp}.png`;
  const filepath = join(OUTPUT_DIR, filename);

  await writeFile(filepath, buffer);
  return filepath;
}

async function pollJob(jobUrl, maxAttempts = 60) {
  const token = await getAccessToken();

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(jobUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": CLIENT_ID,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Poll error ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.status === "succeeded" || data.outputs) {
      return data;
    }

    if (data.status === "failed") {
      throw new Error(`Job failed: ${JSON.stringify(data)}`);
    }

    // Wait 2 seconds between polls
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Job timed out after polling");
}

function formatResponse(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

async function handleTool(fn) {
  try {
    const result = await fn();
    return formatResponse(result);
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
}

// ─── Size schemas ───

const imageSizeSchema = {
  width: z.number().optional().describe("Image width (512-2048, must be divisible by 16)"),
  height: z.number().optional().describe("Image height (512-2048, must be divisible by 16)"),
};

const server = new McpServer({
  name: "firefly-mcp",
  version: "1.0.0",
});

// ─── Text to Image ───

server.tool(
  "generate_image",
  "Generate an image from a text prompt using Adobe Firefly. Returns generated image URLs and optionally downloads them",
  {
    prompt: z.string().describe("Text description of the image to generate"),
    negativePrompt: z.string().optional().describe("What to exclude from the image"),
    n: z.number().min(1).max(4).optional().describe("Number of images to generate (1-4, default 1)"),
    contentClass: z
      .enum(["photo", "art"])
      .optional()
      .describe("Content type: 'photo' for photorealistic, 'art' for artistic"),
    ...imageSizeSchema,
    download: z.boolean().optional().describe("Download images to output directory (default true)"),
  },
  ({ prompt, negativePrompt, n, contentClass, width, height, download = true }) =>
    handleTool(async () => {
      const body = { prompt };
      if (negativePrompt) body.negativePrompt = negativePrompt;
      if (n) body.n = n;
      if (contentClass) body.contentClass = contentClass;
      if (width || height) body.size = {};
      if (width) body.size.width = width;
      if (height) body.size.height = height;

      // Use async endpoint
      const response = await apiRequest("POST", "/v3/images/generate-async", { body });

      // Poll for result
      let result;
      if (response.statusUrl) {
        result = await pollJob(response.statusUrl);
      } else if (response.outputs) {
        result = response;
      } else {
        result = response;
      }

      // Download images
      if (download && result.outputs) {
        const downloads = [];
        for (const output of result.outputs) {
          if (output.image && output.image.url) {
            const filepath = await downloadImage(output.image.url, "firefly");
            downloads.push(filepath);
          }
        }
        result.downloaded_to = downloads;
      }

      return result;
    })
);

// ─── Generative Fill ───

server.tool(
  "generative_fill",
  "Fill or replace a region of an image using AI. Requires an image and a mask (white areas get filled)",
  {
    prompt: z.string().optional().describe("Text description of what to fill the masked area with"),
    imageUrl: z.string().describe("URL of the source image"),
    maskUrl: z.string().describe("URL of the mask image (white = fill area, black = keep)"),
    n: z.number().min(1).max(4).optional().describe("Number of variations (1-4)"),
    ...imageSizeSchema,
    download: z.boolean().optional().describe("Download result images (default true)"),
  },
  ({ prompt, imageUrl, maskUrl, n, width, height, download = true }) =>
    handleTool(async () => {
      const body = {
        image: { source: { url: imageUrl } },
        mask: { source: { url: maskUrl } },
      };
      if (prompt) body.prompt = prompt;
      if (n) body.n = n;
      if (width || height) body.size = {};
      if (width) body.size.width = width;
      if (height) body.size.height = height;

      const response = await apiRequest("POST", "/v3/images/fill", { body });

      let result = response;
      if (response.statusUrl) {
        result = await pollJob(response.statusUrl);
      }

      if (download && result.outputs) {
        const downloads = [];
        for (const output of result.outputs) {
          if (output.image && output.image.url) {
            const filepath = await downloadImage(output.image.url, "firefly-fill");
            downloads.push(filepath);
          }
        }
        result.downloaded_to = downloads;
      }

      return result;
    })
);

// ─── Generative Expand ───

server.tool(
  "generative_expand",
  "Expand an image beyond its borders using AI (outpainting). Resize to larger dimensions and AI fills the new areas",
  {
    prompt: z.string().optional().describe("Text description to guide the expanded content"),
    imageUrl: z.string().describe("URL of the source image to expand"),
    width: z.number().describe("Target width (must be >= original width)"),
    height: z.number().describe("Target height (must be >= original height)"),
    n: z.number().min(1).max(4).optional().describe("Number of variations (1-4)"),
    download: z.boolean().optional().describe("Download result images (default true)"),
  },
  ({ prompt, imageUrl, width, height, n, download = true }) =>
    handleTool(async () => {
      const body = {
        image: { source: { url: imageUrl } },
        size: { width, height },
      };
      if (prompt) body.prompt = prompt;
      if (n) body.n = n;

      const response = await apiRequest("POST", "/v3/images/expand-async", { body });

      let result = response;
      if (response.statusUrl) {
        result = await pollJob(response.statusUrl);
      }

      if (download && result.outputs) {
        const downloads = [];
        for (const output of result.outputs) {
          if (output.image && output.image.url) {
            const filepath = await downloadImage(output.image.url, "firefly-expand");
            downloads.push(filepath);
          }
        }
        result.downloaded_to = downloads;
      }

      return result;
    })
);

// ─── Generate Similar ───

server.tool(
  "generate_similar",
  "Generate images similar to a reference image",
  {
    imageUrl: z.string().describe("URL of the reference image"),
    n: z.number().min(1).max(4).optional().describe("Number of similar images to generate (1-4)"),
    ...imageSizeSchema,
    download: z.boolean().optional().describe("Download result images (default true)"),
  },
  ({ imageUrl, n, width, height, download = true }) =>
    handleTool(async () => {
      const body = {
        image: { source: { url: imageUrl } },
      };
      if (n) body.n = n;
      if (width || height) body.size = {};
      if (width) body.size.width = width;
      if (height) body.size.height = height;

      const response = await apiRequest("POST", "/v3/images/generate-similar-async", { body });

      let result = response;
      if (response.statusUrl) {
        result = await pollJob(response.statusUrl);
      }

      if (download && result.outputs) {
        const downloads = [];
        for (const output of result.outputs) {
          if (output.image && output.image.url) {
            const filepath = await downloadImage(output.image.url, "firefly-similar");
            downloads.push(filepath);
          }
        }
        result.downloaded_to = downloads;
      }

      return result;
    })
);

// ─── Object Composite ───

server.tool(
  "generate_object_composite",
  "Place an object into a scene with AI-generated blending and lighting",
  {
    prompt: z.string().optional().describe("Text description to guide the composite"),
    imageUrl: z.string().describe("URL of the background/scene image"),
    objectUrl: z.string().describe("URL of the object image to composite"),
    maskUrl: z.string().optional().describe("URL of the mask indicating where to place the object"),
    n: z.number().min(1).max(4).optional().describe("Number of variations (1-4)"),
    download: z.boolean().optional().describe("Download result images (default true)"),
  },
  ({ prompt, imageUrl, objectUrl, maskUrl, n, download = true }) =>
    handleTool(async () => {
      const body = {
        image: { source: { url: imageUrl } },
        object: { source: { url: objectUrl } },
      };
      if (prompt) body.prompt = prompt;
      if (maskUrl) body.mask = { source: { url: maskUrl } };
      if (n) body.n = n;

      const response = await apiRequest("POST", "/v3/images/generate-object-composite-async", { body });

      let result = response;
      if (response.statusUrl) {
        result = await pollJob(response.statusUrl);
      }

      if (download && result.outputs) {
        const downloads = [];
        for (const output of result.outputs) {
          if (output.image && output.image.url) {
            const filepath = await downloadImage(output.image.url, "firefly-composite");
            downloads.push(filepath);
          }
        }
        result.downloaded_to = downloads;
      }

      return result;
    })
);

// ─── Upload Image ───

server.tool(
  "upload_image",
  "Upload an image to Firefly's temporary storage for use as a reference, mask, or source in other operations. Returns an upload ID",
  {
    filePath: z.string().describe("Local file path of the image to upload (JPEG, PNG, or WebP)"),
  },
  ({ filePath }) =>
    handleTool(async () => {
      const buffer = await readFile(filePath);

      const ext = filePath.toLowerCase().split(".").pop();
      const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      const contentType = mimeTypes[ext] || "image/png";

      const token = await getAccessToken();
      const response = await fetch(`${BASE_URL}/v2/storage/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": CLIENT_ID,
          "Content-Type": contentType,
          "Content-Length": String(buffer.length),
        },
        body: buffer,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed ${response.status}: ${text}`);
      }

      return await response.json();
    })
);

// ─── Verify Credentials ───

server.tool(
  "verify_credentials",
  "Verify that your Firefly API credentials are valid by obtaining an access token",
  {},
  () =>
    handleTool(async () => {
      const token = await getAccessToken();
      return {
        valid: true,
        message: "Credentials are valid. Access token obtained successfully.",
        token_preview: token.slice(0, 10) + "...",
      };
    })
);

// ─── Start server ───

const transport = new StdioServerTransport();
await server.connect(transport);
