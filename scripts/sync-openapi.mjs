import fs from "node:fs";
import crypto from "node:crypto";
import $RefParser from "@apidevtools/json-schema-ref-parser";
const local = process.argv.includes("--snapshot");
const source = "https://raw.githubusercontent.com/AdobeDocs/ffs-firefly-api/main/static/firefly-api.json";
const raw = local ? fs.readFileSync(new URL("firefly-api.snapshot.json", import.meta.url), "utf8") : await (await fetch(source)).text();
const original = JSON.parse(raw);
const api = await $RefParser.dereference(original);
// Keep validation keywords, removing display-only OpenAPI markup from tool schemas.
function clean(s) {
  if (Array.isArray(s)) return s.map(clean);
  if (!s || typeof s !== "object") return s;
  const out = {};
  for (const [k,v] of Object.entries(s)) {
    if (["example","examples","title","xml","externalDocs","discriminator","deprecated"].includes(k)) continue;
    out[k] = clean(v);
  }
  if (out.description) out.description = out.description.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/—/g, ":");
  if (typeof out.exclusiveMinimum === "boolean") { if (out.exclusiveMinimum) out.exclusiveMinimum = out.minimum; else delete out.exclusiveMinimum; }
  if (out.allOf?.length === 1) { const {allOf,...rest}=out; return {...allOf[0],...rest}; }
  return out;
}
const names = {
 "/v3/images/generate-async":"generate_image", "/v4/images/generate-async":"generate_image5",
 "/v3/images/generate-similar-async":"generate_similar", "/v3/images/expand-async":"generative_expand",
 "/v3/images/fill-async":"generative_fill", "/v3/images/generate-object-composite-async":"generate_object_composite",
 "/v3/images/precise-composite":"precise_composite", "/v3/images/adaptive-composite":"adaptive_composite",
 "/v3/images/upscale":"upscale_image", "/v3/videos/generate":"generate_video",
};
const ops = Object.entries(names).map(([path,name]) => {
 const op = api.paths[path].post;
 return {name,path,title:op.summary,description:clean({description:op.description}).description,bodySchema:clean(op.requestBody.content["application/json"].schema),headers:Object.fromEntries((op.parameters ?? []).filter(p=>p.in==="header" && p.required && p.schema.enum?.length===1).map(p=>[p.name,p.schema.enum[0]]))};
});
fs.writeFileSync(new URL("../src/tools/operations.json", import.meta.url), JSON.stringify(ops,null,2)+"\n");
fs.writeFileSync(new URL("../src/tools/api-source.json", import.meta.url), JSON.stringify({checked:new Date().toISOString().slice(0,10),source,sha256:crypto.createHash("sha256").update(raw).digest("hex"),apiVersion:api.info.version},null,2)+"\n");
if (!local) fs.writeFileSync(new URL("firefly-api.snapshot.json", import.meta.url),raw);
console.log(`Generated ${ops.length} operation schemas from Adobe OpenAPI.`);
