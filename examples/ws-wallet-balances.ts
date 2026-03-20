import { createAuthedClient } from "./common.js";

async function main() {
  const client = createAuthedClient();

  const ws = client.websocket({
    url: process.env.TL_WS_URL || "ws://127.0.0.1:8080/ws",
  });

  await ws.connect();

  await ws.subscribeWalletBalances({
    wallet: process.env.TL_WS_WALLET,
    wallets: process.env.TL_WS_WALLETS?.split(",").map((value) => value.trim()).filter(Boolean),
    tokenId: process.env.TL_WS_TOKEN_ID,
    tokenIds: process.env.TL_WS_TOKEN_IDS?.split(",").map((value) => value.trim()).filter(Boolean),
    chains: process.env.TL_WS_CHAINS?.split(",").map((value) => value.trim()).filter(Boolean),
    cursor: process.env.TL_WS_CURSOR
      ? process.env.TL_WS_CURSOR === "latest" || process.env.TL_WS_CURSOR === "earliest"
        ? process.env.TL_WS_CURSOR
        : Number(process.env.TL_WS_CURSOR)
      : undefined,
    sinceTimestamp: process.env.TL_WS_SINCE_TIMESTAMP,
    batchSize: process.env.TL_WS_BATCH_SIZE
      ? Number(process.env.TL_WS_BATCH_SIZE)
      : undefined,
    onEvent: (event) => {
      console.log(JSON.stringify(event, null, 2));
    },
  });

  console.log("Subscribed. Waiting for wallet balance events...");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
