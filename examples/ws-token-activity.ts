import { baseUrl, createAuthedClient } from "./common.js";

async function main() {
  const client = createAuthedClient();

  const ws = client.websocket({
    url: process.env.TL_WS_URL || baseUrl.replace(/^http/, "ws").replace(/\/functions\/v1$/, "/ws"),
  });

  await ws.connect();

  const tokenId = process.env.TL_WS_TOKEN_ID;
  const tokenIds = process.env.TL_WS_TOKEN_IDS?.split(",").map((value) => value.trim()).filter(Boolean);

  await ws.subscribeTokenActivity({
    tokenId,
    tokenIds,
    chains: process.env.TL_WS_CHAINS?.split(",").filter(Boolean),
    activityTypes: process.env.TL_WS_ACTIVITY_TYPES?.split(",").map((value) => value.trim()).filter(Boolean) as
      | ("trade" | "transfer" | "lp" | "lifecycle")[]
      | undefined,
    activitySubtypes: process.env.TL_WS_ACTIVITY_SUBTYPES?.split(",").map((value) => value.trim()).filter(Boolean) as
      | (
          | "buy"
          | "sell"
          | "local"
          | "cross_chain_sent"
          | "cross_chain_received"
          | "deposit"
          | "withdrawal"
          | "graduation"
        )[]
      | undefined,
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

  console.log("Subscribed. Waiting for events...");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
