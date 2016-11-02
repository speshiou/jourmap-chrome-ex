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
	.controller('PopupController', function($scope, $rootScope, $location, $mdDialog, $mdToast, $http, $timeout, $window, $document, $filter, $anchorScroll, $element) {
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
		
		var requestDelete = function(url, callback) {
			$http({
			        url: url,
			        method: "DELETE"
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
		
		$scope._ = function(msgKey, msgArgs) {
			return chrome.i18n.getMessage(msgKey, msgArgs);
		};
		
		$scope.openJourmap = function() {
			openNewTab($scope.host);
		}
		
		$scope.getPlaceIconName = function(types) {
			for (var i in types) {
				var type = types[i];
				if (type == "airport") {
					return "flight"
				} else if (type == "train_station") {
					return "train"
				} else if (type == "lodging") {
					return "hotel"
				} else if (type == "food") {
					return "restaurant"
				}
			}
			return "place"
		};
		
		$scope.savePlace = function(place, save) {
			if (save) {
				requestPost(apiHost + "/place/" + place.id + "/save", {}, function(response) {
					if (response.data) {
						place.is_saved = true;
					}
				});
			} else {
				requestDelete(apiHost + "/place/" + place.id + "/save", function(response) {
					if (response.data) {
						place.is_saved = false;
					}
				});
			}
		};
		
		$scope.openJourney = function(journey) {
			openNewTab(journey.url);
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
		
		$scope.showAddJourney = function() {
			$scope.showNewJourney = true;
		};
		
		$scope.createJourney = function(newJourneyData) {
			requestPost(apiHost + "/journey?add_first_day=true", { title: newJourneyData.title }, function(response) {
				var newJourney = response.data;
				$scope.journeys.splice(0, 0, newJourney);
				$scope.showNewJourney = false;
				$scope.selectJourney(newJourney);
			});
		};
		
		$scope.selectPlace = function(place) {
			$scope.selectedPlace = place;
			$scope.itineraries = [];
			
			requestPost(apiHost + "/places", { gmap_place_id: place.place_id }, function(response) {
				$scope.selectedPlace = response.data;
				requestGet(apiHost + "/place/" + $scope.selectedPlace.id, function(response) {
					$scope.selectedPlace = response.data;
					$scope.loadMoreItineraries(null);
				});
			});
		};
		
		$scope.getMapImageUrl = function(place) {
			return "https://maps.googleapis.com/maps/api/staticmap?size=320x180&zoom=13&markers=" + encodeURIComponent(place.loc.lat + "," + place.loc.lng);
		};
		
		$scope.loadMoreItineraries = function(cursor) {
			$scope.loadingItineraries = true;
			var path = "/place/" + $scope.selectedPlace.id + "/itinerary";
			path = appendQueryParameter(path, "cursor", cursor);
			requestGet(apiHost + path, function(response) {
				var result = response.data;
				for (var i in result.results) {
					var itinerary = result.results[i];
					$scope.itineraries.push(itinerary);
				}
				$scope.loadingItineraries = false;
			});
		};
		
		$scope.selectJourneys = function() {
			$scope.showJourneys = true;
			$scope.journeys = [];
			$scope.loadMoreJourneys(null);
		}
		
		$scope.backToPlaceInfo = function() {
			$scope.showJourneys = false;
		}
		
		$scope.loadMoreJourneys = function(cursor) {
			$scope.loadingJourneys = true;
			var path = "/user/" + $scope.user.id + "/journeys";
			path = appendQueryParameter(path, "cursor", cursor);
			requestGet(apiHost + path, function(response) {
				var result = response.data;
				$scope.journeysResult = result;
				for (var i in result.results) {
					var journey = result.results[i];
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
			var order = 10000;
			if (journey.days.length > 0) {
				order = journey.days[journey.days.length - 1].order + 10000
			}
			requestPost(apiHost + "/journey/" + journey.id + "/day", { order: order }, function(response) {
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
			var order = 10000;
			if (day.places.length > 0) {
				order = day.places[day.places.length - 1].order + 10000;
			}	
			var data = { id: newPlace.id, order: order };
			requestPost(apiHost + "/journey/" + journey.id + "/day/" + day.id + "/place", data, function(response) {
				var newJourneyPlace = response.data;
				newPlace.order = newJourneyPlace.order;
				newPlace.place_id = newJourneyPlace.place_id;
				day.places.push(newPlace);
				$mdToast.show(
				      $mdToast.simple()
				        .textContent('Added ' + $scope.selectedPlace.name)
					.hideDelay(3000));
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
		
		var parseSelectedText = function(callback) {
			chrome.tabs.executeScript( {
			  code: "window.getSelection().toString();"
			}, function(selection) {
				console.log(selection)
				if (selection && selection.length > 0) {
					$scope.selectedText = selection[0].replace(/\r?\n|\r/g, "").trim();
					if (!$scope.selectedText || !$scope.selectedText.trim()) {
						$scope.selectedText = null;
						callback(null);
						return;
					}
					callback($scope.selectedText);
				} else {
					$scope.selectedText = null;
					callback(null);
					return;
				}
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
		
		parseSelectedText(function(text) {
			$timeout(function() {
				if (!text) {
					if ($(".dummy_textarea").length > 0) {
	                    $('.dummy_textarea').remove();
	                }
					var demoSpan = angular.element(".demo_text");
	                var demoText = demoSpan.text();
	                $('<textarea class="dummy_textarea" />')
	                    .appendTo(demoSpan)
	                    .val(demoText)
	                    .focus()
	                    .select()
						.on('focus', function() {
							$(this).select();
						})
						.on('blur', function() {
							$(this).select();
						})
						.click(function() {
							$(this).select();
						});
					return;
				}
				requestGet(apiHost + "/me", function(response) {
					var user = response.data;
					$scope.user = user;
					$scope.loading = false;
					if (!$scope.user || !$scope.user.id) {
						$scope.user = null;
					} else {
						$scope.loadMorePlaces(null);
					}
				});
			});
		});
		
	});
})(window.angular);
