import { createPublicClient } from "./common.ts";

async function main() {
  const tl = createPublicClient();
  const res = await tl.info.searchToken({ input: process.env.TL_SEARCH_INPUT || "base" });
  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
