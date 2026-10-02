import fs from "node:fs";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith("FIREFLY_")));
const client=new Client({name:"release-check",version:"1"});
const transport=new StdioClientTransport({command:process.execPath,args:["dist/index.js"],env});
try {
 await client.connect(transport);const {tools}=await client.listTools();
 const reads=tools.filter(t=>t.annotations?.readOnlyHint);
 const confirms=tools.filter(t=>"confirm" in (t.inputSchema.properties??{}));
 const manifest=JSON.parse(fs.readFileSync("desktop-extension/manifest.json","utf8"));
 assert.equal(manifest.version,pkg.version);
 assert.ok(manifest.description.includes(`${tools.length} tools`));
 assert.equal(manifest.user_config.client_secret.sensitive,true);
 for (const file of ["README.md","INSTALL.md"]) {
  const text=fs.readFileSync(file,"utf8");assert.ok(text.includes(`${tools.length} tools`)||text.includes(`${tools.length} commands`),`${file} has no matching tool count`);
  const slugs=new Set([...text.matchAll(/^#{1,6} (.+)$/gm)].map(m=>m[1].toLowerCase().replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-")));
  for (const match of text.matchAll(/\[[^\]]+\]\(#([^)]+)\)/g)) assert.ok(slugs.has(match[1]),`${file}: missing ${match[1]}`);
 }
 for(const t of tools) assert.ok(t.annotations && typeof t.annotations.readOnlyHint==="boolean",`${t.name}: missing annotations`);
 console.log(`Real stdio handshake: ${tools.length} tools, ${reads.length} reads, ${tools.length-reads.length} writes, ${confirms.length} spending confirmations. Metadata and docs agree.`);
} finally {await client.close();}
