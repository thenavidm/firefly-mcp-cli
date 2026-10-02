import { loadConfig } from "./config.js";
import { FireflyClient } from "./api/client.js";
import { exitCodeFor } from "./cli.js";
export async function runDoctor(network=false):Promise<number> {
 const config=loadConfig();
 const configured=Boolean(config.clientId&&(config.clientSecret||config.accessToken));
 const result:Record<string,unknown>={ok:configured,node:process.version,credentialsConfigured:configured,readOnly:config.readOnly,authenticationChecked:false,note:configured?"Run doctor --network to check authentication without generating media.":"Set FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET. Run login for setup instructions."};
 if (!configured) {console.log(JSON.stringify(result,null,2));return 10;}
 if (network) try {Object.assign(result,await new FireflyClient(config).verifyCredentials(),{authenticationChecked:true});} catch (e) {console.error(JSON.stringify({error:(e as Error).message}));return exitCodeFor((e as Error).message);}
 console.log(JSON.stringify(result,null,2));return 0;
}
