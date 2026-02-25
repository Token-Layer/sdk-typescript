import {
  getAddress,
  keccak256,
  stringToHex,
  toHex,
  type Account,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { createSiweMessage } from "viem/siwe";
import type {
  CreateTokenActionInput,
  CreateTokenRequest,
  RegisterRequest,
  TokenLayerSource,
} from "./types.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const CREATE_TOKEN_TYPES = {
  CreateTokenAction: [
    { name: "type", type: "string" },
    { name: "source", type: "string" },
    { name: "name", type: "string" },
    { name: "symbol", type: "string" },
    { name: "description", type: "string" },
    { name: "image", type: "string" },
    { name: "banner", type: "string" },
    { name: "video", type: "string" },
    { name: "chainSlug", type: "string" },
    { name: "destinationChainsHash", type: "bytes32" },
    { name: "poolType", type: "string" },
    { name: "userAddress", type: "address" },
    { name: "builderCode", type: "address" },
    { name: "builderFee", type: "uint256" },
    { name: "tokenReferral", type: "address" },
    { name: "tagsHash", type: "bytes32" },
    { name: "linksHash", type: "bytes32" },
    { name: "tokenType", type: "string" },
    { name: "amountIn", type: "string" },
    { name: "tokensOut", type: "string" },
    { name: "maxAmountIn", type: "string" },
    { name: "nonce", type: "uint64" },
    { name: "expiresAfter", type: "uint64" },
  ],
} as const;

const REGISTER_TYPES = {
  RegisterAction: [
    { name: "type", type: "string" },
    { name: "method", type: "string" },
    { name: "source", type: "string" },
    { name: "nonce", type: "uint64" },
    { name: "expiresAfter", type: "uint64" },
  ],
} as const;

function hashStringArray(values: string[] | undefined): Hex {
  if (!values || values.length === 0) {
    return keccak256(stringToHex(""));
  }

  return keccak256(stringToHex(values.join("|")));
}

function hashLinks(links: CreateTokenActionInput["links"]): Hex {
  if (!links) {
    return keccak256(stringToHex(""));
  }

  const canonical = [
    links.website || "",
    links.twitter || "",
    links.youtube || "",
    links.discord || "",
    links.telegram || "",
  ].join("|");

  return keccak256(stringToHex(canonical));
}

export function resolveSignatureChainIdHex(
  walletClient: WalletClient,
  explicitHex?: Hex,
): Hex {
  if (explicitHex) {
    return explicitHex;
  }

  const chainId = walletClient.chain?.id;
  if (!chainId) {
    throw new Error(
      "signatureChainId is required when walletClient.chain is undefined",
    );
  }

  return toHex(chainId);
}

export function buildRegisterMessage(
  address: Address,
  nonceMs: number,
  options: {
    chainId?: number;
    expiresAfterMs?: number;
    domain?: string;
    uri?: string;
  } = {},
): string {
  const checksum = getAddress(address);
  const chainId = options.chainId ?? 1;
  const domain = options.domain ?? "app.tokenlayer.network";
  const uri = options.uri ?? "https://app.tokenlayer.network";

  console.log("domain", domain);
  console.log("uri", uri);

  return createSiweMessage({
    address: checksum,
    chainId,
    domain,
    uri,
    version: "1",
    nonce: String(nonceMs),
    issuedAt: new Date(nonceMs),
    expirationTime: options.expiresAfterMs
      ? new Date(nonceMs + options.expiresAfterMs)
      : undefined,
    statement: `TokenLayer register timestamp: ${nonceMs}`,
  });
}

function getTypedDomain(signatureChainIdHex: Hex) {
  return {
    name: "TokenLayerSignTransaction",
    version: "1",
    chainId: BigInt(signatureChainIdHex),
    verifyingContract: ZERO_ADDRESS,
  } as const;
}

function getWalletAccount(walletClient: WalletClient): Account {
  const account = walletClient.account;
  if (!account) {
    throw new Error(
      "walletClient.account is missing. Pass a wallet client with an account bound.",
    );
  }

  return account as Account;
}

