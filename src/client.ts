import {
  createWalletClient,
  getAddress,
  http,
  type Account,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import {
  signCreateTokenRequest,
  signRegisterRequest,
} from "./eip712.js";
import type {
  CreateTokenResponse,
  CreateTokenResult,
  CreateTokenOptions,
  CreateTokenTransaction,
  ExecutedTransaction,
  CreateTokenParams,
  RegisterParams,
  RegisterResponse,
  TokenLayerAuth,
  TokenLayerClientOptions,
  TokenLayerErrorResponse,
  CreateTokenActionDraft,
  BuilderInput,
  GetTokensV2InfoResponse,
  GetTokensV2Params,
  QuoteTokenInfoResponse,
  QuoteTokenParams,
  InfoErrorResponse,
  TokenLayerDefaults,
} from "./types.js";

export class TokenLayerApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(status: number, payload: TokenLayerErrorResponse) {
    super(payload.error || "Token Layer API request failed");
    this.name = "TokenLayerApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

const DEFAULT_BASE_URL = "https://api.tokenlayer.network/functions/v1";

function nowNonce(): number {
  return Date.now();
}

function normalizeBaseUrl(baseUrl: string): string {
  const apiBase = normalizeApiBaseUrl(baseUrl);
  return `${apiBase}/token-layer`;
}

function normalizeApiBaseUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, "");
  if (clean.endsWith("/token-layer")) {
    return clean.slice(0, -"/token-layer".length);
  }
  if (clean.endsWith("/info")) {
    return clean.slice(0, -"/info".length);
  }
  return clean;
}

export class TokenLayerClient {
  private readonly tokenLayerUrl: string;
  private readonly infoUrl: string;
  private readonly source: "Mainnet" | "Testnet";
  private readonly expiresAfterMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly auth?: TokenLayerAuth;
  private readonly defaults: TokenLayerDefaults;
  private readonly rpcByChainId: Record<number, string>;
  private readonly rpcByChainSlug: Record<string, string>;
  public readonly action: {
    register: (
      params?: RegisterParams,
      authOverride?: TokenLayerAuth,
    ) => Promise<RegisterResponse>;
    createToken: (
      params: CreateTokenParams,
      options?: CreateTokenOptions,
      authOverride?: TokenLayerAuth,
    ) => Promise<CreateTokenResult>;
  };
  public readonly prepare: {
    createToken: (action: CreateTokenActionDraft) => CreateTokenActionDraft;
  };

  constructor(options: TokenLayerClientOptions = {}) {
    this.tokenLayerUrl = normalizeBaseUrl(options.baseUrl || DEFAULT_BASE_URL);
    this.infoUrl = `${normalizeApiBaseUrl(options.baseUrl || DEFAULT_BASE_URL)}/info`;
    this.source = options.source || "Mainnet";
    this.expiresAfterMs = options.expiresAfterMs ?? 300_000;
    this.fetchImpl = options.fetch || fetch;
    this.auth = options.auth;
    this.defaults = options.defaults ?? {};
    this.rpcByChainId = options.rpcByChainId ?? {};
    this.rpcByChainSlug = options.rpcByChainSlug ?? {};
    this.prepare = {
      createToken: (action: CreateTokenActionDraft) => action,
    };
    this.action = {
      register: (
        params?: RegisterParams,
        authOverride?: TokenLayerAuth,
      ) => this.register(params, authOverride),
      createToken: (
        params: CreateTokenParams,
        options?: CreateTokenOptions,
        authOverride?: TokenLayerAuth,
      ) => this.createToken(params, options, authOverride),
    };
    this.info = {
      getTokensV2: async (
        params: GetTokensV2Params,
      ): Promise<GetTokensV2InfoResponse> => {
        const payload = await this.postAnonymous<GetTokensV2InfoResponse>(
          this.infoUrl,
          this.withDefaultsForGetTokensV2({ type: "getTokensV2", ...params }),
        );
        if (payload.type !== "getTokensV2") {
          throw new Error(
            `Unexpected type for info.getTokensV2: ${String((payload as { type?: string }).type)}`,
          );
        }
        return payload;
      },
      quoteToken: async (
        params: QuoteTokenParams,
      ): Promise<QuoteTokenInfoResponse> => {
        const payload = await this.postAnonymous<QuoteTokenInfoResponse>(
          this.infoUrl,
          { type: "quoteToken", ...params },
        );
        if (payload.type !== "quoteToken") {
          throw new Error(
            `Unexpected type for info.quoteToken: ${String((payload as { type?: string }).type)}`,
          );
        }
        return payload;
      },
    };
  }
  public readonly info: {
    getTokensV2: (params: GetTokensV2Params) => Promise<GetTokensV2InfoResponse>;
    quoteToken: (params: QuoteTokenParams) => Promise<QuoteTokenInfoResponse>;
  };

