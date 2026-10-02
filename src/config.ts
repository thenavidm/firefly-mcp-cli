import { homedir } from "node:os";
import { join } from "node:path";
export type Config = {
  clientId: string; clientSecret: string; accessToken: string; userToken: string;
  outputDir: string; scopes: string; readOnly: boolean; allowDestructive: boolean; auditPath: string; timeoutMs: number; pollTimeoutMs: number; pollIntervalMs: number;
};
const number = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Invalid settings: timeouts and polling intervals must be positive integers.");
  return n;
};
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
 return {
  clientId: env.FIREFLY_CLIENT_ID ?? env.FIREFLY_SERVICES_CLIENT_ID ?? "",
  clientSecret: env.FIREFLY_CLIENT_SECRET ?? env.FIREFLY_SERVICES_CLIENT_SECRET ?? "",
  accessToken: env.FIREFLY_ACCESS_TOKEN ?? env.FIREFLY_SERVICES_ACCESS_TOKEN ?? "",
  userToken: env.FIREFLY_USER_TOKEN ?? "",
  outputDir: env.FIREFLY_OUTPUT_DIR || join(homedir(), "outputs", "images"),
  scopes: env.FIREFLY_SCOPES ?? "openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis",
  readOnly: /^(1|true)$/i.test(env.FIREFLY_READ_ONLY ?? ""),
  allowDestructive: !/^(0|false)$/i.test(env.FIREFLY_ALLOW_SPENDING ?? ""),
  auditPath: env.FIREFLY_AUDIT_LOG ?? "",
  timeoutMs: number(env.FIREFLY_REQUEST_TIMEOUT_MS, 30000),
  pollTimeoutMs: number(env.FIREFLY_POLL_TIMEOUT_MS, 300000),
  pollIntervalMs: number(env.FIREFLY_POLL_INTERVAL_MS, 2000),
 };
}
