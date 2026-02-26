import { createAuthedClient } from "./common.ts";

async function main() {
  const tl = createAuthedClient();
  const res = await tl.info.getUserFeeHistory({
    limit: 10,
    offset: 0,
  });
  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
