import { createAuthedClient, chainSlug, requireEnv } from "./common.ts";

async function main() {
  const tl = createAuthedClient();
  const tokenId = requireEnv("TL_TOKEN_ID");

  const res = await tl.action.tradeToken({
    action: {
      tokenId,
      chainSlug,
      direction: "buy",
      buyAmountUSD: 1,
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
