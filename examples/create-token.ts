import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { MAINNET_API_URL, TESTNET_API_URL, TokenLayer } from "../dist/index.js";
import type { CreateTokenActionDraft } from "../dist/index.js";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

loadEnv({ path: resolve(process.cwd(), "examples", ".env") });
loadEnv({ path: resolve(process.cwd(), "examples", ".env.local"), override: true });

const configPath = resolve(process.cwd(), "examples", "config.json");
const rawConfig = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8"))
  : {};

const source = process.env.TL_SOURCE || "Mainnet";
const defaultBaseUrl = source === "Testnet" ? TESTNET_API_URL : MAINNET_API_URL;
const baseUrl = process.env.TL_API_BASE_URL || defaultBaseUrl;
const authMode = process.env.TL_AUTH_MODE || rawConfig.authMode || "wallet"; // wallet | jwt | apiKey
const execute =
  (process.env.TL_EXECUTE ?? String(rawConfig.execute ?? "false")).toLowerCase() ===
  "true";

function parseRpcByChainSlug(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object") {
    return Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [String(key), String(value)]),
    );
  }
  return String(raw)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc: Record<string, string>, entry) => {
      const [chainSlug, url] = entry.split("=").map((v) => v?.trim());
      if (chainSlug && url) acc[chainSlug] = url;
      return acc;
    }, {});
}

const rpcByChainSlug = parseRpcByChainSlug(
  process.env.TL_RPC_BY_CHAIN_SLUG || rawConfig.rpcByChainSlug,
);

let action: CreateTokenActionDraft = {
  name:
    process.env.TL_TOKEN_NAME ||
    `SDK Token ${Date.now()}`,
  symbol: process.env.TL_TOKEN_SYMBOL || "SDK",
  description:
    process.env.TL_TOKEN_DESCRIPTION ||
    "Token created from sdk-typescript example",
  image:
    process.env.TL_TOKEN_IMAGE ||
    "https://placehold.co/512x512/png",
  chainSlug: process.env.TL_CHAIN_SLUG || "base",
};

async function main() {
  let tokenLayer;

  if (authMode === "wallet") {
    const privateKey =
      process.env.TL_PRIVATE_KEY || rawConfig.wallet?.privateKey;
    const signatureChainId =
      process.env.TL_SIGNATURE_CHAIN_ID || rawConfig.wallet?.signatureChainId;
    const primaryRpcUrl = rpcByChainSlug[action.chainSlug];

    if (!privateKey) throw new Error("Missing wallet private key (TL_PRIVATE_KEY or config.wallet.privateKey)");
    if (!primaryRpcUrl) {
      throw new Error(
        `Missing RPC for action chainSlug "${action.chainSlug}" in TL_RPC_BY_CHAIN_SLUG or config.rpcByChainSlug`,
      );
    }
    if (!signatureChainId) {
      throw new Error(
        "Missing wallet signature chain id (TL_SIGNATURE_CHAIN_ID or config.wallet.signatureChainId)",
      );
    }

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      transport: http(primaryRpcUrl),
    });

    tokenLayer = new TokenLayer({
      baseUrl,
      source,
      rpcByChainSlug,
      auth: {
        type: "wallet",
        walletClient,
        signatureChainId,
      },
    });

    console.log("Using wallet auth. Running register() before createToken()...");
    const registerResponse = await tokenLayer.action.register();
    console.log("register response:", registerResponse);
  } else if (authMode === "jwt") {
    const token = process.env.TL_JWT || rawConfig.jwt?.token;
    if (!token) throw new Error("Missing JWT token (TL_JWT or config.jwt.token)");

    tokenLayer = new TokenLayer({
      baseUrl,
      source,
      rpcByChainSlug,
      auth: { type: "jwt", token },
    });
    console.log("Using JWT auth");
  } else if (authMode === "apiKey") {
    const token = process.env.TL_API_KEY || rawConfig.apiKey?.token;
    if (!token) throw new Error("Missing API key token (TL_API_KEY or config.apiKey.token)");

    tokenLayer = new TokenLayer({
      baseUrl,
      source,
      rpcByChainSlug,
      auth: { type: "apiKey", token },
    });
    console.log("Using API key auth");
  } else {
    throw new Error(`Invalid auth mode: ${authMode}. Use wallet, jwt, or apiKey.`);
  }

  action = tokenLayer.prepare.createToken(action);

  console.log("Creating token with action:", action);
  const response = await tokenLayer.action.createToken({ action }, { execute });
  console.log("createToken response:", response);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
