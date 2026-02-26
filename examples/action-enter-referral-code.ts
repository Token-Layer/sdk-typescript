import { createAuthedClient, source, requireEnv } from "./common.ts";

async function main() {
  const tl = createAuthedClient();
  const referralCode = requireEnv("TL_REFERRAL_CODE");

  const res = await tl.action.enterReferralCode({
    action: {
      referral_code: referralCode,
      network_mode: source === "Testnet" ? "testnet" : "mainnet",
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