  asWallet(
    walletClient: WalletClient,
    options: { walletAddress?: Address; signatureChainId?: Hex } = {},
  ): TokenLayerClient {
    return new TokenLayerClient({
      baseUrl: this.tokenLayerUrl,
      source: this.source,
      expiresAfterMs: this.expiresAfterMs,
      fetch: this.fetchImpl,
      defaults: this.defaults,
      rpcByChainId: this.rpcByChainId,
      rpcByChainSlug: this.rpcByChainSlug,
      auth: {
        type: "wallet",
        walletClient,
        walletAddress: options.walletAddress,
        signatureChainId: options.signatureChainId,
      },
    });
  }

  asJwt(token: string): TokenLayerClient {
    return new TokenLayerClient({
      baseUrl: this.tokenLayerUrl,
      source: this.source,
      expiresAfterMs: this.expiresAfterMs,
      fetch: this.fetchImpl,
      defaults: this.defaults,
      rpcByChainId: this.rpcByChainId,
      rpcByChainSlug: this.rpcByChainSlug,
      auth: { type: "jwt", token },
    });
  }

  asApiKey(token: string): TokenLayerClient {
    return new TokenLayerClient({
      baseUrl: this.tokenLayerUrl,
      source: this.source,
      expiresAfterMs: this.expiresAfterMs,
      fetch: this.fetchImpl,
      defaults: this.defaults,
      rpcByChainId: this.rpcByChainId,
      rpcByChainSlug: this.rpcByChainSlug,
      auth: { type: "apiKey", token },
    });
  }

  private resolveAuth(authOverride?: TokenLayerAuth): TokenLayerAuth {
    const auth = authOverride || this.auth;
    if (!auth) {
      throw new Error(
        "No auth configured. Initialize TokenLayer with auth or use asWallet/asJwt/asApiKey.",
      );
    }

    return auth;
  }

  async register(
    params: RegisterParams = {},
    authOverride?: TokenLayerAuth,
  ): Promise<RegisterResponse> {
    const auth = this.resolveAuth(authOverride);
    if (auth.type !== "wallet") {
      throw new Error(
        "register requires wallet auth. Use TokenLayer with wallet auth or pass wallet auth override.",
      );
    }

    const nonce = params.nonce ?? nowNonce();
    const expiresAfter = params.expiresAfter ?? this.expiresAfterMs;
    const source = params.source ?? this.source;
    const signatureChainId = params.signatureChainId ?? auth.signatureChainId;

    const signedRequest = await signRegisterRequest(auth.walletClient, {
      source,
      walletAddress: params.walletAddress ?? auth.walletAddress,
      nonce,
      expiresAfter,
      signatureChainId,
      message: params.message,
    });

    const bearerAddress = getAddress(
      params.walletAddress ||
        auth.walletAddress ||
        auth.walletClient.account?.address ||
        "",
    );
    const payload = await this.post<RegisterResponse>(signedRequest, bearerAddress);

    if (payload.actionType !== "register") {
      throw new Error(`Unexpected actionType for register: ${String((payload as { actionType?: string }).actionType)}`);
    }

    return payload;
  }

