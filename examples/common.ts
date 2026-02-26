import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { MAINNET_API_URL, TESTNET_API_URL, TokenLayer } from "../dist/index.js";
import type { ChainSlug } from "../dist/index.js";

loadEnv({ path: resolve(process.cwd(), "examples", ".env") });
loadEnv({ path: resolve(process.cwd(), "examples", ".env.local"), override: true });

const configPath = resolve(process.cwd(), "examples", "config.json");
const rawConfig = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8"))
  : {};

export const source = process.env.TL_SOURCE || "Mainnet";
const defaultBaseUrl = source === "Testnet" ? TESTNET_API_URL : MAINNET_API_URL;
export const baseUrl = process.env.TL_API_BASE_URL || defaultBaseUrl;

export const chainSlug = (process.env.TL_CHAIN_SLUG || "base") as ChainSlug;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function resolveAuth(): { type: "jwt" | "apiKey"; token: string } {
  const authMode = process.env.TL_AUTH_MODE || rawConfig.auth?.mode || "jwt";
  const jwt = process.env.TL_JWT || rawConfig.auth?.jwt;
  const apiKey = process.env.TL_API_KEY || rawConfig.auth?.apiKey;

  if (authMode === "apiKey") {
    return { type: "apiKey", token: apiKey || "" };
  }

  return { type: "jwt", token: jwt || "" };
}

export function createPublicClient(): TokenLayer {
  return new TokenLayer({ baseUrl, source });
}

export function createAuthedClient(): TokenLayer {
  return new TokenLayer({
    baseUrl,
    source,
    auth: resolveAuth(),
  });
}
