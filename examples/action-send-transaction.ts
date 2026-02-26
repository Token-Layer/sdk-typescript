import { createAuthedClient, chainSlug } from "./common.ts";

async function main() {
  const tl = createAuthedClient();

  const res = await tl.action.sendTransaction({
    action: {
      to: "0x000000000000000000000000000000000000dEaD",
      amount: "1",
      chainSlug,
    },
  });

  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
