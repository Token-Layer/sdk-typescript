import { createPublicClient } from "./common.ts";

async function main() {
  const tl = createPublicClient();
  const res = await tl.info.getLeaderboard({
    limit: 10,
    offset: 0,
    network_mode: "both",
  });
  console.log(res);
}

main().catch((error) => {
  console.error("Example failed:", error);
  process.exit(1);
});
