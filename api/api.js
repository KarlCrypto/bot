const _ = require('lodash')
const path = require('path')
const fs = require('fs')

const {TrailingStopsModel} = require('./models/TrailingStopsModel')
const {TrailingStopModel} = require('./models/TrailingStopModel')
const {SymbolsModel} = require('./models/SymbolsModel')

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(express.static(path.resolve(__dirname, './../front')))

const settings = require('./db/settings.json')
const Binance = require('binance-api-node').default
let client = Binance({
	apiKey: _.get(settings, 'binance.apiKey', process.env.BINANCE_API_KEY),
	apiSecret: _.get(settings, 'binance.apiSecret', process.env.BINANCE_API_SECRET),
})

let trailingStops = new TrailingStopsModel()
let symbols = new SymbolsModel()
let infos = {}
let canTrade = false

app.post('/api/settings', (req, res) => {

	console.log('Update settings with', req.body)
	let testClient = Binance({
		apiKey: req.body.binance.apiKey,
		apiSecret: req.body.binance.apiSecret,
	})

	testClient.accountInfo().then((data) => {
		canTrade = data.canTrade
		client = testClient

		saveKeys(req.body)

		return res.send(data)
	}).catch((e) => {
		console.error('=== Error : ', e.message, '===')
		canTrade = false
		return res.status(400).send({error: e.message})
	})
})

app.get('/api/infos/trading', (req, res) => {
	res.send({canTrade: canTrade})
})

app.get('/api/infos', (req, res) => {
	res.send(infos)
})

app.get('/api/infos/symbols', (req, res) => {
	res.send(symbols.groupedSymbols)
})

app.get('/api/infos/symbols/:symbol', (req, res) => {
	let symbol = req.params.symbol

	let Symbol = symbols.find(symbol)
	if (!Symbol) {
		return res.status(404).send({
			error: 'Symbol [' + symbol + '] not found',
			validSymbols: infos.symbols,
		})
	}

	res.send(Symbol)
})

app.get('/api/average/:symbol', (req, res) => {
	// Check symbol
	let Symbol = symbols.find(req.params.symbol)
	if (!Symbol) {
		return res.status(404).send({
			error: 'Symbol [' + req.params.symbol + '] not found',
			validSymbols: infos.symbols,
		})
	}

	// Check interval
	const interval = req.query.interval || '1h'
	if (infos.intervals.indexOf(interval) === -1) {
		return res.status(404).send({
			error: 'Interval [' + interval + '] not found',
			validIntervals: infos.intervals,
		})
	}

	const limit = Math.min(req.query.limit, 500) || 100

	client.candles({
		symbol: Symbol.name,
		interval: interval,
		limit: limit,
	}).then((candles) => {
		let average = {
			price: {
				average: {body: 0, full: 0},
				max: {body: 0, full: 0},
			},
			pips: {
				average: {body: 0, full: 0},
				max: {body: 0, full: 0},
			},
		}

		// Open to Close
		average.price.average.body = Symbol.roundForSymbol(candles.map((c) => Math.abs(c.open - c.close)).reduce((a, b) => a + b) / candles.length)
		average.price.max.body = Symbol.roundForSymbol(Math.max(...candles.map((c) => Math.abs(c.open - c.close))))

		average.pips.average.body = Symbol.pipsFromPrice(average.price.average.body)
		average.pips.max.body = Symbol.pipsFromPrice(average.price.max.body)

		// High to Low
		average.price.average.full = Symbol.roundForSymbol(candles.map((c) => Math.abs(c.high - c.low)).reduce((a, b) => a + b) / candles.length)
		average.price.max.full = Symbol.roundForSymbol(Math.max(...candles.map((c) => Math.abs(c.high - c.low))))

		average.pips.average.full = Symbol.pipsFromPrice(average.price.average.full)
		average.pips.max.full = Symbol.pipsFromPrice(average.price.max.full)

		average.Symbol = Symbol
		average.interval = interval
		average.limit = limit

		res.send(average)
	}).catch((e) => {
		console.error(e)
		return res.status(500).send({
			error: 'An error occured',
			e: e,
		})
	})
})

app.get('/api/prices/:symbol', (req, res) => {
	// Check symbol
	let Symbol = symbols.find(req.params.symbol)
	if (!Symbol) {
		return res.status(404).send({
			error: 'Symbol [' + req.params.symbol + '] not found',
			validSymbols: infos.symbols,
		})
	}
	client.trades({symbol: Symbol.name, limit: 1}).then((trades) => {
		res.send(Object.assign({Symbol: Symbol}, trades[0]))
	}).catch((e) => {
		return res.status(500).send({
			error: 'An error occured',
			e: e,
		})
	})
})

