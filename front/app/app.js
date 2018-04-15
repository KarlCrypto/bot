let controllerModule = angular.module('KarlCryptoBot.controllers', [])

controllerModule.controller('mainController', function ($scope, $http, $route, $routeParams, $location, $interval) {
	$scope.route = $route
	$scope.routeParams = $routeParams
	$scope.location = $location

	$scope.secret = false
	$scope.canTrade = false
	$scope.infos = null
	$scope.hideAssets = false

	$interval(() => {
		$http.get('/api/infos').then((res) => {
			$scope.infos = res.data
			$scope.canTrade = $scope.infos.canTrade
			let allSymbols = []
			let symbols = res.data.symbols
			for (let quotedAsset in symbols) {
				symbols[quotedAsset].map((s) => {allSymbols.push({quotedAsset: quotedAsset, name: s})})
			}
			$scope.allSymbols = allSymbols
		}, (e) => {
			console.error('Error', e)
			$scope.infos = null
			$scope.canTrade = false
		})
	}, 5000)

	$scope.togglePrivacy = () => {
		$scope.hideAssets = !$scope.hideAssets
	}
})
controllerModule.controller('symbolsController', function ($scope, $http) {
	$scope.symbols = null

	$http.get('/api/infos/symbols').then((res) => {
		$scope.symbols = res.data
	}, (e) => {
		console.error('Error', e)
		$scope.symbols = null
	})
})

controllerModule.controller('trailingStopsController', function ($scope, $http, $interval) {
	$scope.trailingStops = null

	// Force refresh periodically
	$interval(() => {
		$http.get('/api/trailingstops').then((res) => {
			$scope.trailingStops = res.data
		}, (e) => {
			console.error('Error', e)
			$scope.trailingStops = null
		})
	}, 1500)
})

controllerModule.controller('settingsController', function ($scope, $http, $interval) {
	$scope.settings = {
		binance: {
			apiKey: null,
			apiSecret: null,
		},
	}

	$scope.refreshCanTrade = () => {
		$http.get('/api/infos/trading').then((res) => {
			$scope.$parent.canTrade = res.data.canTrade
		}, (e) => {
			alert(e.data.error)
			console.error('Error', e)
		})
	}
	$scope.refreshCanTrade()

	$scope.canSend = () => {
		return $scope.settings.binance.apiKey != null && $scope.settings.binance.apiSecret != null
	}
	$scope.submit = () => {
		$http.post('/api/settings', $scope.settings).then((res) => {
			alert('Saved !')
			$scope.settings.binance.apiKey = null
			$scope.settings.binance.apiSecret = null
			console.log(res)
			$scope.refreshCanTrade()
		}, (e) => {
			alert(e.data.error)
			console.error('Error', e)
		})
	}

})

controllerModule.controller('editTrailingStopsController', function ($scope, $http, $location, $routeParams, $interval) {
	let id = $routeParams.id
	$scope.trailingStop = null

	$http.get('/api/trailingstops/' + id).then((res) => {
		$scope.trailingStop = res.data
		$scope.refreshFromMarginPips()
	}, (e) => {
		alert(e.data.error)
		console.error('Error', e)
	})

	$scope.refreshFromBuyPrice = (buyPrice) => {
		if (buyPrice) {
			$scope.trailingStop.buyPrice = buyPrice
		}
		$scope.refreshFromMarginPips()
	}

	$scope.refreshFromStop = (stop) => {
		if (stop) {
			$scope.trailingStop.stop.last = stop
		}
		$scope.refreshFromMarginPips()
	}

	$scope.refreshFromMarginPips = (pips) => {
		if (pips) {
			$scope.trailingStop.margin.pips = pips
		}
		$scope.trailingStop.margin.price = Number(parseFloat($scope.trailingStop.margin.pips * $scope.trailingStop.Symbol.pips.value)).
			toFixed($scope.trailingStop.Symbol.pips.digits)
		$scope.trailingStop.margin.ratio = Number(($scope.trailingStop.margin.price / $scope.trailingStop.stop.last) * 100).toFixed(2)
	}

	$scope.refreshFromMarginPrice = (price) => {
		if (price) {
			$scope.trailingStop.margin.price = price
		}
		$scope.trailingStop.margin.pips = Math.round($scope.trailingStop.margin.price * Math.pow(10, $scope.trailingStop.Symbol.pips.digits))
		$scope.trailingStop.margin.ratio = Number(($scope.trailingStop.margin.price / $scope.trailingStop.stop.last) * 100).toFixed(2)
	}

	$scope.refreshFromMarginRatio = (ratio) => {
		if (ratio) {
			$scope.trailingStop.margin.ratio = ratio
		}
		$scope.trailingStop.margin.price = Number($scope.trailingStop.stop.last * $scope.trailingStop.margin.ratio / 100).
			toFixed($scope.trailingStop.Symbol.pips.digits)
		$scope.trailingStop.margin.pips = Math.round($scope.trailingStop.margin.price * Math.pow(10, $scope.trailingStop.Symbol.pips.digits))
	}

	$scope.update = () => {
		$http.put('/api/trailingstops/' + id, $scope.trailingStop).then((res) => {
			$location.path('/trailing-stops').search({})
		}, (e) => {
			alert(e.data.error)
			console.error('Error', e)
		})
	}

	$scope.cancel = () => {
		$location.path('/trailing-stops').search({})
	}

})

