import type { Address, Hex, WalletClient } from "viem";
import type { components } from "./generated/openapi.js";

type Schemas = components["schemas"];

export type TokenLayerSource = Schemas["RegisterTokenLayerRequest"]["source"];
export type CreateTokenAction = Schemas["CreateTokenAction"];
export type CreateTokenActionResponse = Schemas["CreateTokenActionResponse"];
export type CreateTokenLayerRequest = Schemas["CreateTokenLayerRequest"];
export type RegisterAction = Schemas["RegisterAction"];
export type RegisterActionResponse = Schemas["RegisterActionResponse"];
export type RegisterTokenLayerRequest = Schemas["RegisterTokenLayerRequest"];
export type TokenLayerError = Schemas["TokenLayerError"];
export type TokenLayerRequest = Schemas["TokenLayerRequest"];
export type TokenLayerResponse = Schemas["TokenLayerResponse"];
export type ChainSlug = Schemas["ChainSlug"];
export type GetTokensV2InfoRequest = Schemas["GetTokensV2InfoRequest"];
export type GetTokensV2InfoResponse = Schemas["GetTokensV2InfoResponse"];
export type InfoError = Schemas["InfoError"];

export interface QuoteTokenInfoRequest {
  type: "quoteToken";
  tokenId?: string;
  chainSlug: ChainSlug;
  amount?: number;
  direction?: "buy" | "sell";
  inputToken?: "token" | "usdc";
  poolType?: "meme" | "startup-preseed" | "test";
}

export interface QuoteTokenInfoResponse {
  type: "quoteToken";
  success: true;
  data: {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    chainSlug: ChainSlug;
    direction: "buy" | "sell";
    inputToken: "token" | "usdc";
    inputAmount: number;
    outputAmount: number;
    inputTokenSymbol: string;
    outputTokenSymbol: string;
    protocol: "RobinSwap" | "UniswapV3";
    isGraduated: boolean;
    initFee?: number;
    timestamp: string;
  };
}

export type InfoRequest = GetTokensV2InfoRequest | QuoteTokenInfoRequest;
export type InfoResponse = GetTokensV2InfoResponse | QuoteTokenInfoResponse;

export type CreateTokenActionInput = CreateTokenAction;
export type RegisterActionInput = RegisterAction;

export type CreateTokenRequest = Omit<
  CreateTokenLayerRequest,
  "nonce" | "signature" | "signatureChainId" | "action"
> & {
  nonce: number;
  signature: Hex;
  signatureChainId: Hex;
  action: CreateTokenAction;
};

export type RegisterRequest = Omit<
  RegisterTokenLayerRequest,
  "nonce" | "signature" | "signatureChainId" | "action"
> & {
  nonce: number;
  signature: Hex;
  signatureChainId: Hex;
  action: RegisterAction;
};

export type CreateTokenResponse = CreateTokenActionResponse;
export type CreateTokenTransaction = NonNullable<
  CreateTokenResponse["transactions"]
>[number];
export interface ExecutedTransaction {
  index: number;
  chainId?: number;
  hash: Hex;
  to: Address;
}
export type CreateTokenResult = CreateTokenResponse & {
  executions?: ExecutedTransaction[];
};
export type RegisterResponse = RegisterActionResponse & {
  walletAddress: Address;
};

export type TokenLayerSuccessResponse = TokenLayerResponse;

export interface TokenLayerErrorResponse extends TokenLayerError {
  details?: unknown;
}
export interface InfoErrorResponse extends InfoError {
  details?: unknown;
}

export type BuilderInput = NonNullable<CreateTokenAction["builder"]>;
export type TokenLinksInput = NonNullable<CreateTokenAction["links"]>;
export interface TokenLayerBuilderDefaults {
  code: BuilderInput["code"];
  fee?: BuilderInput["fee"];
}

export interface TokenLayerDefaults {
  builder?: TokenLayerBuilderDefaults;
}

export type TokenLayerAuth =
  | {
      type: "wallet";
      walletClient: WalletClient;
      walletAddress?: Address;
      signatureChainId?: Hex;
    }
  | {
      type: "jwt";
      token: string;
    }
  | {
      type: "apiKey";
      token: string;
    };

export interface TokenLayerClientOptions {
  baseUrl?: string;
  source?: TokenLayerSource;
  expiresAfterMs?: number;
  fetch?: typeof fetch;
  auth?: TokenLayerAuth;
  defaults?: TokenLayerDefaults;
  rpcByChainId?: Record<number, string>;
  rpcByChainSlug?: Record<string, string>;
}

export interface RegisterParams {
  walletAddress?: Address;
  source?: TokenLayerSource;
  nonce?: number;
  expiresAfter?: number;
  signatureChainId?: Hex;
  message?: string;
}

export interface CreateTokenParams {
  action: Omit<CreateTokenActionInput, "type">;
  source?: TokenLayerSource;
  expiresAfter?: number;
  nonce?: number;
  signatureChainId?: Hex;
}

export interface CreateTokenOptions {
  execute?: boolean;
}

export type CreateTokenActionDraft = CreateTokenParams["action"];
export type GetTokensV2Params = Omit<GetTokensV2InfoRequest, "type">;
export type QuoteTokenParams = Omit<QuoteTokenInfoRequest, "type">;
