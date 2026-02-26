import { createAuthedClient, source } from "./common.ts";

async function main() {
  const tl = createAuthedClient();

  const res = await tl.action.createReferralCode({
    action: {
      code: `SDK${Date.now().toString().slice(-6)}`,
      network_mode: source === "Testnet" ? "testnet" : "mainnet",
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
