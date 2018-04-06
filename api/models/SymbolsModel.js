const _ = require('lodash')
const {SymbolModel} = require('./SymbolModel')

const SymbolsModel = function (symbols) {
	this.symbols = {}
	this.groupedSymbols = {}

	this.import = (symbols) => {
		this.symbols = {}
		this.groupedSymbols = {}
		for (const i in symbols) {
			let symbol = symbols[i]
			if (symbol.quoteAsset === '456') {
				continue
			}
			this.symbols[symbol.symbol] = new SymbolModel(symbol)
		}

		this.groupedSymbols = _(this.symbols).groupBy(s => s.infos.quoteAsset).mapValues(
			quoteAsset => _.flatMap(quoteAsset, s => s.infos.symbol).sort(),
		)
	}
	this.import(symbols)

	this.toJson = () => {
		return this.symbols
	}
	this.find = (symbol) => {
		return this.symbols[symbol]
	}
}

exports.SymbolsModel = SymbolsModel