function buildCreateTokenTypedMessage(request: CreateTokenRequest) {
  const action = request.action;

  return {
    type: "createToken",
    source: request.source,
    name: action.name,
    symbol: action.symbol,
    description: action.description,
    image: action.image,
    banner: action.banner || "",
    video: action.video || "",
    chainSlug: action.chainSlug,
    destinationChainsHash: hashStringArray(action.destinationChains),
    poolType: action.poolType || "meme",
    userAddress: action.userAddress ? getAddress(action.userAddress) : ZERO_ADDRESS,
    builderCode: action.builder?.code ? getAddress(action.builder.code) : ZERO_ADDRESS,
    builderFee: BigInt(action.builder?.fee || 0),
    tokenReferral: action.token_referral
      ? getAddress(action.token_referral)
      : ZERO_ADDRESS,
    tagsHash: hashStringArray(action.tags),
    linksHash: hashLinks(action.links),
    tokenType: "coin",
    amountIn: String(action.amountIn || 0),
    tokensOut: String(action.tokensOut || 0),
    maxAmountIn: String(action.maxAmountIn || 0),
    nonce: BigInt(request.nonce),
    expiresAfter: BigInt(request.expiresAfter),
  } as const;
}

export async function signCreateTokenRequest(
  walletClient: WalletClient,
  params: {
    source: TokenLayerSource;
    action: Omit<CreateTokenActionInput, "type">;
    nonce: number;
    expiresAfter: number;
    signatureChainId?: Hex;
  },
): Promise<CreateTokenRequest> {
  const signatureChainId = resolveSignatureChainIdHex(
    walletClient,
    params.signatureChainId,
  );

  const account = getWalletAccount(walletClient);
  const accountAddress = getAddress(account.address);

  const request: CreateTokenRequest = {
    source: params.source,
    nonce: params.nonce,
    expiresAfter: params.expiresAfter,
    signatureChainId,
    signature: "0x",
    action: {
      ...params.action,
      type: "createToken",
      userAddress: params.action.userAddress
        ? getAddress(params.action.userAddress)
        : accountAddress,
    },
  };

  const signature = await walletClient.signTypedData({
    account,
    domain: getTypedDomain(signatureChainId),
    primaryType: "CreateTokenAction",
    types: CREATE_TOKEN_TYPES,
    message: buildCreateTokenTypedMessage(request),
  });

  return {
    ...request,
    signature,
  };
}

export async function signRegisterRequest(
  walletClient: WalletClient,
  params: {
    source: TokenLayerSource;
    walletAddress?: Address;
    nonce: number;
    expiresAfter: number;
    signatureChainId?: Hex;
    message?: string;
  },
): Promise<RegisterRequest> {
  const signatureChainId = resolveSignatureChainIdHex(
    walletClient,
    params.signatureChainId,
  );

  const account = getWalletAccount(walletClient);
  const accountAddress = getAddress(account.address);
  const walletAddress = params.walletAddress
    ? getAddress(params.walletAddress)
    : accountAddress;
  if (walletAddress !== accountAddress) {
    throw new Error(
      "walletAddress must match walletClient.account.address for register signatures",
    );
  }

  const message = params.message || buildRegisterMessage(walletAddress, params.nonce, {
    chainId: Number(BigInt(signatureChainId)),
    expiresAfterMs: params.expiresAfter,
  });

  const actionSignature = await walletClient.signMessage({
    account,
    message,
  });

  const typedSignature = await walletClient.signTypedData({
    account,
    domain: getTypedDomain(signatureChainId),
    primaryType: "RegisterAction",
    types: REGISTER_TYPES,
    message: {
      type: "register",
      method: "web3",
      source: params.source,
      nonce: BigInt(params.nonce),
      expiresAfter: BigInt(params.expiresAfter),
    },
  });

  return {
    source: params.source,
    nonce: params.nonce,
    expiresAfter: params.expiresAfter,
    signatureChainId,
    signature: typedSignature,
    action: {
      type: "register",
      method: "web3",
      message,
      signature: actionSignature,
    },
  };
}
