import { createAuthedClient, chainSlug, requireEnv } from "./common.ts";

async function main() {
  const tl = createAuthedClient();
  const tokenId = requireEnv("TL_TOKEN_ID");

  const res = await tl.action.transferToken({
    action: {
      token_id: tokenId,
      recipient_address: "0x000000000000000000000000000000000000dEaD",
      amount: "0.1",
      from_chain_slug: chainSlug,
      to_chain_slug: chainSlug,
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