controllerModule.controller('newTrailingStopsController', function ($scope, $http, $location, $interval) {
	$scope.configuration = {
		start: {
			price: null,
		},
		Symbol: null,
		stop: {
			last: null,
		},
		buy: {
			price: null,
		},
		quantity: 0,
		sell: {
			market:true,
		},
		margin: {
			pips: null,
			price: null,
			ratio: null,
		},
	}
	$scope.statistics = {'1m': null, '5m': null, '15m': null, '1h': null, '4h': null, '1d': null}

	$scope.refreshFromBuyPrice = (buyPrice) => {
		if (buyPrice) {
			$scope.configuration.buyPrice = buyPrice
		}
		$scope.refreshFromMarginPips()
	}

	$scope.refreshFromStop = (stop) => {
		if (stop) {
			$scope.configuration.stop.last = stop
		}
		$scope.refreshFromMarginPips()
	}

	$scope.refreshFromMarginPips = (pips) => {
		if (pips) {
			$scope.configuration.margin.pips = pips
		}
		$scope.configuration.margin.price = Number(parseFloat($scope.configuration.margin.pips * $scope.configuration.Symbol.pips.value)).
			toFixed($scope.configuration.Symbol.pips.digits)
		$scope.configuration.margin.ratio = Number(($scope.configuration.margin.price / $scope.configuration.stop.last) * 100).toFixed(2)
	}

	$scope.refreshFromMarginPrice = (price) => {
		if (price) {
			$scope.configuration.margin.price = price
		}
		$scope.configuration.margin.pips = Math.round($scope.configuration.margin.price * Math.pow(10, $scope.configuration.Symbol.pips.digits))
		$scope.configuration.margin.ratio = Number(($scope.configuration.margin.price / $scope.configuration.stop.last) * 100).toFixed(2)
	}

	$scope.refreshFromMarginRatio = (ratio) => {
		if (ratio) {
			$scope.configuration.margin.ratio = ratio
		}
		$scope.configuration.margin.price = Number($scope.configuration.stop.last * $scope.configuration.margin.ratio / 100).
			toFixed($scope.configuration.Symbol.pips.digits)
		$scope.configuration.margin.pips = Math.round($scope.configuration.margin.price * Math.pow(10, $scope.configuration.Symbol.pips.digits))
	}

	$scope.resetValues = () => {
		$scope.configuration.margin.price = null
		$scope.configuration.margin.ratio = null
		$scope.configuration.margin.pips = null
		$scope.configuration.start.price = null
		$scope.configuration.stop.last = null
		$scope.configuration.Symbol = null
		$scope.configuration.quantity = 0
	}
	$scope.resetStats = () => {
		for (let interval in $scope.statistics) {
			$scope.statistics[interval] = null
		}
	}
	$scope.getStats = () => {
		for (let interval in $scope.statistics) {
			if ($scope.statistics[interval] !== null) {
				continue
			}
			$http.get('/api/average/' + $scope.configuration.Symbol.name + '?interval=' + interval).then((res) => {
				console.log('Average for', interval, res.data)
				$scope.statistics[res.data.interval] = res.data
			}, (e) => {
				alert(e.data.error)
				console.error('Error', e)
			})
		}
	}

	$scope.selectSymbol = (Symbol) => {
		$interval.cancel($scope.interval)
		console.log('Symbol', Symbol)
		$scope.resetStats()
		$scope.resetValues()
		$scope.configuration.Symbol = {name: Symbol.name}
		$scope.interval = $interval(() => {
			$http.get('/api/prices/' + Symbol.name, $scope.configuration).then((res) => {
				$scope.lastPrice = res.data.price
				$scope.configuration.Symbol = res.data.Symbol

				$scope.getStats(Symbol)
			}, (e) => {
				$interval.cancel($scope.interval)
				alert(e.data.error)
				console.error('Error', e)
			})
		}, 1000)
	}

	$scope.prefillWith = (price) => {
		$scope.configuration.stop.last = price
	}

	$scope.resetSymbol = () => {
		$interval.cancel($scope.interval)
		$scope.configuration.Symbol = null
	}

	$scope.submit = () => {
		$interval.cancel($scope.interval)
		$http.post('/api/trailingstops', $scope.configuration).then((res) => {
			$location.path('/trailing-stops')
			console.log('Trailing Stop', res)
		}, (e) => {
			alert(e.data.error)
			console.error('Error', e)
		})
	}

})

