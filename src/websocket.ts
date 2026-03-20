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

export interface WalletBalanceSubscriptionOptions {
  wallet?: string;
  wallets?: string[];
  tokenId?: string;
  tokenIds?: string[];
  chains?: string[];
  cursor?: "latest" | "earliest" | number;
  sinceTimestamp?: string;
  batchSize?: number;
  onEvent: (event: WalletBalanceEventMessage) => void;
}

export interface WalletFeeSubscriptionOptions {
  wallet?: string;
  wallets?: string[];
  currency?: string;
  currencies?: string[];
  activityIds?: number[];
  distributionTypes?: number[];
  chains?: string[];
  cursor?: "latest" | "earliest" | number;
  sinceTimestamp?: string;
  batchSize?: number;
  onEvent: (event: WalletFeeEventMessage) => void;
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

export interface WalletBalanceEventData {
  chain?: string;
  wallet?: string;
  token_layer_id?: string;
  token_address?: string;
  evt_block_number?: number;
  evt_block_time?: string;
  balance?: string;
  balance_raw?: string;
  [key: string]: unknown;
}

export interface WalletBalanceEventMessage {
  id: string;
  topic: "walletBalances";
  seq: number;
  data: WalletBalanceEventData;
}

export interface WalletFeeEventData {
  chain?: string;
  recipient?: string;
  currency?: string;
  amount?: string;
  amount_raw?: string;
  distribution_type?: number;
  tracking_id?: string;
  activity_id?: number;
  evt_block_number?: number;
  evt_block_time?: string;
  tx_hash?: string;
  evt_index?: number;
  [key: string]: unknown;
}

export interface WalletFeeEventMessage {
  id: string;
  topic: "walletFees";
  seq: number;
  data: WalletFeeEventData;
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
  topic: "tokenActivity" | "walletBalances" | "walletFees";
  seq: number;
  data: TokenActivityEventData | WalletBalanceEventData | WalletFeeEventData;
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

type TokenActivitySubscriptionConfig = Omit<
  TokenActivitySubscriptionOptions,
  "onEvent"
>;
type WalletBalanceSubscriptionConfig = Omit<
  WalletBalanceSubscriptionOptions,
  "onEvent"
>;
type WalletFeeSubscriptionConfig = Omit<
  WalletFeeSubscriptionOptions,
  "onEvent"
>;

type StoredSubscription =
  | {
      kind: "tokenActivity";
      config: TokenActivitySubscriptionConfig;
      onEvent: (event: TokenActivityEventMessage) => void;
      lastSeq?: number;
    }
  | {
      kind: "walletBalances";
      config: WalletBalanceSubscriptionConfig;
      onEvent: (event: WalletBalanceEventMessage) => void;
      lastSeq?: number;
    }
  | {
      kind: "walletFees";
      config: WalletFeeSubscriptionConfig;
      onEvent: (event: WalletFeeEventMessage) => void;
      lastSeq?: number;
    };

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
  private readonly subscriptions = new Map<string, StoredSubscription>();
  private nextId = 1;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private manualClose = false;

  constructor(options: TokenLayerWebsocketClientOptions) {
    this.url = options.url;
    this.auth = options.auth;
    this.webSocketFactory = options.webSocketFactory || defaultWebSocketFactory;
  }

  async connect(): Promise<void> {
    this.manualClose = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.socket && this.socket.readyState === 1) {
      return;
    }
    if (this.connectPromise) {
      return await this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let authenticated = false;
      let settled = false;
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
            settled = true;
            this.reconnectAttempts = 0;
            resolve();
            break;
          case "event":
            this.handleEventMessage(message);
            break;
          case "error":
            if (!authenticated && !settled) {
              settled = true;
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
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket connection failed"));
        }
      };

