import { createPublicClient, requireEnv } from "./common.ts";

async function main() {
  const tl = createPublicClient();
  const tokenId = requireEnv("TL_TOKEN_ID");
  const res = await tl.info.getPoolData({ tokenId });
  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
