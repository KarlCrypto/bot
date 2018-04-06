# Karl Crypto - Bot

## Table of Contents

- [Disclaimer](#disclaimer)
- [Binance API Key](#binance-api-key)
- [Installation](#installation)
- [Running the app](#running-the-app)
- [Usage](#usage)
- [Maintainers](#maintainers)

## Disclaimer

This project can send automatically **Sell Orders** to **Binance** at **Market Price**.

> We can not be responsible of bugs, orders not sent, network problem, money lost. You use this script as your own risk.
> All investing and trading in the securities market involves risk. Any decisions to place trades in the financial markets, including trading in stock or options or other financial instruments, is a personal decision that should only be made after thorough research, including a personal risk and financial assessment, and the engagement of professional assistance to the extend you believe necessary. 

## Binance API Key

Before running this app you need an Api Key from Binance.

- Go to the [Binance create api page](https://www.binance.com/userCenter/createApi.html)
- Follow steps
- Keep safe your new **API Key** and **API Secret**
- Check : **Enable Trading**
- (Optional) enable only a range of IPs

## Installation

```sh
export BINANCE_API_KEY='****'
export BINANCE_API_SECRET='****'

git clone https://github.com/KarlCrypto/bot.git
cd bot

npm install
```

## Running the app

```sh
npm run api
```

If everything works fine you should see
```sh
=== Connecting to Binance ===
=== Connected to Binance ===
=== Karl Crypto Bot | Started on port 3000 ===
```

## Usage

Go to [http://localhost:3000](http://localhost:3000).

## Maintainers

[@Karl_Crypto](https://twitter.com/karl_crypto).

## Contribute

Feel free to dive in! [Open an issue](https://github.com/KarlCrypto/bot/issues/new) or submit PRs.

Standard Readme follows the [Contributor Covenant](http://contributor-covenant.org/version/1/3/0/) Code of Conduct.

## License

[MIT](LICENSE) © Karl C.