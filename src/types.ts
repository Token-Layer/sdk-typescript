import type { Address, Hex, WalletClient } from "viem";
import type { components } from "./generated/openapi.js";

type Schemas = components["schemas"];

export type TokenLayerSource = Schemas["RegisterTokenLayerRequest"]["source"];
export type ChainSlug = Schemas["ChainSlug"];

export type RegisterAction = Schemas["RegisterAction"];
export type CreateTokenAction = Schemas["CreateTokenAction"];
export type TradeTokenAction = Schemas["TradeTokenAction"];
export type SendTransactionAction = Schemas["SendTransactionAction"];
export type TransferTokenAction = Schemas["TransferTokenAction"];
export type ClaimRewardsAction = Schemas["ClaimRewardsAction"];
export type CreateReferralCodeAction = Schemas["CreateReferralCodeAction"];
export type EnterReferralCodeAction = Schemas["EnterReferralCodeAction"];
export type MintUsdAction = Schemas["MintUsdAction"];

export type RegisterTokenLayerRequest = Schemas["RegisterTokenLayerRequest"];
export type CreateTokenLayerRequest = Schemas["CreateTokenLayerRequest"];
export type TradeTokenLayerRequest = Schemas["TradeTokenLayerRequest"];
export type SendTransactionLayerRequest = Schemas["SendTransactionLayerRequest"];
export type TransferTokenLayerRequest = Schemas["TransferTokenLayerRequest"];
export type ClaimRewardsLayerRequest = Schemas["ClaimRewardsLayerRequest"];
export type CreateReferralCodeLayerRequest =
  Schemas["CreateReferralCodeLayerRequest"];
export type EnterReferralCodeLayerRequest =
  Schemas["EnterReferralCodeLayerRequest"];
export type MintUsdLayerRequest = Schemas["MintUsdLayerRequest"];

export type TokenLayerError = Schemas["TokenLayerError"];
export type TokenLayerRequest = Schemas["TokenLayerRequest"];
export type TokenLayerResponse = Schemas["TokenLayerResponse"];

export type RegisterActionResponse = Schemas["RegisterActionResponse"];
export type CreateTokenActionResponse = Schemas["CreateTokenActionResponse"];
export type RegisterResponse = RegisterActionResponse & {
  walletAddress: Address;
};
export type CreateTokenResponse = CreateTokenActionResponse;
export type TradeTokenResponse = Extract<
  TokenLayerResponse,
  { actionType: "tradeToken" }
>;
export type SendTransactionResponse = Extract<
  TokenLayerResponse,
  { actionType: "sendTransaction" }
>;
export type TransferTokenResponse = Extract<
  TokenLayerResponse,
  { actionType: "transferToken" }
>;
export type ClaimRewardsResponse = Extract<
  TokenLayerResponse,
  { actionType: "claimRewards" }
>;
export type CreateReferralCodeResponse = Extract<
  TokenLayerResponse,
  { actionType: "createReferralCode" }
>;
export type EnterReferralCodeResponse = Extract<
  TokenLayerResponse,
  { actionType: "enterReferralCode" }
>;
export type MintUsdResponse = Extract<TokenLayerResponse, { actionType: "mintUsd" }>;

export type TokenLayerSuccessResponse = TokenLayerResponse;

export type GetTokensV2InfoRequest = Schemas["GetTokensV2InfoRequest"];
export type QuoteTokenInfoRequest = Schemas["QuoteTokenInfoRequest"];
export type MeInfoRequest = Schemas["MeInfoRequest"];
export type GetPoolDataInfoRequest = Schemas["GetPoolDataInfoRequest"];
export type GetUserBalanceInfoRequest = Schemas["GetUserBalanceInfoRequest"];
export type SearchTokenInfoRequest = Schemas["SearchTokenInfoRequest"];
export type CheckTokenOwnershipInfoRequest =
  Schemas["CheckTokenOwnershipInfoRequest"];
export type GetUserFeesInfoRequest = Schemas["GetUserFeesInfoRequest"];
export type GetUserFeeHistoryInfoRequest = Schemas["GetUserFeeHistoryInfoRequest"];
export type GetLeaderboardInfoRequest = Schemas["GetLeaderboardInfoRequest"];
export type GetUserPortfolioInfoRequest = Schemas["GetUserPortfolioInfoRequest"];

export type GetTokensV2InfoResponse = Schemas["GetTokensV2InfoResponse"];
export type QuoteTokenInfoResponse = Schemas["QuoteTokenInfoResponse"];
export type MeInfoResponse = Extract<InfoResponse, { type: "me" }>;
export type GetPoolDataInfoResponse = Extract<
  InfoResponse,
  { type: "getPoolData" }
>;
export type GetUserBalanceInfoResponse = Extract<
  InfoResponse,
  { type: "getUserBalance" }
>;
export type SearchTokenInfoResponse = Extract<InfoResponse, { type: "searchToken" }>;
export type CheckTokenOwnershipInfoResponse = Extract<
  InfoResponse,
  { type: "checkTokenOwnership" }
>;
export type GetUserFeesInfoResponse = Extract<InfoResponse, { type: "getUserFees" }>;
export type GetUserFeeHistoryInfoResponse = Extract<
  InfoResponse,
  { type: "getUserFeeHistory" }
>;
export type GetLeaderboardInfoResponse = Extract<
  InfoResponse,
  { type: "getLeaderboard" }
>;
export type GetUserPortfolioInfoResponse = Extract<
  InfoResponse,
  { type: "getUserPortfolio" }
>;

export type InfoError = Schemas["InfoError"];
export type InfoRequest = Schemas["InfoRequest"];
export type InfoResponse = Schemas["InfoResponse"];

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

interface TokenLayerActionParams<TAction extends { type: string }> {
  action: Omit<TAction, "type">;
  source?: TokenLayerSource;
  expiresAfter?: number;
}

export type TradeTokenParams = TokenLayerActionParams<TradeTokenAction>;
export type SendTransactionParams = TokenLayerActionParams<SendTransactionAction>;
export type TransferTokenParams = TokenLayerActionParams<TransferTokenAction>;
export type ClaimRewardsParams = TokenLayerActionParams<ClaimRewardsAction>;
export type CreateReferralCodeParams =
  TokenLayerActionParams<CreateReferralCodeAction>;
export type EnterReferralCodeParams =
  TokenLayerActionParams<EnterReferralCodeAction>;
export type MintUsdParams = TokenLayerActionParams<MintUsdAction>;

export interface CreateTokenOptions {
  execute?: boolean;
}

export type CreateTokenActionDraft = CreateTokenParams["action"];

export type GetTokensV2Params = Omit<GetTokensV2InfoRequest, "type">;
export type QuoteTokenParams = Omit<QuoteTokenInfoRequest, "type">;
export type MeParams = Omit<MeInfoRequest, "type">;
export type GetPoolDataParams = Omit<GetPoolDataInfoRequest, "type">;
export type GetUserBalanceParams = Omit<GetUserBalanceInfoRequest, "type">;
export type SearchTokenParams = Omit<SearchTokenInfoRequest, "type">;
export type CheckTokenOwnershipParams = Omit<
  CheckTokenOwnershipInfoRequest,
  "type"
>;
export type GetUserFeesParams = Omit<GetUserFeesInfoRequest, "type">;
export type GetUserFeeHistoryParams = Partial<
  Omit<GetUserFeeHistoryInfoRequest, "type">
>;
export type GetLeaderboardParams = Partial<
  Omit<GetLeaderboardInfoRequest, "type">
>;
export type GetUserPortfolioParams = Omit<GetUserPortfolioInfoRequest, "type">;
