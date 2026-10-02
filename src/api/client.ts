import { randomUUID } from "node:crypto";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Config } from "../config.js";
import { FireflyError, UsageError } from "./errors.js";
const BASE = "https://firefly-api.adobe.io";
const AUTH = "https://ims-na1.adobelogin.com/ims/token/v3";
export type Json = Record<string, any>;
export class FireflyClient {
 private token = "";
 private expiresAt = 0;
 private authenticating?: Promise<string>;
 constructor(private readonly config: Config, private readonly fetcher: typeof fetch = fetch) {}
 private redact(text: string): string {
  for (const value of [this.config.clientSecret,this.config.accessToken,this.config.userToken,this.token]) if (value) text=text.split(value).join("[redacted]");
  return text;
 }
 private async json(response: Response, auth = false): Promise<Json> {
  const text = await response.text();
  if (!response.ok) {
   let code = "API_ERROR";
   try { const e=JSON.parse(text); code=String(e.error_code ?? e.error ?? code); } catch {}
   const hint = response.status===429 ? "Rate limited. Wait before retrying." : response.status===401||response.status===403 ? "Authentication or entitlement rejected. Check your Firefly Services project, credentials and scopes." : "Adobe rejected the request.";
   // Authentication responses can contain sensitive fields. Never return their body.
   throw new FireflyError(this.redact(`${hint} HTTP ${response.status}${auth?"":`: ${this.redact(text).slice(0,700)}`}`),response.status,this.redact(code));
  }
  try { return text ? JSON.parse(text) : {}; } catch { throw new FireflyError("Adobe returned an unexpected non-JSON response.",502); }
 }
 async getAccessToken(): Promise<string> {
  if (!this.config.clientId || (!this.config.clientSecret && !this.config.accessToken)) throw new FireflyError("No credentials are configured. Set FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET, or FIREFLY_ACCESS_TOKEN.",0,"CONFIG");
  if (this.config.accessToken) return this.config.accessToken;
  if (this.token && Date.now()<this.expiresAt-60000) return this.token;
  if (this.authenticating) return this.authenticating;
  this.authenticating=(async()=>{
   const response=await this.fetcher(AUTH,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",client_id:this.config.clientId,client_secret:this.config.clientSecret,scope:this.config.scopes}),signal:AbortSignal.timeout(this.config.timeoutMs),redirect:"error"});
   const data=await this.json(response,true);
   if (typeof data.access_token!=="string" || !data.access_token) throw new FireflyError("Authentication response did not contain an access token.",401);
   this.token=data.access_token; this.expiresAt=Date.now()+Number(data.expires_in ?? 3600)*1000;
   return this.token;
  })();
  try { return await this.authenticating; } finally {this.authenticating=undefined;}
 }
 async verifyCredentials(): Promise<Json> { await this.getAccessToken(); return {ok:true,authenticated:true,entitlementChecked:false,note:"Authentication succeeded. API entitlement is checked on each operation."}; }
 private trustedUrl(pathOrUrl: string): URL {
  const url=new URL(pathOrUrl,BASE);
  if (url.origin!==BASE || url.username || url.password || url.hash) throw new UsageError("Job URLs must use https://firefly-api.adobe.io with no embedded credentials.");
  return url;
 }
 async request(method: "GET"|"POST", path: string, body?: unknown, extraHeaders: Record<string,string> = {}, binary = false, deadline?: number): Promise<Json> {
  const url=this.trustedUrl(path);
  const attempts=method==="GET"?3:1;
  for (let attempt=0;attempt<attempts;attempt++) {
   const token=await this.getAccessToken();
   const budget=deadline===undefined?this.config.timeoutMs:Math.min(this.config.timeoutMs,deadline-Date.now());
   if (budget<=0) throw new FireflyError("Job polling timed out. Resume with get_job_status; do not submit the generation again.",408);
   let response: Response;
   try { response=await this.fetcher(url,{method,headers:{Authorization:`Bearer ${token}`,"x-api-key":this.config.clientId,"x-request-id":randomUUID(),Accept:"application/json",...(body!==undefined?{"Content-Type":"application/json"}:{}),...extraHeaders},...(body===undefined?{}:{body:binary?body as RequestInit["body"]:JSON.stringify(body)}),signal:AbortSignal.timeout(budget),redirect:"error"}); }
   catch (e) { throw new FireflyError(`${method==="POST"?"Submission failed or timed out; its outcome is unknown. Do not resubmit automatically.":"Adobe request failed."} ${this.redact((e as Error).message)}`,408); }
   if (method==="GET" && response.status===429 && attempt+1<attempts) {
    const raw=response.headers.get("retry-after");
    const seconds=raw?Number(raw):NaN;
    const ms=raw && !Number.isFinite(seconds) ? Date.parse(raw)-Date.now() : Number.isFinite(seconds)?seconds*1000:1000*2**attempt;
    if (!Number.isFinite(ms) || ms<0 || ms>30000 || (deadline!==undefined && Date.now()+ms>=deadline)) return this.json(response);
    await response.body?.cancel(); await new Promise(resolve=>setTimeout(resolve,ms)); continue;
   }
   return this.json(response);
  }
  throw new FireflyError("Rate limited.",429);
 }
 async upload(filePath: string): Promise<Json> {
  const types:Record<string,string>={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",".tif":"image/tiff",".tiff":"image/tiff",".jxl":"image/jxl"};
  const type=types[extname(filePath).toLowerCase()];
  if (!type) throw new UsageError("Upload requires a JPEG, PNG, WebP, TIFF or JXL file.");
  const info=await stat(filePath).catch(()=>{throw new FireflyError("Upload file not found.",404);});
  if (!info.isFile() || info.size>15*1024*1024 || info.size===0) throw new UsageError("Upload must be a nonempty regular image file no larger than 15 MB.");
  const data=await readFile(filePath);
  if (data.length>15*1024*1024) throw new UsageError("Upload exceeds 15 MB.");
  return this.request("POST","/v2/storage/image",data,{"Content-Type":type},true);
 }
 async getJobStatus(jobId: string): Promise<Json> { return this.request("GET",`/v3/status/${encodeURIComponent(jobId)}`); }
 async submit(path: string, body: Json, headers: Record<string,string>, wait: boolean): Promise<Json> {
  const submitted=await this.request("POST",path,body,headers);
  if (!wait) return submitted;
  const link=submitted.statusUrl ?? submitted.links?.result?.href;
  if (!link) {
   if (submitted.outputs || submitted.result?.outputs || submitted.status==="succeeded") return submitted;
   throw new FireflyError("Adobe accepted the operation without a known result URL. Inspect the job response before submitting again.",502);
  }
  const url=this.trustedUrl(link);
  if (!/^\/v3\/status\/[^/]+$/.test(url.pathname)) throw new UsageError("Unexpected job result path. Expected /v3/status/<jobId>.");
  const deadline=Date.now()+this.config.pollTimeoutMs;
  while (Date.now()<deadline) {
   const data=await this.request("GET",url.href,undefined,{},false,deadline);
   if (["failed","cancelled","cancel_pending","timeout"].includes(data.status)) throw new FireflyError(`Job ${data.status}. Inspect get_job_status before resubmitting.`,502);
   if (data.status==="succeeded" || data.outputs || data.result?.outputs) return data;
   if (Date.now()+this.config.pollIntervalMs>=deadline) break;
   await new Promise(resolve=>setTimeout(resolve,this.config.pollIntervalMs));
  }
  throw new FireflyError(`Job polling timed out. Resume with get_job_status for ${submitted.jobId ?? url.pathname.split("/").pop()}; do not submit the generation again.`,408);
 }
 async downloadOutputs(result: Json): Promise<Json> {
  const outputs=result.outputs ?? result.result?.outputs ?? [];
  const paths:string[]=[];
  for (const output of outputs) {
   const media=output.image ?? output.video;
   if (!media?.url) continue;
   const url=new URL(media.url);
   const trusted=["amazonaws.com","windows.net","dropboxusercontent.com","storage.googleapis.com","adobe.io","frontdoor.prod.azure.cxp.adobe.com"].some(h=>url.hostname===h||url.hostname.endsWith(`.${h}`));
   if (url.protocol!=="https:" || !trusted || url.username || url.password) throw new UsageError("Output download URL is not a supported Adobe storage host.");
   const response=await this.fetcher(url,{signal:AbortSignal.timeout(this.config.timeoutMs),redirect:"error"});
   if (!response.ok || !response.body) throw new FireflyError(`Output download failed. HTTP ${response.status}`,response.status);
   const limit=250*1024*1024;
   if (Number(response.headers.get("content-length"))>limit) {await response.body.cancel();throw new FireflyError("Output exceeds the 250 MB download limit.",413);}
   const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
   for (;;) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new FireflyError("Output exceeds the 250 MB download limit.",413);}chunks.push(value); }
   const types:Record<string,string>={"image/png":".png","image/jpeg":".jpg","image/webp":".webp","image/tiff":".tiff","image/jxl":".jxl","video/mp4":".mp4"};
   const type=response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
   const extension=types[type] ?? ".bin";
   await mkdir(this.config.outputDir,{recursive:true});const path=join(this.config.outputDir,`firefly-${randomUUID()}${extension}`);
   await writeFile(path,Buffer.concat(chunks),{flag:"wx",mode:0o600});paths.push(path);
  }
  return {...result,downloaded_to:paths};
 }
 async customModels(args: Json): Promise<Json> {
  const q=new URLSearchParams();
  for (const [key,value] of Object.entries(args)) q.set(key,String(value));
  if (q.has("limit") && !q.has("start")) q.set("start","0");
  return this.request("GET",`/v3/custom-models?${q}`,undefined,this.config.userToken?{"x-user-token":`Bearer ${this.config.userToken}`} : {});
 }
}
