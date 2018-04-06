const _ = require('lodash')
const SymbolModel = function (s) {
	this.name = s.symbol
	this.infos = s
	this.infos.filters.map((f) => {
		if (f.filterType === 'LOT_SIZE') {
			this.lotSize = Number(f.stepSize)
		}
	})
	this.pips = {
		digits: this.infos.quotePrecision,
		value: 0,
	}
	for (let i = 1; i <= this.infos.quotePrecision; i++) {
		if (this.lotSize === (1 / Math.pow(10, i))) {
			this.pips.digits = this.infos.quotePrecision - i
		}
	}
	this.pips.value = 1 / Math.pow(10, this.pips.digits)
}

SymbolModel.prototype.roundForSymbol = function (number) {
	return Number(parseFloat(number).toFixed(this.pips.digits))
}

SymbolModel.prototype.pipsFromPrice = function (price) {
	return Math.round(price * Math.pow(10, this.pips.digits))
}

SymbolModel.prototype.toJson = function () {
	return _.pick(this, ['name', 'pips'])
}

exports.SymbolModel = SymbolModel