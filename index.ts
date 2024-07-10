import 'dotenv/config'
import Web3 from 'web3';
import * as emoji from 'node-emoji'

class LzEndpoint {

    private static HOLD = " - "
    private static UP_ARROW = emoji.get('small_red_triangle')
    private static DOWN_ARROW = emoji.get('small_red_triangle_down')

    private name: string
    private lzChainId: number
    private endpoint
    private prePrice

    constructor(name: string, lzChainId: number, rpc: string, relayerAddress: string) {

        this.name = name
        this.lzChainId = lzChainId

        const web3 = new Web3(new Web3.providers.HttpProvider(rpc));

        this.endpoint = new web3.eth.Contract([{
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
        },], relayerAddress)

        this.prePrice = .0
    }

    public async getLzLayerPrice() {
        const price = await this.endpoint.methods.dstPriceLookup(this.lzChainId).call()
        const gweiPrice = this.toGwei(price.dstGasPriceInWei)
        const diff = this.comparePrice(gweiPrice)

        return `  (${this.name})
        Ratio:  ${price.dstPriceRatio}
        Price:  ${gweiPrice} Gwei (${diff})\n`
    }

    private toGwei(dstGasPriceInWei) {
        return parseFloat(dstGasPriceInWei) / 1000000000
    }

    private comparePrice(currPrice) {

        if (this.prePrice == 0) {
            this.prePrice = currPrice
            return LzEndpoint.HOLD
        }

        const diff = currPrice - this.prePrice
        const diffp = ((diff / this.prePrice) * 100).toFixed(1)
        this.prePrice = currPrice

        if (diff == 0) {
            return LzEndpoint.HOLD
        } else if (diff < 0) {
            return `${LzEndpoint.DOWN_ARROW} ${diffp}%`
        } else {
            return `${LzEndpoint.UP_ARROW} ${diffp}%`
        }
    }
}

class LzEndpoints {

    private static KR_TIME_DIFF = 9 * 60 * 60 * 1000

    private mainnets: LzEndpoint[]
    private testnets: LzEndpoint[]

    constructor() {
        this.mainnets = []
        this.testnets = []
    }

    public addMainnet(name: string, lzChainId: number, rpc: string, relayerAddress: string) {
        this.mainnets.push(new LzEndpoint(name, lzChainId, rpc, relayerAddress))
    }

    public addTestnet(name: string, lzChainId: number, rpc: string, relayerAddress: string) {
        this.testnets.push(new LzEndpoint(name, lzChainId, rpc, relayerAddress))
    }

    public async printPrices() {
        const mainnetsMessage = await this.printEndpoints(this.mainnets)
        const testnetsMessage = await this.printEndpoints(this.testnets)
        return `${this.getKST()}\n[Mainnet]\n${mainnetsMessage}[Testnet]\n${testnetsMessage}`
    }

    private getKST() {
        const curr = new Date();
        const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000)
        const krCurr = new Date(utc + (LzEndpoints.KR_TIME_DIFF))
        return krCurr
    }

    private async printEndpoints(endpoints: LzEndpoint[]) {
        let message = ""
        for (const endpoint of endpoints) {
            message += await endpoint.getLzLayerPrice()
        }
        return message
    }
}

const telegram_bot = async () => {

    console.log("lz prices bot start!")

    const lzEndpoints = new LzEndpoints()
    lzEndpoints.addMainnet("Ethereum", 101, "https://dimension-evm-rpc.xpla.dev/", "0x4514FC667a944752ee8A29F544c1B20b1A315f25")
    lzEndpoints.addTestnet("Sepolia", 10161, "https://cube-evm-rpc.xpla.dev/", "0x35AdD9321507A87471a11EBd4aE4f592d531e620")

    const { Telegraf } = require('telegraf')
    const cron = require('node-cron')

    const bot = new Telegraf(process.env.BOT_TOKEN)

    bot.hears('hi', (ctx) => {
        console.log("hears: hi")
        ctx.reply('Hey there')
    })

    bot.hears('p', async (ctx) => {
        console.log("hears: p")
        ctx.reply(`${await lzEndpoints.printPrices()}`)
    })

    cron.schedule(process.env.CRON, async () => {
        const prices = await lzEndpoints.printPrices()
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