# Firefly implementation comparison

Reviewed October 2, 2026. Own capabilities are read from the running server and tested against mocked Adobe responses. Live Adobe account validation remains pending. Community capability coverage and binaries were inspected in source at the revisions below. Their claims of live validation are attributed to their maintainers; no independent matched live benchmark has run.

| Implementation | Surface | Relevant scope | What still needs verification |
| --- | --- | --- | --- |
| Legacy thenavidai/firefly-mcp 1.0.0 | MCP only; no package binaries | Seven image/upload/auth tools | Outdated fill path, payload n and async response handling needed fixes |
| This 2.0.0 package | MCP, CLI, .mcpb | 14 tools; explicit Image 5, video, upscale, precise/adaptive composites, custom-model reads | Live entitled account, actual desktop-client install and matched-task benchmarks |
| Adobe REST API and JavaScript SDK | Official API/SDK | Public image/video schemas and broader Firefly Services SDKs | No dedicated Adobe-published Firefly task MCP or CLI identified in reviewed docs |
| Focus-GTS/firefly-services-mcp | Community MCP | 19 registered tools: 9 Firefly, 6 Photoshop, 4 Lightroom | MCP binary only; broader editing scope, inline image results and local-upload path restrictions; maintainer reports live validation |
| krishnapallapolu/adobe-firefly-mcp | Community MCP | Nine registered image/video/custom-model/job tools; Streamable HTTP with bearer-token authentication | MCP binary only; base64 uploads and remote bearer authentication; no separate task CLI identified in package/source |

Our useful differences are a first-class task CLI with generated schemas, a desktop bundle, current operation coverage, private local credential configuration and explicit spending/job behavior. This does not establish that it is faster, cheaper or better at every workflow. Photoshop/Lightroom coverage and remote hosting are separate strengths in the other repos.

## API changes checked

The current OpenAPI defines ten media operations plus image storage, custom-model listing and job status. The implementation uses /v3/images/fill-async, numVariations and both statusUrl and links.result.href. It handles result.outputs as well as top-level outputs. The legacy n argument is normalized where applicable.

Image 5's v4 schema accepts aspectRatio, resolutionLevel, modelId, modelSpecificPayload and referenceBlobs. The migration article describes several of these as removed or changed, contradicting the operation schema/examples reviewed on the same day. This implementation follows the operation schema, records the snapshot hash and validates before sending requests. An authenticated live test is still required to resolve any service-side discrepancy.

## Comparison method

Measure the same successful request, credentials, inputs, output fields and completion behavior across implementations. Record package versions, schemas, client/model version, date, discovery mode, all input/output tokens, latency, retries and Adobe credits. A different tool count does not establish wider coverage. CLI standing context, loaded skill, command discovery and result text must be counted separately. Do not equate schema overhead with the full cost of an actual task.


## Source coverage

Checked on 2026-10-02: [FocusGTS 0.2.3 at b2ea3c8](https://github.com/Focus-GTS/firefly-services-mcp/tree/b2ea3c87b603affced851a7b771bba6814dc3b18), and [adobe-firefly-mcp 0.1.0 at 84e0624](https://github.com/krishnapallapolu/adobe-firefly-mcp/tree/84e0624ce103977f4cddb405f4483e319b98a6b5).

| Capability | This package | FocusGTS 0.2.3 | adobe-firefly-mcp 0.1.0 |
| --- | --- | --- | --- |
| v3 image generation, similar, fill, expand, object composite | Yes | Yes | Yes |
| Image 5 reference editing | Dedicated v4 tool | Not in reviewed registrations | Not in reviewed registrations |
| Video generation | Yes | Yes | Yes |
| Upscaling and precise/adaptive composite | Dedicated tools | Not in reviewed registrations | Not in reviewed registrations |
| Custom models | Yes | Not in reviewed registrations | Yes |
| Authentication and job status | Dedicated reads | Dedicated reads | Job-status read; remote bearer authentication |
| Upload references | Local path | Local path and reference resolution | Base64 data |
| Photoshop/Lightroom operations | No | Yes | No |
| Task CLI with per-command schema/help | Yes | No separate task CLI in package/source | No separate task CLI in package/source |
| Desktop archive | .mcpb | Not identified in reviewed package/source | Not identified in reviewed package/source |
| Transport | Local stdio | Local stdio | Streamable HTTP |
| Explicit credit-confirm flag and read-only switch | Yes | Not identified in reviewed registrations | Not identified in reviewed registrations |

These entries describe the reviewed versions, not every branch or future release. Client-level permission prompts can still guard other servers. FocusGTS provides inline images and additional Adobe editing APIs that this package does not offer. Our practical differences are its CLI, desktop bundle and additional Firefly operation coverage; no overall superiority or token-savings percentage is established.

## Token evidence

| Measurement | Current evidence |
| --- | --- |
| Full MCP definitions | Native schemas discovered; fresh Claude Code usage measurement pending |
| Default tool-search standing context | Pending |
| Skill read and recurring description | Pending; the skill contributes context |
| Successful matched media task | Pending Adobe account entitlement |
| Latency, retries and Adobe credits | Pending a matched live task |

The Claude Code weekly limit prevented a successful measurement on 2026-10-02. An aborted run is not a zero-token result. Keep raw usage logs, date, model/client version and baseline with any future numbers, and separate standing context from total task cost.

## Sources

- [Adobe Firefly overview](https://developer.adobe.com/firefly-services/docs/firefly-api/)
- [Official OpenAPI source](https://github.com/AdobeDocs/ffs-firefly-api/blob/main/static/firefly-api.json)
- [Authentication](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/)
- [Usage and storage constraints](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/usage-notes/)
- [Image 5 migration article](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/cm-generate-image/breaking-changes)
- [Adobe Firefly Services JavaScript SDK](https://github.com/Firefly-Services/firefly-services-sdk-js)
- [FocusGTS MCP](https://github.com/Focus-GTS/firefly-services-mcp)
- [Other image/video MCP](https://github.com/krishnapallapolu/adobe-firefly-mcp)
