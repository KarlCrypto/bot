# Karl Crypto - Bot

## Table of Contents

- [Disclaimer](#disclaimer)
- [TODO](#todo)
- [Binance API Key](#binance-api-key)
- [Docker](#docker)
- [Installation](#installation)
- [Running the app](#running-the-app)
- [Usage](#usage)
- [Maintainers](#maintainers)

## Disclaimer

This project can send automatically **Sell Orders** to **Binance** at **Market Price**.

> We can not be responsible of bugs, orders not sent, network problem, money lost. You use this script as your own risk.
> All investing and trading in the securities market involves risk. Any decisions to place trades in the financial markets, including trading in stock or options or other financial instruments, is a personal decision that should only be made after thorough research, including a personal risk and financial assessment, and the engagement of professional assistance to the extend you believe necessary. 

## TODO

- Persist database
- Update a trailing stop
- Set buy order
- Set real gain ratio from buy price to stop
- Send notification (email, sms…) on sell
- Unit tests

## Binance API Key

> Api Keys are not required to run the app. Orders will not be sent to Binance.

In order to send **Sell Orders** to Binance, you need an Api Key.

- Go to the [Binance create api page](https://www.binance.com/userCenter/createApi.html)
- Follow steps
- Keep safe your new **API Key** and **API Secret**
- Check : **Enable Trading**
- (Optional) enable only a range of IPs
- Add keys to your env

```sh
export BINANCE_API_KEY='****'
export BINANCE_API_SECRET='****'
``

## Installation

```sh
git clone https://github.com/KarlCrypto/bot.git
cd bot

npm install
```

## Docker

You can run directly the bot without installing everying, just using Docker.
Please set a volume if you want to store your settings and trailing stops. (rename : ~/path/to/local/db to a path of your choice)

```sh
docker run -p 3000:3000 -v /path/to/local/db:/usr/src/api/db karlcrypto/bot
```

or the docker-compose.yml sample

```yaml
version: '3'
services:

  bot:
    image: 'karlcrypto/bot'
    user: "node"
    environment:
      BINANCE_API_KEY: '${BINANCE_API_KEY}'
      BINANCE_API_SECRET: '${BINANCE_API_SECRET}'
    ports:
      - '3000:3000'
    #volumes:
    #  - /path/to/local/db:/usr/src/api/db
```

### Building Docker image (dev)

```sh
docker build . -t karlcrypto/bot
docker run -p 3000:3000 -v ~/db:/usr/src/api/db karlcrypto/bot
```

## Running the app

> **Warning** : Everything is stored in memory at this moment. Stopping the app will delete all your trailing stops.

> When this app is stopped, sell orders cannot be sent.

```sh
npm start
```

If everything works fine you should see
```sh
=== Connecting to Binance ===
=== Checking Trading rights ===
=== Connected to Binance ===
=== Trading enable (or disable) ===
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