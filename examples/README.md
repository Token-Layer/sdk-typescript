# Examples

## create-token.ts

Calls real `POST /token-layer` APIs via the SDK.
The example uses `tokenLayer.prepare.createToken(...)` so required fields are typed from the SDK.
Requests are sent via `tokenLayer.action.register(...)` and `tokenLayer.action.createToken(...)`.

### 1) Create auth config and env files

```bash
cd packages/sdk-typescript/examples
cp config.json.example config.json
cp .env.example .env
```

Fill in your auth secrets in `config.json` and/or `.env`.

### 2) Run

```bash
cd ../
npm run example:create-token
```

## create-token-builder-code.ts

Calls real `POST /token-layer` and demonstrates client-level builder defaults.
Set `TL_BUILDER_CODE` (optional `TL_BUILDER_FEE`, defaults to `0`), then call `createToken`
without `action.builder`. SDK injects `defaults.builder`.

```bash
cd packages/sdk-typescript
TL_BUILDER_CODE=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb TL_BUILDER_FEE=50 npm run example:create-token:builder-code
```

## get-tokens-v2.ts

Calls real `POST /info` with `type: "getTokensV2"` via `tokenLayer.info.getTokensV2(...)`.

```bash
cd packages/sdk-typescript
npm run example:get-tokens-v2
```

## get-tokens-v2-builder-code.ts

Calls real `POST /info` and demonstrates client-level builder defaults.
Set `TL_BUILDER_CODE`, then call `getTokensV2` without passing `builder_code`.
SDK injects `defaults.builder.code` automatically.

```bash
cd packages/sdk-typescript
TL_BUILDER_CODE=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb npm run example:get-tokens-v2:builder-code
```

### Sources and precedence

- `examples/config.json` (auth-focused config)
- `examples/.env`
- `examples/.env.local` (highest env-file precedence)
- process env provided in shell

### Supported env vars

```bash
TL_AUTH_MODE=wallet|jwt|apiKey
TL_API_BASE_URL=https://api.tokenlayer.network/functions/v1
TL_SOURCE=Mainnet
TL_EXECUTE=true|false
TL_RPC_BY_CHAIN_SLUG=base=https://mainnet.base.org,base-sepolia=https://sepolia.base.org

TL_PRIVATE_KEY=0x...
TL_SIGNATURE_CHAIN_ID=0x1

TL_JWT=...
TL_API_KEY=...
TL_BUILDER_CODE=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
TL_BUILDER_FEE=50

# Info example overrides (optional)
TL_INFO_KEYWORD=base
TL_INFO_LIMIT=20
TL_INFO_OFFSET=0
TL_INFO_ORDER_BY=volume_24h
TL_INFO_ORDER_DIRECTION=DESC
TL_INFO_CHAINS=base,solana
```

Default API URLs come from SDK constants:
- `MAINNET_API_URL`: `https://api.tokenlayer.network/functions/v1`
- `TESTNET_API_URL`: `https://api-testnet.tokenlayer.network/functions/v1`
