let controllerModule = angular.module('KarlCryptoBot.controllers', [])

controllerModule.controller('mainController', function ($scope, $http, $route, $routeParams, $location) {
	$scope.route = $route
	$scope.routeParams = $routeParams
	$scope.location = $location

	$scope.infos = null

	$http.get('/api/infos').then((res) => {
		$scope.infos = res.data
		let allSymbols = []
		let symbols = res.data.symbols
		for (let quotedAsset in symbols) {
			symbols[quotedAsset].map((s) => {allSymbols.push({quotedAsset: quotedAsset, name: s})})
		}
		$scope.allSymbols = allSymbols
	}, (e) => {
		console.error('Error', e)
		$scope.infos = null
	})
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

controllerModule.controller('newTrailingStopsController', function ($scope, $http, $location, $interval) {
	$scope.configuration = {
		'start': null,
		'symbol': null,
		'stop': null,
		'quantity': 0,
		'margin': {
			'pips': null,
			'price': null,
			'ratio': null,
		},
	}
	$scope.Symbol = null
	$scope.statistics = {'1m': null, '5m': null, '15m': null, '1h': null, '4h': null, '1d': null}

	$scope.refreshFromStop = (stop) => {
		if (stop) {
			$scope.configuration.stop = stop
		}
		$scope.refreshFromMarginPips()
	}

	$scope.refreshFromMarginPips = (pips) => {
		if (pips) {
			$scope.configuration.margin.pips = pips
		}
		$scope.configuration.margin.price = Number(parseFloat($scope.configuration.margin.pips * $scope.Symbol.pips.value)).toFixed($scope.Symbol.pips.digits)
		$scope.configuration.margin.ratio = Number(($scope.configuration.margin.price / $scope.configuration.stop) * 100).toFixed(2)
	}

	$scope.refreshFromMarginPrice = (price) => {
		if (price) {
			$scope.configuration.margin.price = price
		}
		$scope.configuration.margin.pips = Math.round($scope.configuration.margin.price * Math.pow(10, $scope.Symbol.pips.digits))
		$scope.configuration.margin.ratio = Number(($scope.configuration.margin.price / $scope.configuration.stop) * 100).toFixed(2)
	}

	$scope.refreshFromMarginRatio = (ratio) => {
		if (ratio) {
			$scope.configuration.margin.ratio = ratio
		}
		$scope.configuration.margin.price = Number($scope.configuration.stop * $scope.configuration.margin.ratio / 100).toFixed($scope.Symbol.pips.digits)
		$scope.configuration.margin.pips = Math.round($scope.configuration.margin.price * Math.pow(10, $scope.Symbol.pips.digits))
	}

	$scope.resetValues = () => {
		$scope.configuration.margin.price = null
		$scope.configuration.margin.ratio = null
		$scope.configuration.margin.pips = null
		$scope.configuration.start = null
		$scope.configuration.stop = null
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
			$http.get('/api/average/' + $scope.configuration.symbol + '?interval=' + interval).then((res) => {
				console.log('Average for', interval, res.data)
				$scope.statistics[res.data.interval] = res.data
			}, (e) => {
				alert(e.data.error)
				console.error('Error', e)
			})
		}
	}

	$scope.selectSymbol = (symbol) => {
		$interval.cancel($scope.interval)
		$scope.configuration.symbol = symbol.name
		$scope.resetStats()
		$scope.resetValues()
		$scope.interval = $interval(() => {
			$http.get('/api/prices/' + symbol.name, $scope.configuration).then((res) => {
				$scope.lastPrice = res.data.price
				$scope.Symbol = res.data.Symbol

				$scope.getStats(symbol)
			}, (e) => {
				alert(e.data.error)
				console.error('Error', e)
				$interval.cancel($scope.interval)
			})
		}, 1000)
	}

	$scope.prefillWith = (price) => {
		$scope.configuration.stop = price
	}

	$scope.resetSymbol = () => {
		$interval.cancel($scope.interval)
		$scope.configuration.symbol = null
	}

	$scope.submit = () => {
		$interval.cancel($scope.interval)
		$http.post('/api/trailingstops', $scope.configuration).then((res) => {
			alert('Trailing stop added !')
			$location.path('/trailing-stops')
			console.log('Trailing Stop', res)
		}, (e) => {
			alert(e.data.error)
			console.error('Error', e)
		})
	}

})

angular.module('KarlCryptoBot.directive', []).directive('trailingStopsDirective', function () {
	return {
		templateUrl: '/app/directives/trailing-stops.html',
		scope: {
			trailingStops: '=',
		},
		controller: function ($scope, $http) {

			$scope.shouldShowStatusMessage = (trailingStop) => {
				return trailingStop.status.value === 1 || trailingStop.status.value === 3 || trailingStop.status.value === 4
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
	}).otherwise({
		templateUrl: '/app/templates/dashboard.html',
	})
})