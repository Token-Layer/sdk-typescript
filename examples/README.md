# Examples

## Setup

```bash
cd packages/sdk-typescript/examples
cp config.json.example config.json
cp .env.example .env
```

Auth and endpoint config are read from:
- `examples/config.json`
- `examples/.env`
- `examples/.env.local` (highest env-file precedence)
- shell env vars

## Shared env vars

```bash
TL_AUTH_MODE=wallet|jwt|apiKey
TL_API_BASE_URL=https://api.tokenlayer.network/functions/v1
TL_SOURCE=Mainnet

TL_JWT=...
TL_API_KEY=...

TL_TOKEN_ID=550e8400-e29b-41d4-a716-446655440000
TL_USER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
TL_REFERRAL_CODE=ALICE2025
TL_SEARCH_INPUT=base
TL_CHAIN_SLUG=base
```

Default API URLs come from SDK constants:
- `MAINNET_API_URL`: `https://api.tokenlayer.network/functions/v1`
- `TESTNET_API_URL`: `https://api-testnet.tokenlayer.network/functions/v1`

## Existing examples

- `npm run example:create-token`
- `npm run example:create-token:builder-code`
- `npm run example:get-tokens-v2`
- `npm run example:get-tokens-v2:builder-code`

## New action examples

- `npm run example:action:trade-token`
- `npm run example:action:send-transaction`
- `npm run example:action:transfer-token`
- `npm run example:action:claim-rewards`
- `npm run example:action:create-referral-code`
- `npm run example:action:enter-referral-code`
- `npm run example:action:mint-usd`

## New info examples

- `npm run example:info:me`
- `npm run example:info:get-pool-data`
- `npm run example:info:get-user-balance`
- `npm run example:info:search-token`
- `npm run example:info:check-token-ownership`
- `npm run example:info:get-user-fees`
- `npm run example:info:get-user-fee-history`
- `npm run example:info:get-leaderboard`
- `npm run example:info:get-user-portfolio`
