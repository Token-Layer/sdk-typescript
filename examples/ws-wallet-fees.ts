import { createAuthedClient } from "./common.js";

async function main() {
  const client = createAuthedClient();

  const ws = client.websocket({
    url: process.env.TL_WS_URL || "ws://127.0.0.1:8080/ws",
  });

  await ws.connect();

  await ws.subscribeWalletFees({
    wallet: process.env.TL_WS_WALLET,
    wallets: process.env.TL_WS_WALLETS?.split(",").map((value) => value.trim()).filter(Boolean),
    currency: process.env.TL_WS_CURRENCY,
    currencies: process.env.TL_WS_CURRENCIES?.split(",").map((value) => value.trim()).filter(Boolean),
    activityIds: process.env.TL_WS_ACTIVITY_IDS?.split(",").map((value) => Number(value.trim())).filter((value) => !Number.isNaN(value)),
    distributionTypes: process.env.TL_WS_DISTRIBUTION_TYPES?.split(",").map((value) => Number(value.trim())).filter((value) => !Number.isNaN(value)),
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

  console.log("Subscribed. Waiting for wallet fee events...");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
