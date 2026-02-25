import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { MAINNET_API_URL, TESTNET_API_URL, TokenLayer } from "../dist/index.js";

loadEnv({ path: resolve(process.cwd(), "examples", ".env") });
loadEnv({ path: resolve(process.cwd(), "examples", ".env.local"), override: true });

const source = process.env.TL_SOURCE || "Mainnet";
const defaultBaseUrl = source === "Testnet" ? TESTNET_API_URL : MAINNET_API_URL;
const baseUrl = process.env.TL_API_BASE_URL || defaultBaseUrl;
const builderCode = process.env.TL_BUILDER_CODE;

if (!builderCode) {
  throw new Error("Missing TL_BUILDER_CODE. Set it in examples/.env or shell env.");
}

async function main() {
  const tokenLayer = new TokenLayer({
    baseUrl,
    source,
    defaults: {
      builder: {
        code: builderCode as `0x${string}`,
      },
    },
  });

  // No builder_code passed here.
  // SDK injects defaults.builder.code into info.getTokensV2 requests.
  const response = await tokenLayer.info.getTokensV2({
    chains: ["ethereum","base"],
    limit: 20,
    offset: 0,
    order_by: "volume_24h",
    order_direction: "DESC",
    verified_only: true,
  });

  console.log("getTokensV2 (with default builder_code) response:", response);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});

