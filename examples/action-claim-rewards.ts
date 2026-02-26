import { createAuthedClient, chainSlug } from "./common.ts";

async function main() {
  const tl = createAuthedClient();

  const res = await tl.action.claimRewards({
    action: {
      chains: [chainSlug],
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
