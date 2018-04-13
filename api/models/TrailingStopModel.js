const _ = require('lodash')
const uuid = require('uuid/v4')

const Status = {
	Warmup: {value: 0, name: 'Warmup'},
	Waiting: {value: 1, name: 'Waiting'},
	Running: {value: 2, name: 'Running'},
	Cancelled: {value: 3, name: 'Cancelled'},
	Finished: {value: 4, name: 'Finished'},
	Paused: {value: 5, name: 'Paused'},
	forValue: (v) => {
		//Fixme please xD
		if (v === Status.Warmup.value) { return Status.Warmup }
		if (v === Status.Waiting.value) { return Status.Waiting }
		if (v === Status.Running.value) { return Status.Running }
		if (v === Status.Cancelled.value) { return Status.Cancelled }
		if (v === Status.Finished.value) { return Status.Finished }
		if (v === Status.Paused.value) { return Status.Paused }
		return Status.Warmup
	},
}

const TrailingStopModel = function (Symbol, req) {
	this.id = uuid()
	this.Symbol = Symbol
	this.price = req.price || null
	this.quantity = Number(req.quantity)

	this.start = {
		price: Number(req.start.price) || null,
		time: req.start.time || Date.now(),
	}

	if (req.status) {
		this.status = Status.forValue(req.status.value)
	} else {
		this.status = Status.Warmup
		if (this.start.price) {
			this.status = Status.Waiting
		}
	}

	this.buy = {
		price: req.buy && req.buy.price ? Number(req.buy.price) : null,
		value: req.buy && req.buy.price && req.quantity ? req.buy.price * req.quantity : null,
	}

	this.stop = {
		first: req.stop.first || Number(req.stop.last),
		last: Number(req.stop.last),
		time: req.stop.time || null,
	}
	this.margin = {
		ratio: Number(req.margin.ratio) || null,
		pips: Number(req.margin.pips) || null,
		price: Number(req.margin.price) || null,
	}
	this.sellPrice = req.sellPrice || null
	this.gain = {
		pips: _.get(req, 'gain.pips', 0),
		ratio: _.get(req, 'gain.ratio', 0),
	}
	this.distance = {
		pips: _.get(req, 'distance.pips', 0),
		price: _.get(req, 'distance.price', 0),
		ratio: _.get(req, 'distance.ratio', 0),
	}
	this.totalGain = {
		pips: _.get(req, 'totalGain.pips', 0),
		price: _.get(req, 'totalGain.price', 0),
		ratio: _.get(req, 'totalGain.ratio', 0),
	}

	// Current variation : Buy price -> Current Price
	this.current = {
		pips: _.get(req, 'current.pips', 0),
		price: _.get(req, 'current.price', 0),
		ratio: _.get(req, 'current.ratio', 0),
		value: _.get(req, 'current.value', 0),
	}

	this.updateDistance = () => {
		if (this.status !== Status.Running) {
			return
		}
		this.distance.price = this.Symbol.roundForSymbol(this.price - this.stop.last)
		this.distance.pips = Math.min(this.margin.pips, this.Symbol.pipsFromPrice(this.distance.price))
		this.distance.ratio = this.distance.pips / this.margin.pips
	}

	this.updateCurrent = () => {
		if (!this.buy || (this.buy && !this.buy.price)) {
			return
		}
		this.current.price = this.Symbol.roundForSymbol(this.price - this.buy.price)
		this.current.pips = this.Symbol.pipsFromPrice(this.current.price)
		this.current.ratio = Number(((this.price / this.buy.price) - 1).toFixed(4))
		this.current.value = this.Symbol.roundForSymbol(this.quantity * this.current.price)
	}

	this.updateTotalGain = () => {
		if (!this.buy || (this.buy && !this.buy.price)) {
			return
		}
		this.totalGain.price = this.Symbol.roundForSymbol(this.stop.last - this.buy.price)
		this.totalGain.pips = this.Symbol.pipsFromPrice(this.totalGain.price)
		this.totalGain.ratio = Number(((this.stop.last / this.buy.price) - 1).toFixed(4))
	}

	this.updateWithPrice = (price) => {
		this.price = this.Symbol.roundForSymbol(price)
		this.updateCurrent()
		this.updateDistance()
		this.updateTotalGain()
	}

	this.isRunning = () => {
		return this.status === Status.Running
	}

	this.canRun = () => {
		return this.status === Status.Warmup || this.status === Status.Paused || (this.status === Status.Waiting && this.price >= this.start.price)
	}

	this.run = () => {
		this.status = Status.Running
		this.start.time = this.start.time ? this.start.time : Date.now()
	}

	this.cancel = () => {
		this.status = Status.Cancelled
		this.start.time = Date.now()
	}

	this.pause = () => {
		if (this.status !== Status.Waiting) {
			this.status = Status.Paused
		}
		this.socket()
	}

	this.shouldSell = () => {
		return Symbol.roundForSymbol(this.price) <= Symbol.roundForSymbol(this.stop.last)
	}

	this.sell = () => {
		this.status = Status.Finished
		this.stop.time = Date.now()
		this.sellPrice = this.price
		this.stop.delta = Symbol.roundForSymbol(this.stop.last - this.stop.first)
	}

	this.statusMessage = () => {
		let message = this.status.name
		message += this.status === Status.Waiting ? ' ' + this.start.price : ''
		return message
	}

	this.toJson = () => {
		let fields = ['id', 'status', 'price', 'start', 'stop', 'margin', 'gain', 'running', 'sellPrice', 'quantity', 'buy', 'totalGain', 'current']
		if (this.status === Status.Running) {
			fields.push('distance')
		}
		return _.assign({
				Symbol: this.Symbol.toJson(),
				statusMessage: this.statusMessage(),
			},
			_.pick(this, fields))
	}

	// Setup
	if (this.margin.pips) {
		this.margin.price = this.Symbol.roundForSymbol(this.margin.pips * this.Symbol.pips.value)
		this.margin.ratio = this.margin.price / this.stop.first
	} else if (this.margin.ratio) {
		this.margin.price = this.stop.first * this.margin.ratio / 100
		this.margin.pips = Math.min(0, this.Symbol.pipsFromPrice(this.margin.price))
	} else {
		this.margin.pips = Math.min(0, this.Symbol.pipsFromPrice(this.margin.price))
		this.margin.ratio = this.margin.price / this.stop.first
	}

	// Setup methods
	this.updateCurrent()
}

exports.TrailingStopModel = TrailingStopModel
exports.Status = Status