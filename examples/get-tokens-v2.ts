import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { MAINNET_API_URL, TESTNET_API_URL, TokenLayer } from "../dist/index.js";
import type { GetTokensV2Params } from "../dist/index.js";

loadEnv({ path: resolve(process.cwd(), "examples", ".env") });
loadEnv({ path: resolve(process.cwd(), "examples", ".env.local"), override: true });

const configPath = resolve(process.cwd(), "examples", "config.json");
const rawConfig = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8"))
  : {};

const source = process.env.TL_SOURCE || "Mainnet";
const defaultBaseUrl = source === "Testnet" ? TESTNET_API_URL : MAINNET_API_URL;
const baseUrl = process.env.TL_API_BASE_URL || defaultBaseUrl;

const keyword = process.env.TL_INFO_KEYWORD || undefined;
const orderBy = process.env.TL_INFO_ORDER_BY || "volume_24h";
const orderDirection = process.env.TL_INFO_ORDER_DIRECTION || "DESC";
const CHAIN_SLUGS: NonNullable<GetTokensV2Params["chains"]> = [
  "solana",
  "solana-devnet",
  "arbitrum",
  "base",
  "base-sepolia",
  "avalanche",
  "op-bnb",
  "bnb",
  "bnb-testnet",
  "ethereum",
  "monad",
  "unichain",
  "unichain-testnet",
  "abstract",
  "polygon",
  "zksync",
  "zksync-testnet",
];
const chainSlugSet = new Set<string>(CHAIN_SLUGS);

function parseChains(raw: string): GetTokensV2Params["chains"] {
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return undefined;

  const unknown = values.filter((value) => !chainSlugSet.has(value));
  if (unknown.length > 0) {
    throw new Error(
      `Invalid TL_INFO_CHAINS value(s): ${unknown.join(", ")}. Allowed: ${CHAIN_SLUGS.join(", ")}`,
    );
  }

  return values as GetTokensV2Params["chains"];
}

function parseInteger(
  raw: string | undefined,
  label: string,
  min: number,
  max?: number,
): number | undefined {
  if (!raw || raw.trim().length === 0) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer. Received: ${raw}`);
  }
  if (value < min || (typeof max === "number" && value > max)) {
    const range = typeof max === "number" ? `${min}-${max}` : `>= ${min}`;
    throw new Error(`${label} out of range (${range}). Received: ${value}`);
  }
  return value;
}

const chains = parseChains(process.env.TL_INFO_CHAINS || "");
const limit = parseInteger(process.env.TL_INFO_LIMIT, "TL_INFO_LIMIT", 1, 100) ?? 20;
const offset = parseInteger(process.env.TL_INFO_OFFSET, "TL_INFO_OFFSET", 0) ?? 0;

async function main() {
  const tokenLayer = new TokenLayer({
    baseUrl,
    source,
  });

  const response = await tokenLayer.info.getTokensV2({
    keyword,
    limit,
    offset,
    order_by: orderBy as
      | "volume_1m"
      | "volume_5m"
      | "volume_1h"
      | "volume_24h"
      | "market_cap"
      | "price_change_24h"
      | "trx"
      | "holders"
      | "created_at",
    order_direction: orderDirection as "ASC" | "DESC",
    chains: chains.length > 0 ? chains : undefined,
    verified_only: rawConfig.info?.verified_only ?? true,
  });

  console.log("getTokensV2 response:", response);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