      socket.onclose = () => {
        this.socket = undefined;
        this.connectPromise = undefined;
        if (!authenticated && !settled) {
          settled = true;
          reject(new Error("WebSocket closed before authentication completed"));
        }
        if (!this.manualClose) {
          this.scheduleReconnect();
        }
      };
    });

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = undefined;
    }
  }

  private handleEventMessage(message: EventMessage): void {
    const subscription = this.subscriptions.get(message.id);
    if (!subscription) {
      return;
    }

    subscription.lastSeq = message.seq;

    if (subscription.kind === "tokenActivity" && message.topic === "tokenActivity") {
      subscription.onEvent({
        id: message.id,
        topic: "tokenActivity",
        seq: message.seq,
        data: message.data as TokenActivityEventData,
      });
      return;
    }

    if (subscription.kind === "walletBalances" && message.topic === "walletBalances") {
      subscription.onEvent({
        id: message.id,
        topic: "walletBalances",
        seq: message.seq,
        data: message.data as WalletBalanceEventData,
      });
      return;
    }

    if (subscription.kind === "walletFees" && message.topic === "walletFees") {
      subscription.onEvent({
        id: message.id,
        topic: "walletFees",
        seq: message.seq,
        data: message.data as WalletFeeEventData,
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.subscriptions.size === 0) {
      return;
    }

    const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, 15_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.reconnectAndResubscribe();
    }, delay);
  }

  private async reconnectAndResubscribe(): Promise<void> {
    if (this.manualClose || this.subscriptions.size === 0) {
      return;
    }

    try {
      await this.connect();
      for (const [id, subscription] of this.subscriptions.entries()) {
        this.sendSubscription(id, subscription, true);
      }
    } catch {
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    }
  }

  private sendSubscription(
    id: string,
    subscription: StoredSubscription,
    isResume: boolean,
  ): void {
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error("WebSocket is not connected.");
    }

    switch (subscription.kind) {
      case "tokenActivity":
        this.socket.send(
          JSON.stringify({
            op: "subscribe",
            id,
            subscription: {
              topic: "tokenActivity",
              tokenId: subscription.config.tokenId,
              tokenIds: subscription.config.tokenIds,
              chains: subscription.config.chains,
              activityTypes: subscription.config.activityTypes,
              activitySubtypes: subscription.config.activitySubtypes,
              cursor: isResume && subscription.lastSeq !== undefined
                ? subscription.lastSeq
                : subscription.config.cursor,
              sinceTimestamp: isResume && subscription.lastSeq !== undefined
                ? undefined
                : subscription.config.sinceTimestamp,
              batchSize: subscription.config.batchSize,
            },
          }),
        );
        break;
      case "walletBalances":
        this.socket.send(
          JSON.stringify({
            op: "subscribe",
            id,
            subscription: {
              topic: "walletBalances",
              wallet: subscription.config.wallet,
              wallets: subscription.config.wallets,
              tokenId: subscription.config.tokenId,
              tokenIds: subscription.config.tokenIds,
              chains: subscription.config.chains,
              cursor: isResume && subscription.lastSeq !== undefined
                ? subscription.lastSeq
                : subscription.config.cursor,
              sinceTimestamp: isResume && subscription.lastSeq !== undefined
                ? undefined
                : subscription.config.sinceTimestamp,
              batchSize: subscription.config.batchSize,
            },
          }),
        );
        break;
      case "walletFees":
        this.socket.send(
          JSON.stringify({
            op: "subscribe",
            id,
            subscription: {
              topic: "walletFees",
              wallet: subscription.config.wallet,
              wallets: subscription.config.wallets,
              currency: subscription.config.currency,
              currencies: subscription.config.currencies,
              activityIds: subscription.config.activityIds,
              distributionTypes: subscription.config.distributionTypes,
              chains: subscription.config.chains,
              cursor: isResume && subscription.lastSeq !== undefined
                ? subscription.lastSeq
                : subscription.config.cursor,
              sinceTimestamp: isResume && subscription.lastSeq !== undefined
                ? undefined
                : subscription.config.sinceTimestamp,
              batchSize: subscription.config.batchSize,
            },
          }),
        );
        break;
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
    this.subscriptions.set(id, {
      kind: "tokenActivity",
      config: {
        tokenId: options.tokenId,
        tokenIds: options.tokenIds,
        chains: options.chains,
        activityTypes: options.activityTypes,
        activitySubtypes: options.activitySubtypes,
        cursor: options.cursor,
        sinceTimestamp: options.sinceTimestamp,
        batchSize: options.batchSize,
      },
      onEvent: options.onEvent,
    });
    this.sendSubscription(id, this.subscriptions.get(id)!, false);

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

  async subscribeWalletBalances(
    options: WalletBalanceSubscriptionOptions,
  ): Promise<{ id: string; unsubscribe: () => void }> {
    await this.connect();
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error("WebSocket is not connected.");
    }

    const id = `sub_${this.nextId++}`;
    this.subscriptions.set(id, {
      kind: "walletBalances",
      config: {
        wallet: options.wallet,
        wallets: options.wallets,
        tokenId: options.tokenId,
        tokenIds: options.tokenIds,
        chains: options.chains,
        cursor: options.cursor,
        sinceTimestamp: options.sinceTimestamp,
        batchSize: options.batchSize,
      },
      onEvent: options.onEvent,
    });
    this.sendSubscription(id, this.subscriptions.get(id)!, false);

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

  async subscribeWalletFees(
    options: WalletFeeSubscriptionOptions,
  ): Promise<{ id: string; unsubscribe: () => void }> {
    await this.connect();
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error("WebSocket is not connected.");
    }

    const id = `sub_${this.nextId++}`;
    this.subscriptions.set(id, {
      kind: "walletFees",
      config: {
        wallet: options.wallet,
        wallets: options.wallets,
        currency: options.currency,
        currencies: options.currencies,
        activityIds: options.activityIds,
        distributionTypes: options.distributionTypes,
        chains: options.chains,
        cursor: options.cursor,
        sinceTimestamp: options.sinceTimestamp,
        batchSize: options.batchSize,
      },
      onEvent: options.onEvent,
    });
    this.sendSubscription(id, this.subscriptions.get(id)!, false);

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
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close(code, reason);
    this.socket = undefined;
    this.subscriptions.clear();
  }
}