  async createToken(
    params: CreateTokenParams,
    options: CreateTokenOptions = {},
    authOverride?: TokenLayerAuth,
  ): Promise<CreateTokenResult> {
    const auth = this.resolveAuth(authOverride);
    const source = params.source ?? this.source;
    const expiresAfter = params.expiresAfter ?? this.expiresAfterMs;
    const actionWithDefaults = this.withDefaultsForCreateTokenAction(params.action);

    let payload: CreateTokenResponse;
    if (auth.type === "wallet") {
      const nonce = params.nonce ?? nowNonce();
      const signatureChainId = params.signatureChainId ?? auth.signatureChainId;
      const signedRequest = await signCreateTokenRequest(auth.walletClient, {
        source,
        action: actionWithDefaults,
        nonce,
        expiresAfter,
        signatureChainId,
      });

      const bearerAddress = getAddress(
        auth.walletAddress || auth.walletClient.account?.address || "",
      );
      payload = await this.post<CreateTokenResponse>(signedRequest, bearerAddress);
    } else {
      payload = await this.post<CreateTokenResponse>(
        {
          source,
          expiresAfter,
          action: {
            ...actionWithDefaults,
            type: "createToken",
          },
        },
        auth.token,
      );
    }

    if (payload.actionType !== "createToken") {
      throw new Error(`Unexpected actionType for createToken: ${String((payload as { actionType?: string }).actionType)}`);
    }

    if (!options.execute) {
      return payload;
    }

    if (auth.type !== "wallet") {
      throw new Error("createToken with execute=true requires wallet auth.");
    }

    const executions = await this.executeTransactions(
      auth,
      payload,
      actionWithDefaults.chainSlug,
    );
    return {
      ...payload,
      executions,
    };
  }

  private getResponseTransactions(
    payload: CreateTokenResponse,
  ): CreateTokenTransaction[] {
    if (payload.transactions && payload.transactions.length > 0) {
      return payload.transactions;
    }

    if (payload.transaction) {
      return [{
        ...payload.transaction,
        chainId: payload.chainId,
      }];
    }

    return [];
  }

  private async executeTransactions(
    auth: Extract<TokenLayerAuth, { type: "wallet" }>,
    payload: CreateTokenResponse,
    expectedChainSlug: string,
  ): Promise<ExecutedTransaction[]> {
    const txs = this.getResponseTransactions(payload);
    if (txs.length === 0) {
      return [];
    }

    this.validateTransactionChainMetadata(txs, expectedChainSlug);

    const account = auth.walletClient.account;
    if (!account) {
      throw new Error("walletClient.account is required for transaction execution.");
    }

    const localClientsByChain = new Map<number, WalletClient>();
    const results: ExecutedTransaction[] = [];
    for (let i = 0; i < txs.length; i += 1) {
      const tx = txs[i];
      const chainId = tx.chainId ?? payload.chainId;
      const client = this.resolveExecutionWalletClient(
        auth.walletClient,
        account,
        tx.chainSlug,
        chainId,
        localClientsByChain,
      );

      if (
        client === auth.walletClient &&
        chainId &&
        auth.walletClient.chain?.id &&
        auth.walletClient.chain.id !== chainId
      ) {
        throw new Error(
          `Transaction chain mismatch for chainId ${chainId}. Configure rpcByChainSlug/rpcByChainId for this chain or use a switchable wallet client.`,
        );
      }

      if (
        client === auth.walletClient &&
        chainId &&
        "switchChain" in auth.walletClient &&
        typeof auth.walletClient.switchChain === "function"
      ) {
        await auth.walletClient.switchChain({ id: chainId });
      }

      const hash = await client.sendTransaction({
        account,
        chain: client.chain,
        to: getAddress(tx.to as Address),
        data: tx.data as Hex,
        value: BigInt(tx.value),
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
      });

      results.push({
        index: i,
        chainId,
        hash,
        to: getAddress(tx.to as Address),
      });
    }

    return results;
  }

