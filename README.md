# LayerZero Prices Bot
> This is price information for other chains confirmed in xpla’s layerzero relayer contract.

## Getting start
> nodejs, pm2 required
```
npm i
npm i -g ts-node
pm2 start --name lz-prices -- -P tsconfig.json ./index.ts
```