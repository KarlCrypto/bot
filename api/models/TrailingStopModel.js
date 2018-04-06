const _ = require('lodash')
const uuid = require('uuid/v4')

const Status = {
	Warmup: {value: 0, name: 'Warmup'},
	Waiting: {value: 1, name: 'Waiting'},
	Running: {value: 2, name: 'Running'},
	Cancelled: {value: 3, name: 'Cancelled'},
	Finished: {value: 4, name: 'Finished'},
}

const TrailingStopModel = function (Symbol, req) {
	this.id = uuid()
	this.Symbol = Symbol
	this.price = null
	this.quantity = Number(req.body.quantity)

	this.start = {
		price: Number(req.body.start) || null,
		time: Date.now(),
	}

	this.status = Status.Warmup
	if (this.start.price) {
		this.status = Status.Waiting
	}

	this.stop = {
		first: Number(req.body.stop),
		last: Number(req.body.stop),
		time: null,
	}
	this.margin = {
		ratio: Number(req.body.margin.ratio) || null,
		pips: Number(req.body.margin.pips) || null,
		price: Number(req.body.margin.price) || null,
	}
	this.sellPrice = null
	this.gain = {
		pips: 0,
		ratio: 0,
	}
	this.distance = {
		pips: 0,
		price: 0,
		ratio: 0,
	}

	this.updateDistance = () => {
		if (this.status !== Status.Running) {
			return
		}
		this.distance.price = this.Symbol.roundForSymbol(this.price - this.stop.last)
		this.distance.pips = Math.min(this.margin.pips, this.Symbol.pipsFromPrice(this.distance.price))
		this.distance.ratio = this.distance.pips / this.margin.pips
	}

	this.updateWithPrice = (price) => {
		this.price = this.Symbol.roundForSymbol(price)
		this.updateDistance()
	}

	this.isRunning = () => {
		return this.status === Status.Running
	}

	this.canRun = () => {
		return this.status === Status.Warmup || (this.status === Status.Waiting && this.price >= this.start.price)
	}

	this.run = () => {
		this.status = Status.Running
		this.start.time = Date.now()
	}

	this.cancel = () => {
		this.status = Status.Cancelled
		this.start.time = Date.now()
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
		let fields = ['id', 'status', 'price', 'start', 'stop', 'margin', 'gain', 'running', 'sellPrice', 'quantity']
		if (this.status === Status.Running) {
			fields.push('distance')
		}
		return _.assign({Symbol: this.Symbol.toJson(), statusMessage: this.statusMessage()},
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

}

exports.TrailingStopModel = TrailingStopModel
exports.Status = Status