let directiveModule = angular.module('KarlCryptoBot.directive', [])
directiveModule.directive('trailingStopsDirective', function () {
	return {
		templateUrl: '/app/directives/trailing-stops.html',
		scope: {
			trailingStops: '=',
			distance: '=',
			hideAssets: '=',
		},
		controller: function ($scope, $http, $location) {

			$scope.gainOffStopRatio = (trailingStop) => {
				if ( !trailingStop ){
					return null;
				}
				return Number(((trailingStop.stop.last / trailingStop.stop.first) - 1).toFixed(4))
			}
			$scope.gainToStopRatio = (trailingStop) => {
				if ( !trailingStop || (trailingStop && !trailingStop.buy.price) ){
					return null;
				}
				return Number(((trailingStop.stop.last / trailingStop.buy.price) - 1).toFixed(4))
			}
			$scope.gainToCurrentRatio = (trailingStop) => {
				if ( !trailingStop || (trailingStop && !trailingStop.buy.price) ){
					return null;
				}
				return Number(((trailingStop.price / trailingStop.buy.price) - 1).toFixed(4))
			}
			$scope.shouldShowStatusMessage = (trailingStop) => {
				return trailingStop ? trailingStop.status.value === 1 || trailingStop.status.value === 3 || trailingStop.status.value === 4 : false
			}

			$scope.stop = (trailingStop) => {

				if (confirm('Do you really want to remove this trailing stop ?')) {
					$http.delete('/api/trailingstops/' + trailingStop.id).then((res) => {
						alert(res.data.statusMessage)
					}, (e) => {
						alert('An error occured ' + res.data.error)
						console.error('Error', e)
					})
				}
			}

			$scope.edit = (trailingStop) => {
				$location.path('/trailing-stop').search({id: trailingStop.id})
			}
		},
	}
})

directiveModule.directive('tradingviewDirective', function () {
	return {
		templateUrl: '/app/directives/tradingview.html',
		scope: {
			symbol: '=',
		},
		link: (scope, element, attrs) => {
			scope.$watch('symbol', function (newValue, oldValue) {
				new TradingView.widget(
					{
						'autosize': true,
						'symbol': 'BINANCE:' + newValue,
						'interval': '60',
						'timezone': 'Europe/Paris',
						'theme': 'Light',
						'style': '1',
						'locale': 'fr',
						'toolbar_bg': '#f1f3f6',
						'enable_publishing': false,
						'withdateranges': false,
						'hide_side_toolbar': false,
						'save_image': false,
						'details': true,
						'studies': [
							'IchimokuCloud@tv-basicstudies',
						],
						'show_popup_button': true,
						'popup_width': '1000',
						'popup_height': '650',
						'container_id': 'tradingview_f6cfb',
					},
				)
			})
		},
		controller: function ($scope, $http) {

		},
	}
})

let app = angular.module('KarlCryptoBot', [
	'ngRoute',
	'angularMoment',
	'KarlCryptoBot.controllers',
	'KarlCryptoBot.directive',
])

app.config(function ($routeProvider) {
	$routeProvider.when('/trailing-stops', {
		controller: 'trailingStopsController',
		templateUrl: '/app/templates/trailing-stops.html',
	}).when('/new-trailing-stops', {
		controller: 'newTrailingStopsController',
		templateUrl: '/app/templates/new-trailing-stops.html',
	}).when('/symbols', {
		controller: 'symbolsController',
		templateUrl: '/app/templates/symbols.html',
	}).when('/settings', {
		controller: 'settingsController',
		templateUrl: '/app/templates/settings.html',
	}).when('/trailing-stop', {
		controller: 'editTrailingStopsController',
		templateUrl: '/app/templates/trailing-stop.html',
	}).otherwise({
		templateUrl: '/app/templates/dashboard.html',
	})
})