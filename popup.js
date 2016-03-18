// Copyright (c) 2016 The Jourmap Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function(angular) {
	'use strict'
	angular.module('JourmapChromeEx', ['ngMaterial', 'ngMessages', 'ngSanitize', 'jmDirectives'])
	.config(function($locationProvider, $mdThemingProvider) {
	  $mdThemingProvider.theme('default')
	    .primaryPalette('green', {
	      'default': '600', // by default use shade 400 from the pink palette for primary intentions
	      'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
	      'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
	      'hue-3': 'A100' // use shade A100 for the <code>md-hue-3</code> class
	    })
	    // If you specify less than all of the keys, it will inherit from the
	    // default shades
	    .accentPalette('red', {
	      'default': '500' // use shade 200 for default, and keep all other shades the same
	    });
	})
	.controller('PopupController', function($scope, $rootScope, $location, $mdDialog, $mdToast, $http, $timeout, $window, $document, $filter, $anchorScroll) {
		$http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
		$scope.host = "https://www.jourmap.com";
		var apiHost = $scope.host + "/_api";
		var requestGet = function(url, callback) {
			$http.get(url).then(function(response) {
				callback(response);
			},
			function(response) {
				callback(response);
			});
		};
	
		var requestPost = function(url, data, callback) {
			var param = $.param({ data:JSON.stringify(data) });
			$http({
			        url: url,
			        method: "POST",
			        data: param
			    }).then(function(response) {
				callback(response);
			},
			function(response) {
				callback(response);
			});
		}
		
		var appendQueryParameter = function(url, key, value) {
			if (value) {
				url += (url.indexOf("?") >= 0 ? "&" : "?") + key + "=" + encodeURIComponent(value);
			}
			return url;
		};
		
		$scope.loading = true;
		$scope.places = [];
		$scope.journeys = [];
		
		$scope.openJourmap = function() {
			openNewTab($scope.host);
		}
		
		$scope.getPlaceIconName = function() {
			return "place";
		};
		
		$scope.backToPlaceList = function() {
			$scope.selectedPlace = null;
		};
		
		$scope.backToJourneyList = function() {
			$scope.selectedJourney = null;
		};
		
		$scope.getSaveStateIconName = function(saved) {
			return saved ? "star" : "star_border";
		};
		
		$scope.selectPlace = function(place) {
			$scope.selectedPlace = place;
			$scope.journeys = [];
			
			requestPost(apiHost + "/places", { gmap_place_id: place.place_id }, function(response) {
				$scope.selectedPlace = response.data;
				$scope.loadMoreJourneys(null);
			});
		};
		
		$scope.loadMoreJourneys = function(cursor) {
			$scope.loadingJourneys = true;
			var path = "/user/" + $scope.user.id + "/journeys";
			path = appendQueryParameter(path, "cursor", cursor);
			requestGet(apiHost + path, function(response) {
				var result = response.data;
				$scope.journeysResult = result;
				for (var i in result.journeys) {
					var journey = result.journeys[i];
					$scope.journeys.push(journey);
				}
				$scope.loadingJourneys = false;
			});
		};
		
		$scope.selectJourney = function(journey) {
			$scope.selectedJourney = journey;
			$scope.loadingJourneyDays = true;
			requestGet(apiHost + "/journey/" + journey.id + "?days=true", function(response) {
				var days = response.data.days;
				$scope.selectedJourney.days = days;
				$scope.loadingJourneyDays = false;
			});
		};
		
		$scope.addJourneyDay = function(journey) {
			$scope.loadingJourneyDays = true;
			requestPost(apiHost + "/journey/" + journey.id + "/day", {}, function(response) {
				var newDay = response.data;
				journey.days.push(newDay);
				$scope.loadingJourneyDays = false;
			});
		};
		
		$scope.addToJourneyDay = function(journey, day, newPlace) {
			$mdToast.show(
			      $mdToast.simple()
					.textContent('Saving...')
			    );
			var places = [];
			for (var i in day.places) {
				var place = day.places[i];
				places.push({ id: place.id, place_id: place.place_id });
			}
			places.push({ id: newPlace.id });
			var data = { places: places };
			requestPost(apiHost + "/journey/" + journey.id + "/day/" + day.id, data, function(response) {
				var updatedDay = response.data;
				for (var i in updatedDay.places) {
					if (i < day.places.length && day.places[i].place_id == updatedDay.places[i].place_id) {
						continue;
					} else if (i == day.places.length) {
						newPlace.place_id = updatedDay.places[i].place_id;
						day.places.push(newPlace);
						
						$mdToast.show(
						      $mdToast.simple()
						        .textContent('Added ' + $scope.selectedPlace.name)
						        .hideDelay(3000)
						    );
						break;
					} else {
						//failed
						return;
					}
				}
			});
		};
		
		$scope.getDayItinerary = function(day) {
			var ret = "";
			for (var i in day.places) {
				var place = day.places[i];
				if (i != 0) {
					ret += " > ";
				}
				ret += place.name;
			}
			return ret;
		};
		
		var openNewTab = function(url) {
			chrome.tabs.create({ url: url });
		};
		
		$scope.openUserProfile = function() {
			var url = $scope.host + "/u/" + $scope.user.id;
		    openNewTab(url);
		};
		
		var parseSelectedText = function() {
			chrome.tabs.executeScript( {
			  code: "window.getSelection().toString();"
			}, function(selection) {
				console.log(selection)
				if (selection && selection.length > 0) {
					$scope.selectedText = selection[0];
				} else {
					return;
				}
				
				$scope.searchResultTitle = chrome.i18n.getMessage("search_results_title", [ $scope.selectedText ]);
				$timeout(function() {
					if (!$scope.selectedText || !$scope.selectedText.trim()) {
						return;
					}
					$scope.loadMorePlaces(null);
				});
			});	
		};
		
		$scope.loadMorePlaces = function(cursor) {
			$scope.loadingPlaces = true;
			var path = "/places/textsearch";
			path = appendQueryParameter(path, "query", $scope.selectedText);
			path = appendQueryParameter(path, "cursor", cursor);
			requestGet(apiHost + path, function(response) {
				var result = response.data;
				$scope.placesResult = result;
				if ($scope.placesResult.next_page_token) {
					$scope.placesResult.more = true;
				} else {
					$scope.placesResult.more = false;
				}
				for (var i in result.results) {
					var place = result.results[i];
					$scope.places.push(place);
				}
				$scope.loadingPlaces = false;
				
				if ($scope.places.length == 1) {
					$scope.selectPlace($scope.places[0]);
				}
			});
		};
		
		$timeout(function() {
			requestGet(apiHost + "/me", function(response) {
				var user = response.data;
				$scope.user = user;
				$scope.loading = false;
				if (!$scope.user || !$scope.user.id) {
					$scope.user = null;
				} else {
					parseSelectedText();
				}
			});
		});
	});
})(window.angular);
