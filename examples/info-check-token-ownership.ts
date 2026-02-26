import { createPublicClient, requireEnv } from "./common.ts";

async function main() {
  const tl = createPublicClient();
  const tokenId = requireEnv("TL_TOKEN_ID");
  const userAddress = requireEnv("TL_USER_ADDRESS");
  const res = await tl.info.checkTokenOwnership({
    token_id: tokenId,
    user_address: userAddress,
  });
  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
