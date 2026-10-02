import { describe,it,expect,vi } from "vitest";
import { loadConfig } from "../src/config.js";
import { FireflyClient } from "../src/api/client.js";
import { ALL_TOOLS,validateArguments } from "../src/tools/index.js";
import { buildServer } from "../src/server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtemp,writeFile,readFile,stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const config=()=>loadConfig({FIREFLY_CLIENT_ID:"test-id",FIREFLY_ACCESS_TOKEN:"test-token",FIREFLY_POLL_INTERVAL_MS:"1"});
const json=(data:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(data),{status,headers});
const tool=(name:string)=>ALL_TOOLS.find(t=>t.name===name)!;
async function connection(c=loadConfig({}),api=new FireflyClient(c)) {
 const server=buildServer(c,api);const [a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(b);const client=new Client({name:"tests",version:"1"});await client.connect(a);
 return {client,close:async()=>{await client.close();await server.close();}};
}
describe("Adobe contract and shared handlers",()=>{
 it("maps legacy n to numVariations and uses the current fill async endpoint",async()=>{
  const f=vi.fn().mockResolvedValue(json({jobId:"j",statusUrl:"https://firefly-api.adobe.io/v3/status/j"}));
  const api=new FireflyClient(config(),f);
  await tool("generative_fill").handler({imageUrl:"https://bucket.amazonaws.com/a.png",maskUrl:"https://bucket.amazonaws.com/m.png",n:2,wait:false},api);
  const [url,init]=f.mock.calls[0]!;
  expect(String(url)).toBe("https://firefly-api.adobe.io/v3/images/fill-async");
  expect(JSON.parse(init.body)).toEqual({image:{source:{url:"https://bucket.amazonaws.com/a.png"}},mask:{source:{url:"https://bucket.amazonaws.com/m.png"}},numVariations:2});
 });
 it("uses Image 5's current payload and model header",async()=>{
  const f=vi.fn().mockResolvedValue(json({links:{result:{href:"https://firefly-api.adobe.io/v3/status/j"}}}));
  await tool("generate_image5").handler({prompt:"Warm sunlight",resolutionLevel:"4MP",aspectRatio:"16:9",wait:false},new FireflyClient(config(),f));
  const [url,init]=f.mock.calls[0]!;expect(String(url)).toBe("https://firefly-api.adobe.io/v4/images/generate-async");
  expect(init.headers["x-model-version"]).toBe("image5");
  expect(JSON.parse(init.body)).toEqual({prompt:"Warm sunlight",resolutionLevel:"4MP",aspectRatio:"16:9"});
 });
 it("rejects bad variants and reference-edit ratios before any request",async()=>{
  const f=vi.fn();const api=new FireflyClient(config(),f);
  await expect(tool("generate_image5").handler({prompt:"x",numVariations:2},api)).rejects.toThrow(/Invalid arguments/);
  await expect(tool("generate_image5").handler({prompt:"x",referenceBlobs:[{source:{url:"https://bucket.amazonaws.com/a.png"},usage:"general"}],aspectRatio:"16:9"},api)).rejects.toThrow(/aspectRatio/);
  await expect(tool("generate_image").handler({prompt:"x",width:1000},api)).rejects.toThrow(/both width and height/);
  await expect(tool("generate_video").handler({},api)).rejects.toThrow(/Video requires/);
  expect(f).not.toHaveBeenCalled();
 });
 it("rejects unknown arguments instead of silently dropping them",()=>{
  expect(()=>validateArguments(tool("generate_image5"),{prompt:"x",negativePrompt:"outdated"})).toThrow(/additional properties/);
 });
 it.each(["generate_image","generate_image5","generate_similar","generative_fill","generative_expand","generate_object_composite","upscale_image"])("routes the generation schema for %s through one handler",name=>{
  const t=tool(name);expect(t.inputSchema.type).toBe("object");expect(t.risk).toBe("spend");
 });
});
describe("async jobs and credential boundaries",()=>{
 it("polls both response link shapes and returns the result wrapper",async()=>{
  for(const submission of [{statusUrl:"https://firefly-api.adobe.io/v3/status/j"},{links:{result:{href:"https://firefly-api.adobe.io/v3/status/j"}}}]) {
   const result={status:"succeeded",result:{outputs:[{image:{url:"https://bucket.amazonaws.com/out.png"}}]}};
   const f=vi.fn().mockResolvedValueOnce(json(submission)).mockResolvedValueOnce(json({status:"running"})).mockResolvedValueOnce(json(result));
   expect(await new FireflyClient(config(),f).submit("/v4/images/generate-async",{prompt:"x"},{},true)).toEqual(result);
   expect(f).toHaveBeenCalledTimes(3);
  }
 });
 it("never retries paid POST submissions after 429",async()=>{
  const f=vi.fn().mockResolvedValue(json({error:"quota exhausted"},429));
  await expect(new FireflyClient(config(),f).submit("/v4/images/generate-async",{prompt:"x"},{},false)).rejects.toThrow(/429/);
  expect(f).toHaveBeenCalledTimes(1);
 });
 it("keeps credentials off foreign URLs and refuses redirects",async()=>{
  const f=vi.fn().mockResolvedValue(json({statusUrl:"https://example.com/steal"}));
  await expect(new FireflyClient(config(),f).submit("/v3/images/generate-async",{prompt:"x"},{},true)).rejects.toThrow(/Job URLs/);
  expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0]?.[1].redirect).toBe("error");
  await expect(new FireflyClient(config(),f).request("GET","https://example.com/")).rejects.toThrow(/Job URLs/);
  expect(f).toHaveBeenCalledTimes(1);
 });
 it("does not turn a failed job into success",async()=>{
  const f=vi.fn().mockResolvedValueOnce(json({statusUrl:"https://firefly-api.adobe.io/v3/status/j"})).mockResolvedValueOnce(json({status:"failed"}));
  await expect(new FireflyClient(config(),f).submit("/v3/images/generate-async",{prompt:"x"},{},true)).rejects.toThrow(/Job failed/);
 });
 it("authenticates once for concurrent operations without revealing the token",async()=>{
  const c=loadConfig({FIREFLY_CLIENT_ID:"id",FIREFLY_CLIENT_SECRET:"private-secret"});
  const f=vi.fn().mockResolvedValue(json({access_token:"private-token",expires_in:3600}));
  const api=new FireflyClient(c,f);const result=await Promise.all([api.verifyCredentials(),api.verifyCredentials()]);
  expect(f).toHaveBeenCalledTimes(1);expect(JSON.stringify(result)).not.toContain("private-token");
 });
 it("redacts credentials in service errors, including when a response is truncated",async()=>{
  const f=vi.fn().mockResolvedValue(json({error:"test-token",message:"x".repeat(680)+"test-token"},401));
  try {await new FireflyClient(config(),f).request("GET","/v3/custom-models");throw new Error("did not reject");} catch(e) {
   expect(JSON.stringify(e)).not.toContain("test-token");expect((e as Error).message).toContain("401");
  }
 });
 it("uses the actual upload MIME type and limits files before authentication",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"firefly-test-"));const image=join(dir,"input.png");await writeFile(image,Buffer.from([137,80,78,71]));
  const f=vi.fn().mockResolvedValue(json({images:[{id:"upload"}]}));
  await new FireflyClient(config(),f).upload(image);expect(f.mock.calls[0]?.[1].headers["Content-Type"]).toBe("image/png");
  await expect(new FireflyClient(config(),f).upload(join(dir,"bad.exe"))).rejects.toThrow(/JPEG/);expect(f).toHaveBeenCalledTimes(1);
 });
});
describe("real MCP dispatch, read-only and audit",()=>{
 it("discovers all tools with no credentials and produces a configured error on use",async()=>{
  const c=await connection();try {
   const list=await c.client.listTools();expect(list.tools).toHaveLength(ALL_TOOLS.length);
   const result=await c.client.callTool({name:"verify_credentials",arguments:{}});expect(result.isError).toBe(true);
   expect(JSON.stringify(result)).toContain("No credentials are configured");
  } finally {await c.close();}
 });
 it("hides writes and refuses direct calls in read-only mode",async()=>{
  const config=loadConfig({FIREFLY_READ_ONLY:"true"});const f=vi.fn();const c=await connection(config,new FireflyClient(config,f));
  try {
   expect((await c.client.listTools()).tools.map(t=>t.name).sort()).toEqual(["get_job_status","list_custom_models","verify_credentials"]);
   const result=await c.client.callTool({name:"generate_image",arguments:{prompt:"x"}});expect(result.isError).toBe(true);expect(f).not.toHaveBeenCalled();
  } finally {await c.close();}
 });
 it("requires confirmation before spending credits through MCP",async()=>{
  const cfg=config();const f=vi.fn();const c=await connection(cfg,new FireflyClient(cfg,f));
  try { const result=await c.client.callTool({name:"generate_image5",arguments:{prompt:"x",wait:false}});
   expect(result.isError).toBe(true);expect(JSON.stringify(result)).toContain("confirm: true");expect(f).not.toHaveBeenCalled();
  } finally {await c.close();}
 });
 it("records an allowed write without recording prompt content or credentials",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"firefly-audit-"));const log=join(dir,"audit.jsonl");
  const cfig=loadConfig({FIREFLY_CLIENT_ID:"id",FIREFLY_ACCESS_TOKEN:"secret",FIREFLY_AUDIT_LOG:log});
  const f=vi.fn().mockResolvedValue(json({statusUrl:"https://firefly-api.adobe.io/v3/status/j"}));const c=await connection(cfig,new FireflyClient(cfig,f));
  try {const result=await c.client.callTool({name:"generate_image",arguments:{prompt:"sensitive campaign",wait:false,confirm:true}});expect(result.isError).not.toBe(true);
   const logged=await readFile(log,"utf8");expect(logged).toContain("allowed");expect(logged).not.toContain("sensitive campaign");expect(logged).not.toContain("secret");
  } finally {await c.close();}
 });
});