app.get('/api/trailingstops', (req, res) => {
	res.send(trailingStops.toJson())
})

app.delete('/api/trailingstops/:id', (req, res) => {
	const id = req.params.id
	console.log('Closing Trailing Stop :', id)

	const trailingStop = trailingStops.remove(id)
	if (!trailingStop) {
		return res.status(404).send({
			error: 'Trailing stop not found',
		})
	}

	res.send({
		status: 'removed',
		statusMessage: 'Trailing stop removed !',
		trailingStop: trailingStop,
	})
})

const addTrailingStop = (trailingStopRequest, res) => {
	let Symbol = symbols.find(trailingStopRequest.Symbol.name)
	if (!Symbol) {
		const error = 'Symbol [' + trailingStopRequest.Symbol.name + '] not found'
		console.log(error)
		return res ? res.status(404).send({
			error: error,
			validSymbols: infos.symbols,
		}) : null
	}

	if (!trailingStopRequest.margin.ratio && !trailingStopRequest.margin.pips && !trailingStopRequest.margin.price) {
		const error = 'Please fill a margin price or pips or ratio'
		console.log(error)
		return res ? res.status(400).send({
			error: error,
		}) : null
	}

	if (_.isNil(trailingStopRequest.stop)) {
		const error = 'Please fill a stop price'
		console.log(error)
		return res ? res.status(400).send({
			error: error,
		}) : null
	}

	if (_.isNil(trailingStopRequest.quantity)) {
		const error = 'Please fill a quantity to sell'
		console.log(error)
		return res ? res.status(400).send({
			error: error,
		}) : null
	}

	let trailingStop = new TrailingStopModel(Symbol, trailingStopRequest)

	console.log('=== New Trailing stop ===')
	console.log(trailingStop)

	trailingStop.socket = client.ws.trades([Symbol.name], trade => {
		let currentTrailingStop = trailingStops.findBySymbol(trade.symbol)
		if (!currentTrailingStop) {
			return
		}

		let Symbol = currentTrailingStop.Symbol
		if (!Symbol) {
			return
		}

		currentTrailingStop.updateWithPrice(trade.price)

		if (currentTrailingStop.canRun()) {
			currentTrailingStop.run()
			console.log('=== Start Trailing stop ===')
			console.log(currentTrailingStop.toJson())
		}

		if (currentTrailingStop.isRunning()) {
			let isPriceOverCeil = Number(trade.price) > (currentTrailingStop.stop.last + currentTrailingStop.margin.price)
			if (isPriceOverCeil) {
				const oldStop = currentTrailingStop.stop.last
				console.log('STOP', currentTrailingStop.stop.last)
				console.log('Number(trade.price) ', Number(trade.price))
				console.log('currentTrailingStop.margin.price ', currentTrailingStop.margin.price)
				currentTrailingStop.stop.last = Symbol.roundForSymbol(Number(trade.price) - currentTrailingStop.margin.price)
				const increasingPriceDelta = currentTrailingStop.stop.last - oldStop
				currentTrailingStop.gain.pips = Symbol.pipsFromPrice(currentTrailingStop.stop.last - currentTrailingStop.stop.first)
				currentTrailingStop.gain.ratio = Number(
					((currentTrailingStop.stop.last - currentTrailingStop.stop.first) / currentTrailingStop.stop.first).toFixed(3))

				currentTrailingStop.updateDistance()

				console.log(Symbol.name + ' ' + (trade.maker ? '▼' : '▲') + ' ' + trade.price + ' ' +
					'[stop : ' + Symbol.roundForSymbol(currentTrailingStop.stop.last) + ' | ' +
					'distance : ' + currentTrailingStop.distance.pips + ' | ' +
					'+' + currentTrailingStop.gain.pips + ' pips | +' + currentTrailingStop.gain.ratio + '%)')

				console.log('=== Increasing stop +' + Symbol.pipsFromPrice(increasingPriceDelta) + ' ' +
					'(' + Symbol.roundForSymbol(increasingPriceDelta).toFixed(Symbol.pips.digits) + ') ===')
			} else {
				if (currentTrailingStop.shouldSell()) {
					currentTrailingStop.sell()
					console.log('=== SELL @', trade.price, '(stop increased by +', Symbol.pipsFromPrice(currentTrailingStop.stop.delta), 'pips !)')
					trailingStops.remove(currentTrailingStop.id)
					if (canTrade && currentTrailingStop.quantity > 0) {
						// Sell at market price for quantity
						client.order({
							symbol: Symbol.name,
							side: 'SELL',
							type: 'MARKET',
							quantity: currentTrailingStop.quantity,
						}).then((res) => {
							console.log('=== SELLING Status', res)
							/**
							 * { symbol: 'ONTETH',
  							orderId: 4372922,
  							clientOrderId: '***',
  							transactTime: 1522995889560,
  							price: '0.00000000',
  							origQty: '5.00000000',
  							executedQty: '5.00000000',
  							status: 'FILLED',
  							timeInForce: 'GTC',
  							type: 'MARKET',
  							side: 'SELL' }
							 */
						}).catch((e) => {
							console.error('An error occured when selling', e)
						})
					}
				}
			}
		}

	})
	trailingStops.add(Symbol.name, trailingStop)
	return res ? res.send(trailingStop.toJson()) : null
}

