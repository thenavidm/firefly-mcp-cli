#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer,VERSION } from "./server.js";
import { runCli } from "./cli.js";
import { runDoctor } from "./doctor.js";
import { basename } from "node:path";
const HELP=`Adobe Firefly MCP server and CLI ${VERSION}

firefly-mcp                        Run the MCP server over stdio
firefly-cli                        List all commands
firefly-cli <command> --help       Show schema-derived flags
firefly-cli schema <command>       Print the MCP input schema
firefly-cli doctor [--network]     Check settings; optionally authenticate
firefly-cli login                  Show credential setup instructions
firefly-cli --version              Print the package version

Credentials: FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET; FIREFLY_ACCESS_TOKEN can replace the secret.
Adobe tutorial aliases: FIREFLY_SERVICES_CLIENT_ID, FIREFLY_SERVICES_CLIENT_SECRET, FIREFLY_SERVICES_ACCESS_TOKEN.
FIREFLY_USER_TOKEN supplies optional user-level custom-model access.
FIREFLY_SCOPES defaults to Adobe's documented OAuth scopes.
FIREFLY_OUTPUT_DIR selects the optional media download folder (default ~/outputs/images).
FIREFLY_READ_ONLY=1 hides generation and upload commands.
FIREFLY_ALLOW_SPENDING=0 blocks credit-spending tools even with confirmation.
FIREFLY_AUDIT_LOG records attempted writes, without prompts, files or credentials.
FIREFLY_REQUEST_TIMEOUT_MS=30000; FIREFLY_POLL_TIMEOUT_MS=300000; FIREFLY_POLL_INTERVAL_MS=2000.

https://github.com/thenavidm/firefly-mcp-cli
`;
async function main():Promise<void> {
 const args=process.argv.slice(2);const command=args[0];
 if (command==="--version"||command==="-v") {console.log(VERSION);return;}
 if (command==="--help"||command==="-h"||command==="help") {process.stdout.write(HELP);return;}
 if (command==="doctor") {if(args.slice(1).some(a=>a!=="--network")) {process.exitCode=2;console.error(JSON.stringify({error:"doctor accepts only --network"}));return;}process.exitCode=await runDoctor(args.includes("--network"));return;}
 if (command==="login") {console.log("Create a Firefly Services project at https://developer.adobe.com/console with OAuth Server-to-Server credentials. Set FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET in your shell or MCP client's environment, then run firefly-cli doctor --network. This command does not open a browser or store secrets.");return;}
 if (args.length||basename(process.argv[1]??"").startsWith("firefly-cli")) {process.exitCode=await runCli(args);return;}
 const server=buildServer();await server.connect(new StdioServerTransport());
 const close=async()=>{await server.close();process.exit(0);};
 process.on("SIGTERM",()=>void close());process.on("SIGINT",()=>void close());
}
main().catch(e=>{console.error(JSON.stringify({error:e.message}));process.exitCode=5;});
