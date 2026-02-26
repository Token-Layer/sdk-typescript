import { createAuthedClient } from "./common.ts";

async function main() {
  const tl = createAuthedClient();
  const res = await tl.info.getUserBalance({});
  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
