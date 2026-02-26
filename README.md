# `@token-layer/sdk-typescript`

TypeScript SDK for `POST /token-layer` and `POST /info`.

## Install

```bash
npm install @token-layer/sdk-typescript viem
```

## Quick start (wallet auth)

```ts
import { TokenLayer } from "@token-layer/sdk-typescript";
import { createWalletClient, custom } from "viem";

const walletClient = createWalletClient({
  chain: undefined,
  transport: custom(window.ethereum),
});

const tokenLayer = new TokenLayer({
  baseUrl: "https://api.tokenlayer.network/functions/v1",
  source: "Mainnet",
  defaults: {
    builder: {
      code: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      fee: 50,
    },
  },
  auth: {
    type: "wallet",
    walletClient,
    signatureChainId: "0x1",
  },
});

await tokenLayer.action.register();

const action = tokenLayer.prepare.createToken({
  name: "My Cool Token",
  symbol: "MCT",
  description: "A new token",
  image: "https://example.com/logo.png",
  chainSlug: "base",
});

const createResponse = await tokenLayer.action.createToken({
  action,
});

console.log(createResponse.success);
```

## JWT/API key auth

```ts
import { TokenLayer } from "@token-layer/sdk-typescript";

const tokenLayerJwt = new TokenLayer({
  baseUrl: "https://api.tokenlayer.network/functions/v1",
  source: "Mainnet",
  auth: { type: "jwt", token: process.env.JWT! },
});

await tokenLayerJwt.action.createToken({
  action: tokenLayerJwt.prepare.createToken({
    name: "My Cool Token",
    symbol: "MCT",
    description: "A new token",
    image: "https://example.com/logo.png",
    chainSlug: "base",
  }),
});
```

## Auth switching helpers

```ts
const base = new TokenLayer({ baseUrl: "https://api.tokenlayer.network/functions/v1" });

const walletTl = base.asWallet(walletClient, { signatureChainId: "0x1" });
const jwtTl = base.asJwt(jwt);
const apiKeyTl = base.asApiKey(apiKey);
```

## API

- `action.register(params?)` (wallet auth only)
- `action.createToken(params)`
- `prepare.createToken(actionDraft)` (local typed helper)
- `info.getTokensV2(params)` (no auth required)
- `info.quoteToken(params)` (no auth required)
- `asWallet(walletClient, opts?)`
- `asJwt(token)`
- `asApiKey(token)`
- `signRegisterRequest(walletClient, params)`
- `signCreateTokenRequest(walletClient, params)`
- `buildRegisterMessage(address, nonceMs)`

## Client defaults

Set builder defaults once on client init:

```ts
const tokenLayer = new TokenLayer({
  baseUrl: "https://api.tokenlayer.network/functions/v1",
  defaults: {
    builder: { code: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", fee: 50 },
  },
});
```

Merge behavior:
- `action.createToken`: if `action.builder` is missing, SDK injects defaults `{ code, fee }`.
- `info.getTokensV2`: if `builder_code` is missing, SDK injects default `builder.code`.
- Explicit per-call values always win over defaults.
- If `defaults.builder.fee` is omitted, SDK uses `0`.

## Info endpoint

```ts
import { TokenLayer } from "@token-layer/sdk-typescript";

const tokenLayer = new TokenLayer({
  baseUrl: "https://api.tokenlayer.network/functions/v1",
});

const result = await tokenLayer.info.getTokensV2({
  keyword: "base",
  limit: 20,
  offset: 0,
  order_by: "volume_24h",
  order_direction: "DESC",
});

const quote = await tokenLayer.info.quoteToken({
  chainSlug: "base",
  tokenId: "550e8400-e29b-41d4-a716-446655440000",
  direction: "buy",
  inputToken: "usdc",
  amount: 10,
});
```

## Errors

Requests throw `TokenLayerApiError` with:

- `status`
- `code`
- `details`
- `message`
