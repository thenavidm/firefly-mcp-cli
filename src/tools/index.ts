import operationsData from "./operations.json" with { type: "json" };
import { Ajv, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { FireflyClient, type Json } from "../api/client.js";
import { UsageError } from "../api/errors.js";
import type { Config } from "../config.js";
import type { Risk } from "../safety.js";
export type Operation = {name:string;path:string;title:string;description:string;bodySchema:Json;headers:Record<string,string>};
const operations=operationsData as unknown as Operation[];
const ajv=new Ajv({allErrors:true,strict:false});
(addFormats as unknown as (a:Ajv)=>void)(ajv);
ajv.addFormat("uuid4",/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const positive={type:"integer",minimum:1,maximum:4096};
export type ToolSpec = {name:string;title:string;description:string;inputSchema:Json;risk:Risk;handler:(args:Json,client:FireflyClient)=>Promise<unknown>};
function validate(check:ValidateFunction,args:unknown):void {
 if (!check(args)) throw new UsageError(ajv.errorsText(check.errors,{separator:"; "}));
}
function normalize(args:Json):Json {
 const {wait,download,confirm,n,width,height,imageUrl,maskUrl,...body}=args;
 if (n!==undefined) { if (body.numVariations!==undefined && n!==body.numVariations) throw new UsageError("n and numVariations disagree.");body.numVariations=n; }
 if (width!==undefined || height!==undefined) {
  if (width===undefined || height===undefined || body.size!==undefined) throw new UsageError("Provide both width and height, or a size object, without mixing them.");
  body.size={width,height};
 }
 for (const [alias,key] of [[imageUrl,"image"],[maskUrl,"mask"]] as const) if (alias!==undefined) {
  if (body[key]!==undefined) throw new UsageError(`Use either ${key} or its URL alias, not both.`);
  body[key]={source:{url:alias}};
 }
 return body;
}
function validateSources(value:unknown):void {
 if (Array.isArray(value)) { value.forEach(validateSources);return; }
 if (!value || typeof value!=="object") return;
 for (const [key,item] of Object.entries(value)) {
  if (key==="source" && item && typeof item==="object") {
   const source=item as Json;
   const hasUrl=typeof source.url==="string" && source.url.trim().length>0;
   const hasUpload=typeof source.uploadId==="string" && source.uploadId.trim().length>0;
   if (hasUrl===hasUpload) throw new UsageError("Each image source requires exactly one URL or uploadId.");
   if (hasUrl) {
    let url:URL;try {url=new URL(source.url);} catch {throw new UsageError("Image source URL must be an absolute HTTPS URL.");}
    if (url.protocol!=="https:" || url.username || url.password) throw new UsageError("Image source URL must use HTTPS with no embedded credentials.");
   }
  }
  validateSources(item);
 }
}
function semanticChecks(name:string,body:Json):void {
 validateSources(body);
 if (name==="generate_image5" && body.referenceBlobs?.length && body.aspectRatio!==undefined && body.aspectRatio!=="auto") throw new UsageError("Image 5 reference edits require aspectRatio auto or omitted.");
 if (name==="generate_video" && !body.prompt?.trim() && !body.image?.conditions?.length) throw new UsageError("Video requires a prompt or an image keyframe.");
 if (body.seeds && body.numVariations!==undefined && body.seeds.length!==body.numVariations) throw new UsageError("Provide one seed per variation.");
}
export const ALL_TOOLS: ToolSpec[] = operations.map(op=>{
 const properties:Json={...op.bodySchema.properties,confirm:{type:"boolean",description:"Must be true to spend Firefly Services credits for the operation the user requested."},wait:{type:"boolean",description:"Wait for completion, default true. Set false to return the job immediately."},download:{type:"boolean",description:"Download completed media to FIREFLY_OUTPUT_DIR, default false. Requires wait=true."}};
 const required=[...(op.bodySchema.required ?? [])] as string[];
 if (properties.numVariations) properties.n={...properties.numVariations,description:"Compatibility alias for numVariations. Do not supply both."};
 if (properties.size) {properties.width={...positive,description:"Compatibility alias: provide together with height instead of size."};properties.height={...positive,description:"Compatibility alias: provide together with width instead of size."};}
 for (const key of ["image","mask"]) if (properties[key] && op.name!=="generate_video") {
  const alias=`${key}Url`;
  properties[alias]={type:"string",format:"uri",description:`Compatibility URL alias for ${key}.source.url.`};
  const i=required.indexOf(key); if (i!==-1) required.splice(i,1);
 }
 const inputSchema:Json={type:"object",properties,required,additionalProperties:false};
 const bodyCheck=ajv.compile({...op.bodySchema,additionalProperties:false});
 return {name:op.name,title:op.title,description:`${op.title}. ${op.name==="generate_image5"?"Image 5 supports natural-language edits through referenceBlobs. ":""}Consumes Firefly Services credits. Returns Adobe output URLs. Set wait=false to return an async job.`,inputSchema,risk:"spend" as const,handler:async(args,client)=>{
  const body=normalize(args);validate(bodyCheck,body);semanticChecks(op.name,body);
  if (args.download===true && args.wait===false) throw new UsageError("download requires wait=true.");
  const result=await client.submit(op.path,body,op.headers,args.wait!==false);
  return args.download===true ? client.downloadOutputs(result) : result;
 }};
});
ALL_TOOLS.push(
 {name:"upload_image",title:"Upload a reference image",description:"Upload a local JPEG, PNG, WebP, TIFF or JXL image, up to 15 MB. Returns an uploadId, valid for seven days. File content is sent to Adobe.",risk:"write",inputSchema:{type:"object",properties:{filePath:{type:"string",minLength:1,description:"Local image path on the computer running this server."}},required:["filePath"],additionalProperties:false},handler:(args,client)=>client.upload(args.filePath)},
 {name:"verify_credentials",title:"Verify authentication",description:"Verify OAuth credentials or a supplied access token without generating media. A supplied token is checked through a custom-model API read. Does not prove generation entitlement or reveal tokens.",risk:"read",inputSchema:{type:"object",properties:{},additionalProperties:false},handler:(_args,client)=>client.verifyCredentials()},
 {name:"get_job_status",title:"Read an async job",description:"Read an existing Adobe async job by jobId. Use after a polling timeout instead of submitting generation again.",risk:"read",inputSchema:{type:"object",properties:{jobId:{type:"string",minLength:1,description:"Job ID or URN returned by Adobe."}},required:["jobId"],additionalProperties:false},handler:(args,client)=>client.getJobStatus(args.jobId)},
 {name:"list_custom_models",title:"List available custom models",description:"Read custom models available to the Adobe project. FIREFLY_USER_TOKEN is optional for user-specific access. Returns a page; use start and limit to continue.",risk:"read",inputSchema:{type:"object",properties:{sortBy:{type:"string",enum:["assetName","createdDate","modifiedDate","-assetName","-createdDate","-modifiedDate"]},start:{type:"integer",minimum:0},limit:{type:"integer",minimum:1,maximum:50},publishedState:{type:"string",enum:["all","ready","published","unpublished","queued","training","failed","cancelled"]}},additionalProperties:false},handler:(args,client)=>client.customModels(args)},
);
const checks=new Map(ALL_TOOLS.map(t=>[t.name,ajv.compile(t.inputSchema)]));
export function validateArguments(tool:ToolSpec,args:Json):void {validate(checks.get(tool.name)!,args);}
export function visibleTools(config:Config):ToolSpec[] {return ALL_TOOLS.filter(t=>!config.readOnly||t.risk==="read");}