  private resolveExecutionWalletClient(
    baseClient: WalletClient,
    account: Account,
    chainSlug: string | undefined,
    chainId: number | undefined,
    localClientsByChain: Map<number, WalletClient>,
  ): WalletClient {
    if (!chainId) {
      return baseClient;
    }

    if (account.type !== "local") {
      return baseClient;
    }

    const rpcUrl =
      (chainSlug ? this.rpcByChainSlug[chainSlug] : undefined) ??
      this.rpcByChainId[chainId];
    if (!rpcUrl) {
      return baseClient;
    }

    const existing = localClientsByChain.get(chainId);
    if (existing) {
      return existing;
    }

    const client = createWalletClient({
      account,
      transport: http(rpcUrl),
    });
    localClientsByChain.set(chainId, client);
    return client;
  }

  private validateTransactionChainMetadata(
    txs: CreateTokenTransaction[],
    expectedChainSlug: string,
  ): void {
    for (let i = 0; i < txs.length; i += 1) {
      const tx = txs[i];
      if (!tx.chainSlug) {
        throw new Error(
          `Refusing to execute transaction #${i}: missing chainSlug in API response.`,
        );
      }
      if (tx.chainSlug !== expectedChainSlug) {
        throw new Error(
          `Refusing to execute transaction #${i}: chainSlug mismatch (expected ${expectedChainSlug}, got ${tx.chainSlug}).`,
        );
      }
      if (tx.chainType && tx.chainType.toLowerCase() !== "evm") {
        throw new Error(
          `Refusing to execute transaction #${i}: unsupported chainType ${tx.chainType}.`,
        );
      }
      if (typeof tx.chainId !== "number" || !Number.isInteger(tx.chainId)) {
        throw new Error(
          `Refusing to execute transaction #${i}: missing/invalid chainId in API response.`,
        );
      }
    }
  }

  private async post<T>(body: unknown, bearer: string): Promise<T> {
    return this.postToUrl<T, TokenLayerErrorResponse>(
      this.tokenLayerUrl,
      body,
      bearer,
    );
  }

  private async postAnonymous<T>(url: string, body: unknown): Promise<T> {
    return this.postToUrl<T, InfoErrorResponse>(url, body);
  }

  private async postToUrl<T, E extends { error?: string; code?: string; details?: unknown }>(
    url: string,
    body: unknown,
    bearer?: string,
  ): Promise<T> {
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({
      error: `HTTP ${response.status} with non-JSON response`,
    }))) as T | E;

    if (!response.ok) {
      console.error("TokenLayer API error:", payload);
      console.error("Response:", response);
      throw new TokenLayerApiError(
        response.status,
        payload as TokenLayerErrorResponse,
      );
    }

    return payload as T;
  }

  private withDefaultsForCreateTokenAction(
    action: CreateTokenActionDraft,
  ): CreateTokenActionDraft {
    if (action.builder) {
      return action;
    }

    const builder = this.resolveBuilderDefaultsForCreateToken();
    if (!builder) {
      return action;
    }

    return {
      ...action,
      builder,
    };
  }

  private withDefaultsForGetTokensV2(
    request: { type: "getTokensV2" } & GetTokensV2Params,
  ): { type: "getTokensV2" } & GetTokensV2Params {
    if (request.builder_code) {
      return request;
    }

    const builderCode = this.defaults.builder?.code;
    if (!builderCode) {
      return request;
    }

    return {
      ...request,
      builder_code: builderCode,
    };
  }

  private resolveBuilderDefaultsForCreateToken(): BuilderInput | undefined {
    const builder = this.defaults.builder;
    if (!builder?.code) {
      return undefined;
    }
    return {
      code: builder.code,
      fee: typeof builder.fee === "number" ? builder.fee : 0,
    };
  }

}

export class TokenLayer extends TokenLayerClient {}

export type { Hex };
