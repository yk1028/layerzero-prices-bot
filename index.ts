import 'dotenv/config'

const PRICES_LOOKUP_ABI = [{
    "inputs": [
        {
            "internalType": "uint16",
            "name": "",
            "type": "uint16"
        }
    ],
    "name": "dstPriceLookup",
    "outputs": [
        {
            "internalType": "uint128",
            "name": "dstPriceRatio",
            "type": "uint128"
        },
        {
            "internalType": "uint128",
            "name": "dstGasPriceInWei",
            "type": "uint128"
        }
    ],
    "stateMutability": "view",
    "type": "function"
},]

const getKST = () => {
    const curr = new Date();
    const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
    const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
    const kr_curr = new Date(utc + (KR_TIME_DIFF));
    return kr_curr
}

const lzLayerPrice = async (name:string, rpc: string, relayerAddress: string, lzChainID: number) => {
    const Web3 = require('web3');
    const web3 = new Web3(new Web3.providers.HttpProvider(rpc));


    const endpoint = new web3.eth.Contract(PRICES_LOOKUP_ABI, relayerAddress)

    const price = await endpoint.methods.dstPriceLookup(lzChainID).call()

    return `  (${name})
      ratio:  ${price.dstPriceRatio}
      price:  ${parseFloat(price.dstGasPriceInWei) / 1000000000} Gwei`
}

const getLzPrices = async () => {
    const time = getKST()
    const ethereum = await lzLayerPrice("Ethereum", "https://dimension-evm-rpc.xpla.dev/", "0x4514FC667a944752ee8A29F544c1B20b1A315f25", 101)
    // const bnb = await lzLayerPrice("BSC", "https://dimension-evm-rpc.xpla.dev/", "0xA27A2cA24DD28Ce14Fb5f5844b59851F03DCf182", 102)

    const sepolia = await lzLayerPrice("Sepolia", "https://cube-evm-rpc.xpla.dev/", "0x35AdD9321507A87471a11EBd4aE4f592d531e620", 10161)
    // const bnbtestnet = await lzLayerPrice("Bsc-testnet", "https://cube-evm-rpc.xpla.dev/", "0xc0eb57BF242f8DD78a1AAA0684b15FAda79B6F85", 10102)

    return `${time}\n[Mainnet]\n${ethereum}\n\n[Testnet]\n${sepolia}`
}

const telegram_bot = async () => {

    console.log("telegram bot start!")

    const { Telegraf } = require('telegraf')
    const cron = require('node-cron')

    const bot = new Telegraf(process.env.BOT_TOKEN)

    bot.hears('hi', (ctx) => { 
        console.log("hears: hi")
        ctx.reply('Hey there')
    })

    bot.hears('p', async (ctx) => {
        console.log("hears: p")
        ctx.reply(`${await getLzPrices()}`)
    })

    cron.schedule('*/5 * * * *', async () => {
        const prices = await getLzPrices()
        console.log(prices)
        await bot.telegram.sendMessage(process.env.CHAT_ID, `${prices}`)
    });

    bot.launch()

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

const index = async () => {
    telegram_bot();
}

index();