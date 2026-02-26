import { createAuthedClient, requireEnv } from "./common.ts";

async function main() {
  const tl = createAuthedClient();
  const userAddress = requireEnv("TL_USER_ADDRESS");

  const res = await tl.action.mintUsd({
    source: "Testnet",
    action: {
      chainSlug: "base-sepolia",
      amount: 1000,
      userAddress,
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
