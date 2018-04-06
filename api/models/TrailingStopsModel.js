const _ = require('lodash')

const TrailingStopsModel = function () {
	this.active = {}
	this.history = []

	this.add = (symbol, settings) => {
		this.active[symbol] = settings
	}
	this.findBySymbol = (symbol) => {
		if (typeof this.active[symbol] === 'undefined') {
			return null
		}
		return this.active[symbol]
	}
	this.remove = (id) => {
		let trailingStop = _.find(this.active, (s) => s.id === id)
		if (trailingStop) {
			console.log('Found in Active !')
			trailingStop.socket()
			trailingStop.cancel()
			const s = Object.assign({}, trailingStop)
			this.history.push(s)
			delete this.active[s.Symbol.name]
			return trailingStop
		}

		trailingStop = _.find(this.history, (s) => s.id === id)
		if (trailingStop) {
			console.log('Found in History !')
			this.history = this.history.filter(s => s.id !== id)
			return trailingStop
		}

		return null
	}
	this.toJson = () => {
		return {
			active: Object.keys(this.active).length === 0 ? [] : _.map(this.active, t => t.toJson()),
			history: _.map(this.history, t => t.toJson()),
		}
	}
}

exports.TrailingStopsModel = TrailingStopsModel