describe("paid requests, file downloads and hidden write auditing",()=>{
 it("rejects missing or conflicting image sources before networking",async()=>{
  const f=vi.fn();const api=new FireflyClient(config(),f);
  for (const source of [{},{url:""},{url:"https://bucket.amazonaws.com/a.png",uploadId:"986e8b25-6d40-4c5c-b2e5-f0d0dbf8ac36"},{url:"https://user:pass@bucket.amazonaws.com/a.png"}]) {
   await expect(tool("generate_image5").handler({prompt:"edit",referenceBlobs:[{source,usage:"general"}]},api)).rejects.toThrow(/source/);
  }
  expect(f).not.toHaveBeenCalled();
 });
 it("downloads unique files without forwarding Adobe credentials",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"firefly-download-"));
  const cfg={...config(),outputDir:dir};
  const f=vi.fn().mockImplementation(async()=>new Response(new Uint8Array([1,2,3]),{headers:{"content-type":"image/webp"}}));
  const api=new FireflyClient(cfg,f);const payload={result:{outputs:[{image:{url:"https://bucket.amazonaws.com/signed-result"}},{image:{url:"https://bucket.amazonaws.com/signed-result"}}]}};
  const result=await api.downloadOutputs(payload);expect(result.downloaded_to).toHaveLength(2);expect(new Set(result.downloaded_to).size).toBe(2);
  for (const path of result.downloaded_to) {expect(path.endsWith(".webp")).toBe(true);expect(await readFile(path)).toEqual(Buffer.from([1,2,3]));if(process.platform!=="win32")expect((await stat(path)).mode & 0o777).toBe(0o600);}
  for (const [,init] of f.mock.calls) {expect(init.headers).toBeUndefined();expect(init.redirect).toBe("error");}
 });
 it("refuses foreign and oversized output files",async()=>{
  const f=vi.fn().mockResolvedValue(new Response(new Uint8Array([1]),{headers:{"content-length":String(251*1024*1024)}}));
  const api=new FireflyClient(config(),f);
  await expect(api.downloadOutputs({outputs:[{image:{url:"https://example.com/image.png"}}]})).rejects.toThrow(/storage host/);expect(f).not.toHaveBeenCalled();
  await expect(api.downloadOutputs({outputs:[{image:{url:"https://bucket.amazonaws.com/image.png"}}]})).rejects.toThrow(/250 MB/);
 });
 it("does not guess a file format for an unknown MIME type",async()=>{
  const cfg={...config(),outputDir:await mkdtemp(join(tmpdir(),"firefly-format-"))};
  const f=vi.fn().mockResolvedValue(new Response(new Uint8Array([1]),{headers:{"content-type":"application/octet-stream"}}));
  const result=await new FireflyClient(cfg,f).downloadOutputs({outputs:[{video:{url:"https://bucket.amazonaws.com/media"}}]});expect(result.downloaded_to[0]).toMatch(/\.bin$/);
 });
 it("refuses an expired polling budget without sending a request",async()=>{
  const f=vi.fn();await expect(new FireflyClient(config(),f).request("GET","/v3/status/j",undefined,{},false,Date.now()-1)).rejects.toThrow(/Resume with get_job_status/);expect(f).not.toHaveBeenCalled();
 });
 it("never treats a failed response carrying outputs as successful",async()=>{
  const f=vi.fn().mockResolvedValueOnce(json({statusUrl:"https://firefly-api.adobe.io/v3/status/j"})).mockResolvedValueOnce(json({status:"failed",outputs:[]}));
  await expect(new FireflyClient(config(),f).submit("/v3/images/generate-async",{prompt:"x"},{},true)).rejects.toThrow(/Job failed/);
 });
 it("audits direct calls to a write hidden by read-only mode",async()=>{
  const audit=join(await mkdtemp(join(tmpdir(),"firefly-hidden-")),"audit.jsonl");
  const cfg=loadConfig({FIREFLY_READ_ONLY:"1",FIREFLY_AUDIT_LOG:audit});const f=vi.fn();const c=await connection(cfg,new FireflyClient(cfg,f));
  try {const result=await c.client.callTool({name:"generate_image",arguments:{prompt:"private idea"}});expect(result.isError).toBe(true);const log=await readFile(audit,"utf8");expect(log).toContain("blocked: read-only");expect(log).not.toContain("private idea");expect(f).not.toHaveBeenCalled();}finally{await c.close();}
 });
});
