import type { ActivitySubtype, ActivityType, TokenLayerAuth } from "./types.js";

export interface TokenActivitySubscriptionOptions {
  tokenId?: string;
  tokenIds?: string[];
  chains?: string[];
  activityTypes?: ActivityType[];
  activitySubtypes?: ActivitySubtype[];
  cursor?: "latest" | "earliest" | number;
  sinceTimestamp?: string;
  batchSize?: number;
  onEvent: (event: TokenActivityEventMessage) => void;
}

export interface TokenActivityEventData {
  chain?: string;
  activity_type?: string;
  activity_subtype?: string;
  evt_block_number?: number;
  evt_block_time?: string;
  tx_hash?: string;
  evt_index?: number;
  token_layer_id?: string;
  token_address?: string;
  wallet?: string | null;
  trader?: string | null;
  receiver?: string | null;
  from_address?: string | null;
  to_address?: string | null;
  token_amount?: string | null;
  token_amount_raw?: string | null;
  usd_amount?: string | null;
  usd_amount_raw?: string | null;
  price_usd?: string | null;
  market_cap_usd?: string | null;
  pool?: string | null;
  [key: string]: unknown;
}

export interface TokenActivityEventMessage {
  id: string;
  topic: "tokenActivity";
  seq: number;
  data: TokenActivityEventData;
}

interface AuthenticatedMessage {
  type: "authenticated";
  authMethod: string;
  userId?: string;
}

interface ErrorMessage {
  type: "error";
  id?: string;
  code: string;
  message: string;
}

interface EventMessage {
  type: "event";
  id: string;
  topic: "tokenActivity";
  seq: number;
  data: TokenActivityEventData;
}

type ServerMessage =
  | AuthenticatedMessage
  | ErrorMessage
  | EventMessage
  | { type: "subscribed"; id: string; watermark: number }
  | { type: "unsubscribed"; id: string }
  | { type: "post_result"; id: string; accepted: boolean; error?: string };

export interface WebSocketLike {
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface TokenLayerWebsocketClientOptions {
  url: string;
  auth?: TokenLayerAuth;
  webSocketFactory?: (url: string) => WebSocketLike;
}

function defaultWebSocketFactory(url: string): WebSocketLike {
  const ctor = (globalThis as { WebSocket?: new (url: string) => WebSocketLike }).WebSocket;
  if (!ctor) {
    throw new Error(
      "No global WebSocket implementation found. Pass webSocketFactory in Node.js.",
    );
  }
  return new ctor(url);
}

function resolveBearer(auth?: TokenLayerAuth): string | undefined {
  if (!auth) return undefined;
  if (auth.type === "wallet") {
    throw new Error(
      "WebSocket helper currently supports JWT or API key auth only.",
    );
  }
  return auth.token;
}

export class TokenLayerWebsocketClient {
  private readonly url: string;
  private readonly auth?: TokenLayerAuth;
  private readonly webSocketFactory: (url: string) => WebSocketLike;
  private socket?: WebSocketLike;
  private connectPromise?: Promise<void>;
  private readonly subscriptions = new Map<
    string,
    { onEvent: (event: TokenActivityEventMessage) => void }
  >();
  private nextId = 1;

  constructor(options: TokenLayerWebsocketClientOptions) {
    this.url = options.url;
    this.auth = options.auth;
    this.webSocketFactory = options.webSocketFactory || defaultWebSocketFactory;
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === 1) {
      return;
    }
    if (this.connectPromise) {
      return await this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let authenticated = false;
      const socket = this.webSocketFactory(this.url);
      this.socket = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ op: "auth", bearer: resolveBearer(this.auth) }));
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        switch (message.type) {
          case "authenticated":
            authenticated = true;
            resolve();
            break;
          case "event": {
            const subscription = this.subscriptions.get(message.id);
            if (subscription && message.topic === "tokenActivity") {
              subscription.onEvent({
                id: message.id,
                topic: "tokenActivity",
                seq: message.seq,
                data: message.data,
              });
            }
            break;
          }
          case "error":
            if (!authenticated) {
              reject(new Error(message.message));
            }
            break;
          case "subscribed":
          case "unsubscribed":
          case "post_result":
            break;
        }
      };

      socket.onerror = () => {
        reject(new Error("WebSocket connection failed"));
      };

      socket.onclose = () => {
        this.socket = undefined;
        this.connectPromise = undefined;
        if (!authenticated) {
          reject(new Error("WebSocket closed before authentication completed"));
        }
      };
    });

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = undefined;
    }
  }

  async subscribeTokenActivity(
    options: TokenActivitySubscriptionOptions,
  ): Promise<{ id: string; unsubscribe: () => void }> {
    await this.connect();
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error("WebSocket is not connected.");
    }

    const id = `sub_${this.nextId++}`;
    this.subscriptions.set(id, { onEvent: options.onEvent });
    this.socket.send(
      JSON.stringify({
        op: "subscribe",
        id,
        subscription: {
          topic: "tokenActivity",
          tokenId: options.tokenId,
          tokenIds: options.tokenIds,
          chains: options.chains,
          activityTypes: options.activityTypes,
          activitySubtypes: options.activitySubtypes,
          cursor: options.cursor,
          sinceTimestamp: options.sinceTimestamp,
          batchSize: options.batchSize,
        },
      }),
    );

    return {
      id,
      unsubscribe: () => {
        if (this.socket && this.socket.readyState === 1) {
          this.socket.send(JSON.stringify({ op: "unsubscribe", id }));
        }
        this.subscriptions.delete(id);
      },
    };
  }

  close(code?: number, reason?: string): void {
    this.socket?.close(code, reason);
    this.socket = undefined;
    this.subscriptions.clear();
  }
}
