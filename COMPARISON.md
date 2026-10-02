# Firefly implementation comparison

Reviewed October 2, 2026. Own capabilities are read from the running server and tested against mocked Adobe responses. Live Adobe account validation remains pending. Other maintainers' capabilities below are their README claims, not an independent live benchmark.

| Implementation | Surface | Relevant scope | What still needs verification |
| --- | --- | --- | --- |
| Legacy thenavidai/firefly-mcp 1.0.0 | MCP only; no package binaries | Seven image/upload/auth tools | Outdated fill path, payload n and async response handling needed fixes |
| This 2.0.0 source build | MCP, CLI, .mcpb build | 14 tools; explicit Image 5, video, upscale, precise/adaptive composites, custom-model reads | Live credentials, actual desktop install, npm release and matched-task benchmarks |
| Adobe REST API and JavaScript SDK | Official API/SDK | Public image/video schemas and broader Firefly Services SDKs | No dedicated Adobe-published Firefly task MCP or CLI identified in reviewed docs |
| Focus-GTS/firefly-services-mcp | Community MCP | Maintainer reports 19 tools spanning Firefly, Photoshop and Lightroom | Broader editing scope than this Firefly-only package; inspect actual release and schemas before performance comparison |
| krishnapallapolu/adobe-firefly-mcp | Community MCP | Maintainer reports nine image/video tools and a remote HTTP transport | Remote deployment and polling behavior should be compared on matched tasks |

Our useful differences are a first-class task CLI with generated schemas, a desktop bundle, current operation coverage, private local credential configuration and explicit spending/job behavior. This does not establish that it is faster, cheaper or better at every workflow. Photoshop/Lightroom coverage and remote hosting are separate strengths in the other repos.

## API changes checked

The current OpenAPI defines ten media operations plus image storage, custom-model listing and job status. The implementation uses /v3/images/fill-async, numVariations and both statusUrl and links.result.href. It handles result.outputs as well as top-level outputs. The legacy n argument is normalized where applicable.

Image 5's v4 schema accepts aspectRatio, resolutionLevel, modelId, modelSpecificPayload and referenceBlobs. The migration article describes several of these as removed or changed, contradicting the operation schema/examples reviewed on the same day. This implementation follows the operation schema, records the snapshot hash and validates before sending requests. An authenticated live test is still required to resolve any service-side discrepancy.

## Comparison method

Measure the same successful request, credentials, inputs, output fields and completion behavior across implementations. Record package versions, schemas, client/model version, date, discovery mode, all input/output tokens, latency, retries and Adobe credits. A different tool count does not establish wider coverage. CLI standing context, loaded skill, command discovery and result text must be counted separately. Do not equate schema overhead with the full cost of an actual task.

## Sources

- [Adobe Firefly overview](https://developer.adobe.com/firefly-services/docs/firefly-api/)
- [Official OpenAPI source](https://github.com/AdobeDocs/ffs-firefly-api/blob/main/static/firefly-api.json)
- [Authentication](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/)
- [Usage and storage constraints](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/usage-notes/)
- [Image 5 migration article](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/cm-generate-image/breaking-changes)
- [Adobe Firefly Services JavaScript SDK](https://github.com/Firefly-Services/firefly-services-sdk-js)
- [FocusGTS MCP](https://github.com/Focus-GTS/firefly-services-mcp)
- [Other image/video MCP](https://github.com/krishnapallapolu/adobe-firefly-mcp)