app.post('/api/trailingstops', (req, res) => {
	// Check symbol
	let trailingStopRequest = req.body

	addTrailingStop(trailingStopRequest, res)
})

console.log('=== Connecting to Binance ===')
client.exchangeInfo().then((data) => {
	// Enrich informations
	symbols = new SymbolsModel(data.symbols)

	delete infos.symbols
	infos.symbols = symbols.groupedSymbols
	infos.intervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']
	infos.binance = data

	const launchApp = () => {
		console.log('=== Connected to Binance ===')
		console.log('=== Trading', canTrade ? 'enable' : 'disabled', '===')
		loadContext()
	}

	console.error('=== Checking Trading rights ===')
	client.accountInfo().then((data) => {
		canTrade = data.canTrade
		launchApp()
	}).catch((e) => {
		console.error('=== Error : ', e.message, '===')
		launchApp()
	})

}).catch((e) => {
	console.error('=== ERROR ===')
	console.error('===', e.message, '===')
	console.error(e)
})

const dataPath = path.resolve(__dirname, './db/data.json')

// Save action
const saveKeys = (settings) => {
	console.log('=== Saving Keys ===')

	fs.writeFileSync(dataPath, JSON.stringify(settings, null, 2), 'utf-8')
}

const saveContext = () => {
	console.log('=== Saving Context ===')

	console.log('===', Object.keys(trailingStops.active).length, ' Active Trailing Stops found ===')
	console.log('===', trailingStops.history.length, ' History Trailing Stops found ===')

	for (let t in trailingStops.active) {
		trailingStops.active[t].pause()
	}

	fs.writeFileSync(dataPath, JSON.stringify({
		trailingStops: trailingStops,
	}, null, 2), 'utf-8')
}

const loadContext = () => {
	console.log('=== Loading Context ===')
	if (!fs.existsSync(dataPath)) {
		console.log('=== No Context ===')
		return
	}
	const data = require(dataPath)
	const trailingStopsSaved = data.trailingStops
	if (!data || (data && !trailingStopsSaved) || (data && trailingStopsSaved && !trailingStopsSaved.active)) {
		console.log('=== No Context ===')
		return
	}

	console.log('===', Object.keys(trailingStopsSaved.active).length, ' Active Trailing Stops found ===')
	console.log('===', trailingStopsSaved.history.length, ' History Trailing Stops found ===')

	for (let t in trailingStopsSaved.active) {
		addTrailingStop(trailingStopsSaved.active[t])
	}
	for (let t in trailingStopsSaved.history) {
		const Symbol = symbols.find(trailingStopsSaved.history[t].Symbol.name)
		trailingStops.history.push(new TrailingStopModel(Symbol, trailingStopsSaved.history[t]))
	}
}

// On Close
// https://stackoverflow.com/a/14032965/3236235
const exitHandler = (options, err) => {
	console.log('=== App is closing ===')
	saveContext()

	if (err) {
		console.log(err.stack)
	}
	if (options.exit) {
		process.exit()
	}
}

process.stdin.resume()//so the program will not close instantly

//do something when app is closing
process.on('exit', exitHandler.bind(null, {}))

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}))

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit: true}))
process.on('SIGUSR2', exitHandler.bind(null, {exit: true}))

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}))

module.exports = app