# LayerZero Prices Bot
> This is price information for other chains confirmed in xpla’s layerzero relayer contract.

## Environment
> add .env
```
BOT_TOKEN="{your telegram bot token}"
CHAT_ID="{your telegram chat id}"
```

## Getting start
> nodejs, pm2 required
```
npm i
npm i -g ts-node
pm2 start --name lz-prices -- -P tsconfig.json ./index.ts
```